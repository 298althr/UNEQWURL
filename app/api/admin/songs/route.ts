import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";
import type { SongAdmin } from "@/lib/types";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows } = await query<SongAdmin>(
    `select id, title, artist, file_url, duration_seconds,
            bpm, musical_key,
            benchmark_settings, benchmark_weights, benchmark_ready, analysis_status, probe_data
     from songs
     order by title asc`
  );

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Bulk upload: array of songs
    if (Array.isArray(body.songs)) {
      const songs = body.songs as Array<{
        title: string;
        artist?: string;
        file_url: string;
        duration_seconds?: number;
      }>;

      if (songs.length === 0) {
        return NextResponse.json({ error: "songs array is empty" }, { status: 400 });
      }
      if (songs.length > 50) {
        return NextResponse.json({ error: "Max 50 songs per bulk upload" }, { status: 400 });
      }

      const results: SongAdmin[] = [];
      for (const song of songs) {
        const title = String(song.title ?? "").trim();
        const artist = song.artist ? String(song.artist).trim() : null;
        const fileUrl = String(song.file_url ?? "").trim();
        const durationSeconds = song.duration_seconds ?? null;

        if (!title || !fileUrl) continue;

        const { rows } = await query<SongAdmin>(
          `insert into songs (title, artist, file_url, duration_seconds)
           values ($1, $2, $3, $4)
           returning id, title, artist, file_url, duration_seconds,
                     benchmark_settings, benchmark_weights, benchmark_ready, analysis_status, probe_data`,
          [title, artist, fileUrl, durationSeconds]
        );
        results.push(rows[0]);
      }

      return NextResponse.json({ created: results.length, songs: results }, { status: 201 });
    }

    // Single song upload
    const title = String(body.title ?? "").trim();
    const artist = body.artist ? String(body.artist).trim() : null;
    const fileUrl = String(body.file_url ?? "").trim();
    const durationSeconds = body.duration_seconds ?? null;

    if (!title || !fileUrl) {
      return NextResponse.json({ error: "title and file_url required" }, { status: 400 });
    }

    const { rows } = await query<SongAdmin>(
      `insert into songs (title, artist, file_url, duration_seconds)
       values ($1, $2, $3, $4)
       returning id, title, artist, file_url, duration_seconds,
                 benchmark_settings, benchmark_weights, benchmark_ready, analysis_status, probe_data`,
      [title, artist, fileUrl, durationSeconds]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create song" }, { status: 500 });
  }
}
