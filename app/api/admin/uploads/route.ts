import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import { getDownloadUrl } from "@/lib/b2-storage";

export type AdminUpload = {
  id: string;
  username: string;
  upload_type: "music" | "podcast" | "live" | "stream";
  source: "upload" | "youtube";
  youtube_url: string | null;
  original_filename: string;
  b2_file_name: string;
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
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows } = await query<AdminUpload>(
    `select
       up.id,
       u.username,
       up.upload_type,
       up.source,
       up.youtube_url,
       up.original_filename,
       up.b2_file_name,
       up.title,
       up.artist,
       up.album,
       up.genre,
       up.cover_image,
       up.file_size_bytes,
       up.mime_type,
       up.duration_seconds,
       up.bpm,
       up.musical_key,
       up.uploaded_at
     from user_uploads up
     join users u on u.id = up.user_id
     order by up.uploaded_at desc`
  );

  const enriched = rows.map((r) => ({
    ...r,
    file_url: getDownloadUrl(r.b2_file_name),
  }));

  return NextResponse.json(enriched);
}
