import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import { deleteFile, getDownloadUrl } from "@/lib/b2-storage";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const b2FileName = String(body?.b2FileName ?? "").trim();
    const b2FileId = String(body?.b2FileId ?? "").trim();
    const originalFilename = String(body?.originalFilename ?? "").trim();
    const uploadType = String(body?.uploadType ?? "").trim();
    const title = String(body?.title ?? "").trim();
    const artist = String(body?.artist ?? "").trim();
    const album = String(body?.album ?? "").trim() || null;
    const genre = String(body?.genre ?? "").trim() || null;
    const coverImage = String(body?.coverImage ?? "").trim() || null;
    const fileSize = Number(body?.fileSize ?? 0);
    const mimeType = String(body?.mimeType ?? "").trim();

    if (!b2FileName || !b2FileId || !uploadType || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["music", "podcast", "live", "stream"].includes(uploadType)) {
      return NextResponse.json({ error: "Invalid uploadType" }, { status: 400 });
    }

    // Delete old upload of same type
    const { rows: existing } = await query<{ id: string; b2_file_name: string; b2_file_id: string }>(
      `select id, b2_file_name, b2_file_id from user_uploads where user_id = $1 and upload_type = $2`,
      [session.userId, uploadType]
    );

    if (existing.length > 0) {
      try {
        await deleteFile(existing[0].b2_file_name, existing[0].b2_file_id);
      } catch (err) {
        console.error("[B2] Failed to delete old file:", err);
      }
      await query(`delete from user_uploads where id = $1`, [existing[0].id]);
    }

    const { rows } = await query<{
      id: string; b2_file_name: string; user_id: string; upload_type: string; source: string;
      youtube_url: string | null; original_filename: string; b2_file_id: string;
      title: string; artist: string; album: string | null; genre: string | null;
      cover_image: string | null; file_size_bytes: number; mime_type: string;
      duration_seconds: number | null; uploaded_at: string; created_at: string;
    }>(
      `insert into user_uploads
       (user_id, upload_type, source, original_filename, b2_file_name, b2_file_id,
        title, artist, album, genre, cover_image, file_size_bytes, mime_type)
       values ($1, $2, 'upload', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning id, user_id, upload_type, source, youtube_url, original_filename, b2_file_name, b2_file_id,
                 title, artist, album, genre, cover_image,
                 file_size_bytes, mime_type, duration_seconds, uploaded_at, created_at`,
      [session.userId, uploadType, originalFilename, b2FileName, b2FileId,
       title, artist || "Unknown Artist", album, genre, coverImage, fileSize, mimeType]
    );

    const upload = rows[0];

    // Trigger auto-analysis
    const processingUrl = process.env.PROCESSING_SERVICE_URL;
    if (processingUrl) {
      fetch(`${processingUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: upload.id, source: "upload" }),
      }).catch((e) => console.error("[autoAnalyze] background error:", e?.message?.slice(0, 200)));
    }

    return NextResponse.json({ ...upload, file_url: getDownloadUrl(b2FileName) }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/uploads/complete] error:", err);
    return NextResponse.json({ error: "Failed to save upload", detail: err?.message }, { status: 500 });
  }
}
