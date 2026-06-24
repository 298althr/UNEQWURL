import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export type AdminControl = {
  id: string;
  username: string;
  audio_title: string;
  settings: Record<string, number>;
  controls_log: Record<string, unknown> | null;
  score: number | null;
  submitted_at: string;
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows } = await query<AdminControl>(
    `select
       sub.id,
       u.username,
       coalesce(s.title, up.title) as audio_title,
       sub.settings,
       sub.controls_log,
       sub.score,
       sub.submitted_at
     from submissions sub
     join users u on sub.user_id = u.id
     left join songs s on sub.song_id = s.id
     left join user_uploads up on sub.upload_id = up.id
     where sub.controls_log is not null
     order by sub.submitted_at desc`
  );

  return NextResponse.json(rows);
}
