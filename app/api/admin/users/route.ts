import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows } = await query<{
    id: string;
    username: string;
    submission_count: string;
    avg_score: string | null;
    last_submission_at: string | null;
  }>(
    `select
       u.id,
       u.username,
       count(s.id)::text as submission_count,
       round(avg(s.score)::numeric, 2)::text as avg_score,
       max(s.submitted_at)::text as last_submission_at
     from users u
     left join submissions s on s.user_id = u.id
     group by u.id, u.username
     order by u.username asc`
  );

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      submission_count: Number(r.submission_count),
      avg_score: r.avg_score ? Number(r.avg_score) : null,
    }))
  );
}
