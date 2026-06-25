import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import { getCached } from "@/lib/cache";
import type { SongListItem } from "@/lib/types";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getCached<SongListItem[]>(`songs:list`, 30000, async () => {
    const { rows } = await query<SongListItem>(
      `select id, title, artist, file_url, duration_seconds, category as upload_type
       from songs
       where analysis_status = 'ready'
       order by title asc`
    );
    return rows;
  });

  return NextResponse.json(rows);
}
