import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";
import { deleteFile, getDownloadUrl } from "@/lib/b2-storage";

type UploadRow = {
  id: string;
  user_id: string;
  upload_type: string;
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
  uploaded_at: string;
  created_at: string;
};

/* GET — single upload metadata (also used as fallback from /api/songs/[id]) */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await query<UploadRow>(
    `select id, user_id, upload_type, original_filename, b2_file_name,
            title, artist, album, genre, cover_image,
            file_size_bytes, mime_type, duration_seconds, uploaded_at, created_at
     from user_uploads
     where id = $1 and user_id = $2`,
    [params.id, session.userId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  const upload = rows[0];
  return NextResponse.json({
    id: upload.id,
    title: upload.title,
    artist: upload.artist,
    album: upload.album,
    genre: upload.genre,
    cover_image: upload.cover_image,
    file_url: getDownloadUrl(upload.b2_file_name),
    duration_seconds: upload.duration_seconds,
    upload_type: upload.upload_type,
    file_size_bytes: upload.file_size_bytes,
    uploaded_at: upload.uploaded_at,
    created_at: upload.created_at,
  });
}

/* DELETE — remove upload (weekly lock: 7 days from upload) */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await query<UploadRow>(
    `select b2_file_name, b2_file_id, uploaded_at from user_uploads where id = $1 and user_id = $2`,
    [params.id, session.userId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  const upload = rows[0];

  // Delete file from B2
  try {
    await deleteFile(upload.b2_file_name, upload.b2_file_id);
  } catch (err) {
    console.error("[B2] Delete failed:", err);
    // Continue to delete DB record even if B2 delete fails
  }

  // Delete DB record
  await query(`delete from user_uploads where id = $1`, [params.id]);

  return NextResponse.json({ success: true });
}

/* PATCH — update upload metadata (title, artist, album, genre, upload_type) */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(String(body.title));
    }
    if (body.artist !== undefined) {
      updates.push(`artist = $${idx++}`);
      values.push(String(body.artist));
    }
    if (body.album !== undefined) {
      updates.push(`album = $${idx++}`);
      values.push(body.album ? String(body.album) : null);
    }
    if (body.genre !== undefined) {
      updates.push(`genre = $${idx++}`);
      values.push(body.genre ? String(body.genre) : null);
    }
    if (body.cover_image !== undefined) {
      updates.push(`cover_image = $${idx++}`);
      values.push(body.cover_image ? String(body.cover_image) : null);
    }
    if (body.upload_type !== undefined) {
      const type = String(body.upload_type);
      if (!["music", "podcast", "live", "stream"].includes(type)) {
        return NextResponse.json({ error: "Invalid upload_type" }, { status: 400 });
      }
      updates.push(`upload_type = $${idx++}`);
      values.push(type);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(params.id, session.userId);

    const { rows } = await query<UploadRow>(
      `update user_uploads set ${updates.join(", ")} where id = $${idx++} and user_id = $${idx++} returning *`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    const upload = rows[0];
    return NextResponse.json({
      id: upload.id,
      title: upload.title,
      artist: upload.artist,
      album: upload.album,
      genre: upload.genre,
      cover_image: upload.cover_image,
      upload_type: upload.upload_type,
      file_url: getDownloadUrl(upload.b2_file_name),
    });
  } catch (err: any) {
    console.error("[PATCH /api/uploads/[id]] error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
