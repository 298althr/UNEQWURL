import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";

/* GET — list active class sessions (for lecturer dashboard) */
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { rows } = await query<{
      id: string;
      name: string;
      song_id: string | null;
      created_at: string;
      status: string;
      active: boolean;
      student_count: string;
    }>(
      `SELECT cs.id, cs.name, cs.song_id, cs.created_at, cs.status, cs.active,
              COUNT(DISTINCT lc.user_id)::TEXT AS student_count
       FROM class_sessions cs
       LEFT JOIN lesson_completions lc ON lc.session_id = cs.id
       GROUP BY cs.id
       ORDER BY cs.created_at DESC`
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("[GET /api/class-sessions] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* POST — create a new class session */
export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const name = String(body.name ?? "").trim();
    const songId = body.song_id ? String(body.song_id) : null;

    if (!name) {
      return NextResponse.json({ error: "Session name is required" }, { status: 400 });
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO class_sessions (name, lecturer_id, song_id, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [name, session.userId, songId]
    );

    return NextResponse.json({ id: rows[0].id, name });
  } catch (err: any) {
    console.error("[POST /api/class-sessions] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* PATCH — update class session status (active → closed → archived) */
export async function PATCH(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const sessionId = String(body.session_id ?? "");
    const newStatus = String(body.status ?? "");

    if (!sessionId || !newStatus) {
      return NextResponse.json({ error: "session_id and status are required" }, { status: 400 });
    }

    const validStatuses = ["active", "closed", "archived"];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    // State machine: active → closed → archived (no backwards)
    const { rows: current } = await query<{ status: string }>(
      `SELECT status FROM class_sessions WHERE id = $1`,
      [sessionId]
    );

    if (current.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const currentStatus = current[0].status;
    const transitions: Record<string, string[]> = {
      active: ["closed"],
      closed: ["archived", "active"],
      archived: [],
    };

    if (!transitions[currentStatus]?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid transition: ${currentStatus} → ${newStatus}`, allowed: transitions[currentStatus] || [] },
        { status: 409 }
      );
    }

    await query(
      `UPDATE class_sessions SET status = $2 WHERE id = $1`,
      [sessionId, newStatus]
    );

    return NextResponse.json({ id: sessionId, status: newStatus });
  } catch (err: any) {
    console.error("[PATCH /api/class-sessions] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
