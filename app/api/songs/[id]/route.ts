import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import { getCached } from "@/lib/cache";
import { getDownloadUrl } from "@/lib/b2-storage";
import type { SongListItem } from "@/lib/types";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getCached(`song:${params.id}`, 30000, async () => {
    // Try preset songs first
    const { rows: songRows } = await query<SongListItem>(
      `select id, title, artist, file_url, duration_seconds, category as upload_type
       from songs
       where id = $1`,
      [params.id]
    );

    if (songRows.length > 0) {
      const s = songRows[0];
      return {
        ...s,
        upload_type: s.upload_type ?? "music",
      };
    }

    // Fallback to user uploads (own uploads + admin youtube imports)
    const { rows: uploadRows } = await query<{
      id: string;
      title: string;
      artist: string;
      album: string | null;
      genre: string | null;
      upload_type: string;
      b2_file_name: string;
      duration_seconds: number | null;
      cover_image: string | null;
      bpm: number | null;
      musical_key: string | null;
    }>(
      `select id, title, artist, album, genre, upload_type, b2_file_name, duration_seconds, cover_image, bpm, musical_key
       from user_uploads
       where id = $1 and (user_id = $2 or source = 'youtube')`,
      [params.id, session.userId]
    );

    if (uploadRows.length === 0) {
      return null;
    }

    const upload = uploadRows[0];
    return {
      id: upload.id,
      title: upload.title,
      artist: upload.artist,
      album: upload.album,
      genre: upload.genre,
      upload_type: upload.upload_type,
      file_url: getDownloadUrl(upload.b2_file_name),
      duration_seconds: upload.duration_seconds,
      cover_image: upload.cover_image,
      bpm: upload.bpm,
      musical_key: upload.musical_key,
    };
  });

  if (!data) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
