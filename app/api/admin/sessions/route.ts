import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export type AdminSession = {
  id: string;
  username: string;
  song_title: string;
  session_start: string;
  session_end: string;
  average_298eq: number;
  final_settings: Record<string, number>;
  ab_toggles: number;
  status: string;
  created_at: string;
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows } = await query<AdminSession>(
    `select
       sa.id,
       u.username,
       coalesce(s.title, up.title) as song_title,
       sa.session_start,
       sa.session_end,
       sa.average_298eq,
       sa.final_settings,
       sa.ab_toggles,
       sa.status,
       sa.created_at
     from session_analytics sa
     join users u on sa.user_id = u.id
     left join songs s on sa.audio_id = s.id
     left join user_uploads up on sa.audio_id = up.id
     order by sa.created_at desc`
  );

  return NextResponse.json(rows);
}
