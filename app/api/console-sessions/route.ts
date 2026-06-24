import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";

/* GET — list user's console sessions */
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const trackId = url.searchParams.get("track_id");
  const trackSource = url.searchParams.get("track_source") as "song" | "upload" | null;

  try {
    let rows;
    if (trackId && trackSource) {
      const { rows: r } = await query(
        `SELECT id, track_id, track_source, console_state, listening_context, score, score_breakdown,
                ab_toggles, session_start, session_end, status, created_at
         FROM console_sessions
         WHERE user_id = $1 AND track_id = $2 AND track_source = $3
         ORDER BY created_at DESC LIMIT 10`,
        [session.userId, trackId, trackSource]
      );
      rows = r;
    } else {
      const { rows: r } = await query(
        `SELECT id, track_id, track_source, console_state, listening_context, score, score_breakdown,
                ab_toggles, session_start, session_end, status, created_at
         FROM console_sessions
         WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [session.userId]
      );
      rows = r;
    }

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("[GET /api/console-sessions] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* POST — save console session state */
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

    const trackId = String(body.track_id ?? "");
    const trackSource = String(body.track_source ?? "") as "song" | "upload";
    const consoleState = body.console_state;
    const listeningContext = String(body.listening_context ?? "studio") as "headphone" | "studio" | "live";
    const abToggles = Number(body.ab_toggles ?? 0);
    const sessionEnd = body.session_end ? String(body.session_end) : null;

    if (!trackId || !trackSource || !consoleState) {
      return NextResponse.json(
        { error: "track_id, track_source, and console_state are required" },
        { status: 400 }
      );
    }

    if (!["song", "upload"].includes(trackSource)) {
      return NextResponse.json(
        { error: "track_source must be 'song' or 'upload'" },
        { status: 400 }
      );
    }

    if (!["headphone", "studio", "live"].includes(listeningContext)) {
      return NextResponse.json(
        { error: "listening_context must be headphone, studio, or live" },
        { status: 400 }
      );
    }

    const status = sessionEnd ? "submitted" : "active";

    const { rows } = await query<{ id: string }>(
      `INSERT INTO console_sessions
       (user_id, track_id, track_source, console_state, listening_context, ab_toggles, session_end, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        session.userId,
        trackId,
        trackSource,
        JSON.stringify(consoleState),
        listeningContext,
        abToggles,
        sessionEnd ? new Date(sessionEnd) : null,
        status,
      ]
    );

    return NextResponse.json({ id: rows[0].id, status }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/console-sessions] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* PATCH — update console session (e.g., add score or session_end) */
export async function PATCH(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const sessionId = String(body.session_id ?? "");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.console_state !== undefined) {
      updates.push(`console_state = $${idx++}`);
      values.push(JSON.stringify(body.console_state));
    }
    if (body.score !== undefined) {
      updates.push(`score = $${idx++}`);
      values.push(Number(body.score));
    }
    if (body.score_breakdown !== undefined) {
      updates.push(`score_breakdown = $${idx++}`);
      values.push(JSON.stringify(body.score_breakdown));
    }
    if (body.ab_toggles !== undefined) {
      updates.push(`ab_toggles = $${idx++}`);
      values.push(Number(body.ab_toggles));
    }
    if (body.session_end !== undefined) {
      updates.push(`session_end = $${idx++}`);
      values.push(body.session_end ? new Date(String(body.session_end)) : null);
      updates.push(`status = 'submitted'`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    values.push(sessionId, session.userId);

    const { rowCount } = await query(
      `UPDATE console_sessions SET ${updates.join(", ")} WHERE id = $${idx++} AND user_id = $${idx++}`,
      values
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "Session not found or not owned" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[PATCH /api/console-sessions] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
