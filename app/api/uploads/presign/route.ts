import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getPresignedUpload } from "@/lib/b2-storage";

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

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const fileName = String(body?.fileName ?? "").trim();
    const fileType = String(body?.fileType ?? "").trim();
    const fileSize = Number(body?.fileSize ?? 0);
    const uploadType = String(body?.uploadType ?? "").trim();

    if (!fileName || !fileType || !uploadType) {
      return NextResponse.json({ error: "Missing fileName, fileType, or uploadType" }, { status: 400 });
    }

    if (!["music", "podcast", "live", "stream"].includes(uploadType)) {
      return NextResponse.json({ error: "Invalid uploadType" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(fileType)) {
      return NextResponse.json({ error: `Unsupported file type: ${fileType}` }, { status: 400 });
    }

    const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json({ error: `Unsupported extension: ${ext}` }, { status: 400 });
    }

    const isAdmin = session.role === "admin";
    const maxAllowed = isAdmin ? 2 * 1024 * 1024 * 1024 : 30 * 1024 * 1024;
    if (fileSize > maxAllowed) {
      return NextResponse.json({ error: `File exceeds ${isAdmin ? "2GB" : "30MB"} limit` }, { status: 400 });
    }
    if (fileSize < 100 * 1024) {
      return NextResponse.json({ error: "File below 100KB minimum" }, { status: 400 });
    }

    const { uploadUrl, uploadAuthToken, b2FileName } = await getPresignedUpload(
      session.userId,
      uploadType,
      fileName
    );

    return NextResponse.json({ uploadUrl, uploadAuthToken, b2FileName });
  } catch (err: any) {
    console.error("[POST /api/uploads/presign] error:", err);
    return NextResponse.json({ error: "Failed to get upload URL", detail: err?.message }, { status: 500 });
  }
}
