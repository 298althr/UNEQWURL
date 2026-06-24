import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const {
      audio_id,
      session_start,
      session_end,
      average_298eq,
      final_settings,
      ab_toggles
    } = body;

    if (!audio_id || !final_settings) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate audio_id is a non-empty string
    if (typeof audio_id !== "string" || audio_id.length < 1) {
      return NextResponse.json({ error: "Invalid audio_id" }, { status: 400 });
    }

    // Validate audio_id is a UUID or a live-stream placeholder
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isLiveStream = audio_id.startsWith("live-");
    if (!uuidRegex.test(audio_id) && !isLiveStream) {
      return NextResponse.json(
        { error: "Invalid audio_id format. Expected UUID or live stream ID.", received: audio_id },
        { status: 400 }
      );
    }

    try {
      const { rows } = await query(
        `insert into session_analytics (
          user_id, audio_id, session_start, session_end, average_298eq, final_settings, ab_toggles, status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id, created_at`,
        [
          session.userId,
          audio_id,
          session_start ? new Date(String(session_start)) : new Date(),
          session_end ? new Date(String(session_end)) : new Date(),
          Number(average_298eq || 0),
          JSON.stringify(final_settings),
          Number(ab_toggles || 0),
          session_end ? 'completed' : 'active',
        ]
      );

      return NextResponse.json(rows[0], { status: 201 });
    } catch (dbErr: any) {
      console.error("[session-analytics] DB insert failed:", dbErr);
      const detail = dbErr?.detail || dbErr?.message || String(dbErr);
      // If FK violation on audio_id, tell them to run the migration
      const isFkViolation = dbErr?.code === "23503" ||
        detail.includes("session_analytics_audio_id_fkey") ||
        detail.includes("violates foreign key constraint") ||
        detail.includes("is not present in table");
      return NextResponse.json(
        {
          error: isFkViolation
            ? "Database constraint error: audio_id FK still active. Run: ALTER TABLE session_analytics DROP CONSTRAINT IF EXISTS session_analytics_audio_id_fkey;"
            : "Database save failed",
          detail,
          code: dbErr?.code,
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[session-analytics] Request processing failed:", err);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: "Failed to process session data",
        ...(isDev ? { detail: err?.message } : {}),
      },
      { status: 500 }
    );
  }
}

// GET for current user's sessions
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const isAdmin = session.role === "admin";
  const adminParam = url.searchParams.get("admin");

  // Admin users can view all sessions; non-admins always see only their own
  const viewAll = isAdmin && adminParam !== "false";

  try {
    if (viewAll) {
      const { rows } = await query(
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
         left join songs s on sa.audio_id = s.id::text
         left join user_uploads up on sa.audio_id = up.id::text
         order by sa.created_at desc`
      );
      return NextResponse.json(rows);
    }

    const { rows } = await query(
      `select
        sa.id,
        coalesce(s.title, up.title) as song_title,
        sa.session_start,
        sa.session_end,
        sa.average_298eq,
        sa.final_settings,
        sa.ab_toggles,
        sa.status,
        sa.created_at
       from session_analytics sa
       left join songs s on sa.audio_id = s.id::text
       left join user_uploads up on sa.audio_id = up.id::text
       where sa.user_id = $1
       order by sa.created_at desc
       limit 10`,
      [session.userId]
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Failed to fetch session analytics:", err);
    const detail = err?.message || err?.detail || String(err);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: "Database query failed",
        ...(isDev ? { detail, code: err?.code } : {}),
      },
      { status: 500 }
    );
  }
}
