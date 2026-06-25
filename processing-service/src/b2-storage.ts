import B2 from "backblaze-b2";

const accountId = process.env.B2_APPLICATION_KEY_ID || process.env.keyID || process.env.Application_id || "";
const applicationKey = process.env.B2_APPLICATION_KEY || "";
const bucketName = process.env.B2_BUCKET_NAME || process.env.bucketName || "";
let bucketId = process.env.B2_BUCKET_ID || "";

if (!accountId || !applicationKey || !bucketName) {
  console.warn("[B2] Missing env vars. Uploads will fail.");
}

let b2Instance: B2 | null = null;
let authPromise: Promise<unknown> | null = null;
let uploadUrlCache: { uploadUrl: string; uploadAuthToken: string; fetchedAt: number } | null = null;

function getB2(): B2 {
  if (!b2Instance) {
    b2Instance = new B2({
      applicationKeyId: accountId,
      applicationKey,
    });
  }
  return b2Instance;
}

async function ensureAuth(): Promise<void> {
  const b2 = getB2();
  if (authPromise) {
    try {
      await authPromise;
      return;
    } catch {
      // Previous auth failed, fall through to re-auth
    }
  }
  authPromise = (async () => {
    try {
      const res = await b2.authorize();
      const allowed = (res.data as any)?.allowed;
      if (allowed?.bucketId) {
        bucketId = allowed.bucketId;
      }
    } catch (err) {
      authPromise = null;
      throw err;
    }
  })();
  try {
    await authPromise;
    // Clear the promise after success so re-auth can happen if needed later
    authPromise = null;
  } catch (err) {
    authPromise = null;
    throw err;
  }
}

async function ensureBucketId(): Promise<string> {
  if (bucketId) return bucketId;
  await ensureAuth();

  const envBucketId = process.env.B2_BUCKET_ID || "";
  if (envBucketId) {
    bucketId = envBucketId;
    return bucketId;
  }

  const b2 = getB2() as any;
  const res = await b2.listBuckets({ bucketName });
  const buckets = (res.data as { buckets: Array<{ bucketId: string; bucketName: string }> }).buckets;
  const match = buckets.find((b) => b.bucketName === bucketName);
  if (!match) throw new Error(`Bucket "${bucketName}" not found in B2 account.`);
  bucketId = match.bucketId;
  return bucketId;
}

async function getUploadUrl(): Promise<{ uploadUrl: string; uploadAuthToken: string }> {
  await ensureAuth();
  const resolvedBucketId = await ensureBucketId();
  const now = Date.now();
  if (uploadUrlCache && now - uploadUrlCache.fetchedAt < 5 * 60 * 1000) {
    return { uploadUrl: uploadUrlCache.uploadUrl, uploadAuthToken: uploadUrlCache.uploadAuthToken };
  }
  const b2 = getB2();
  const res = await b2.getUploadUrl({ bucketId: resolvedBucketId });
  const data = (res.data as unknown) as { uploadUrl: string; authorizationToken: string };
  const result = { uploadUrl: data.uploadUrl, uploadAuthToken: data.authorizationToken };
  uploadUrlCache = { ...result, fetchedAt: now };
  return result;
}

function userPrefix(userId: string): string {
  return `users/${userId}`;
}

export async function uploadFile(
  userId: string,
  uploadType: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileName: string; fileId: string }> {
  await ensureAuth();
  const { uploadUrl, uploadAuthToken } = await getUploadUrl();

  const b2FileName = `${userPrefix(userId)}/${uploadType}_${Date.now()}_${fileName}`;
  const hash = await computeSha1(buffer);

  const res = await getB2().uploadFile({
    uploadUrl,
    uploadAuthToken,
    fileName: b2FileName,
    data: buffer,
    hash,
    info: {
      "content-type": mimeType,
      "upload-type": uploadType,
      "user-id": userId,
    },
  });

  const data = res.data as { fileName: string; fileId: string };
  return { fileName: data.fileName, fileId: data.fileId };
}

export function getDownloadUrl(fileName: string): string {
  const base = process.env.B2_DOWNLOAD_URL || `https://f003.backblazeb2.com/file/${bucketName}`;
  const segments = fileName.split('/').map(s => encodeURIComponent(s));
  return `${base}/${segments.join('/')}`;
}

export async function deleteFile(fileName: string, fileId: string): Promise<void> {
  await ensureAuth();
  await getB2().deleteFileVersion({ fileName, fileId });
}

async function computeSha1(buffer: Buffer): Promise<string> {
  const crypto = await import("crypto");
  return crypto.createHash("sha1").update(buffer).digest("hex");
}
