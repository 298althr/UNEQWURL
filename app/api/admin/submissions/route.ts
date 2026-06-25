import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const songId = searchParams.get("song_id");

  const conditions: string[] = [];
  const params: string[] = [];

  if (userId) {
    params.push(userId);
    conditions.push(`s.user_id = $${params.length}`);
  }
  if (songId) {
    params.push(songId);
    conditions.push(`s.song_id = $${params.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const { rows } = await query<{
    id: string;
    username: string;
    song_title: string;
    settings: Record<string, number>;
    score: number;
    score_breakdown: Record<string, { diff: number; weighted: number }>;
    submitted_at: string;
  }>(
    `select
       sub.id,
       u.username,
       coalesce(s.title, up.title) as song_title,
       sub.settings,
       sub.score,
       sub.score_breakdown,
       sub.submitted_at
     from submissions sub
     join users u on u.id = sub.user_id
     left join songs s on s.id = sub.song_id
     left join user_uploads up on up.id = sub.upload_id
     ${where}
     order by sub.submitted_at desc`,
    params
  );

  return NextResponse.json(rows);
}
