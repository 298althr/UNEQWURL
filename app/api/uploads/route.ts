import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import { getCached } from "@/lib/cache";
import { uploadFile, deleteFile, getDownloadUrl } from "@/lib/b2-storage";

const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
]);

const ALLOWED_EXTS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".mp4"]);

const MAX_SIZE_BYTES = 30 * 1024 * 1024;           // 30 MB (regular users)
const ADMIN_MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB (admin — unlimited in practice)
const MIN_SIZE_BYTES = 100 * 1024;                  // 100 KB

export type UserUpload = {
  id: string;
  user_id: string;
  upload_type: "music" | "podcast" | "live" | "stream";
  source: "upload" | "youtube";
  youtube_url: string | null;
  original_filename: string;
  b2_file_name: string;
  b2_file_id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  cover_image: string | null;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds: number | null;
  bpm: number | null;
  musical_key: string | null;
  uploaded_at: string;
  created_at: string;
};

/* GET — list user's uploads */
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await getCached(`uploads:${session.userId}`, 10000, async () => {
      const { rows } = await query<UserUpload>(
        `select id, user_id, upload_type, source, youtube_url, original_filename, b2_file_name, b2_file_id,
                title, artist, album, genre, cover_image,
                file_size_bytes, mime_type, duration_seconds, bpm, musical_key, uploaded_at, created_at
         from user_uploads
         where user_id = $1
         order by uploaded_at desc`,
        [session.userId]
      );
      return rows;
    });

    const enriched = rows.map((r) => ({
      ...r,
      file_url: getDownloadUrl(r.b2_file_name),
    }));
    return NextResponse.json(enriched);
  } catch (err: any) {
    console.error("[GET /api/uploads] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* POST — upload a file */
export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadType = formData.get("uploadType") as string | null;
    const title = String(formData.get("title") ?? "").trim();
    const artist = String(formData.get("artist") ?? "").trim();
    const album = String(formData.get("album") ?? "").trim() || null;
    const genre = String(formData.get("genre") ?? "").trim() || null;
    const coverImage = String(formData.get("coverImage") ?? "").trim() || null;

    if (!file || !uploadType) {
      return NextResponse.json(
        { error: "Missing file or uploadType" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (!["music", "podcast", "live", "stream"].includes(uploadType)) {
      return NextResponse.json(
        { error: "Invalid uploadType. Must be music, podcast, live, or stream." },
        { status: 400 }
      );
    }

    // Validate size — admins have no practical limit (2 GB cap for safety)
    const isAdmin = session.role === "admin";
    const maxAllowed = isAdmin ? ADMIN_MAX_SIZE_BYTES : MAX_SIZE_BYTES;
    if (file.size > maxAllowed) {
      const limitLabel = isAdmin ? "2 GB" : "30 MB";
      return NextResponse.json(
        { error: `File exceeds ${limitLabel} limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 400 }
      );
    }
    if (file.size < MIN_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File is below 100 KB minimum (${(file.size / 1024).toFixed(0)} KB)` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: MP3, WAV, OGG, M4A.` },
        { status: 400 }
      );
    }

    // Validate extension
    const originalName = file.name;
    const ext = originalName.slice(originalName.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file extension: ${ext}` },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to B2 (per-user folder: users/{userId}/...)
    const b2Result = await uploadFile(session.userId, uploadType, originalName, buffer, file.type);

    // Check for existing upload of same type and delete old B2 file
    const { rows: existing } = await query<{ id: string; b2_file_name: string; b2_file_id: string }>(
      `select id, b2_file_name, b2_file_id from user_uploads where user_id = $1 and upload_type = $2`,
      [session.userId, uploadType]
    );

    if (existing.length > 0) {
      // Delete old file from B2
      try {
        await deleteFile(existing[0].b2_file_name, existing[0].b2_file_id);
      } catch (err) {
        console.error("[B2] Failed to delete old file:", err);
      }
      // Delete old DB record
      await query(`delete from user_uploads where id = $1`, [existing[0].id]);
    }

    // Insert new record
    const { rows } = await query<UserUpload>(
      `insert into user_uploads
       (user_id, upload_type, original_filename, b2_file_name, b2_file_id, title, artist, album, genre, cover_image, file_size_bytes, mime_type)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning id, user_id, upload_type, original_filename, b2_file_name, b2_file_id,
                 title, artist, album, genre, cover_image,
                 file_size_bytes, mime_type, duration_seconds, uploaded_at, created_at`,
      [session.userId, uploadType, originalName, b2Result.fileName, b2Result.fileId, title, artist || "Unknown Artist", album, genre, coverImage, file.size, file.type]
    );

    const upload = rows[0];

    // Trigger auto-analysis via processing service (non-blocking)
    const processingUrl = process.env.PROCESSING_SERVICE_URL;
    if (processingUrl) {
      fetch(`${processingUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: upload.id, source: "upload" }),
      }).catch((e) => console.error("[autoAnalyze] background error:", e?.message?.slice(0, 200)));
    } else {
      console.warn("[autoAnalyze] PROCESSING_SERVICE_URL not set — skipping analysis");
    }

    return NextResponse.json({ ...upload, analysis_ready: false, analysis_status: 'pending' }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/uploads] error:", err);
    return NextResponse.json(
      { error: "Upload failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
