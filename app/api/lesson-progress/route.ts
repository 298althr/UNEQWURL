import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";

/* POST — record a lesson step completion */
export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const sessionId = String(body.session_id ?? "");
    const stepIndex = Number(body.step_index);

    if (!sessionId || isNaN(stepIndex) || stepIndex < 0) {
      return NextResponse.json({ error: "session_id and step_index are required" }, { status: 400 });
    }

    // Validate class session is still active before accepting completions
    const { rows: classSession } = await query<{ status: string }>(
      `SELECT status FROM class_sessions WHERE id = $1`,
      [sessionId]
    );

    if (classSession.length === 0) {
      return NextResponse.json({ error: "Class session not found" }, { status: 404 });
    }

    if (classSession[0].status !== 'active') {
      return NextResponse.json(
        { error: `Class session is ${classSession[0].status}. Cannot add completions to a non-active session.` },
        { status: 409 }
      );
    }

    // Upsert — ignore if already completed
    await query(
      `INSERT INTO lesson_completions (session_id, user_id, step_index, status)
       VALUES ($1, $2, $3, 'completed')
       ON CONFLICT (session_id, user_id, step_index) DO NOTHING`,
      [sessionId, session.userId, stepIndex]
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[POST /api/lesson-progress] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* GET — get completion grid for a class session (admin only) */
export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id query param required" }, { status: 400 });
    }

    const { rows } = await query<{
      user_id: string;
      username: string;
      step_index: number;
      completed_at: string;
    }>(
      `SELECT lc.user_id, u.username, lc.step_index, lc.completed_at
       FROM lesson_completions lc
       JOIN users u ON u.id = lc.user_id
       WHERE lc.session_id = $1
       ORDER BY u.username, lc.step_index`,
      [sessionId]
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("[GET /api/lesson-progress] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
