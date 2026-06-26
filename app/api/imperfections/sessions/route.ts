import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { createSession, updateSessionMetrics, endSession } from "@/lib/imperfections";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const songId = typeof body.songId === "string" ? body.songId : "";
    const profileId = body.profileId && typeof body.profileId === "string" ? body.profileId : null;
    const consoleState = body.consoleState && typeof body.consoleState === "object" ? body.consoleState : {};
    const metrics = body.metrics && typeof body.metrics === "object" ? body.metrics : {};
    const id = await createSession(session.userId, songId, profileId, consoleState, metrics);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/imperfections/sessions]", err);
    return NextResponse.json({ error: err.message || "Failed to create session" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const metrics = body.metrics && typeof body.metrics === "object" ? body.metrics : {};
    const ended = body.ended === true;

    if (ended) {
      await endSession(sessionId, session.userId);
      return NextResponse.json({ success: true });
    }

    const ok = await updateSessionMetrics(sessionId, session.userId, metrics);
    if (!ok) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT /api/imperfections/sessions]", err);
    return NextResponse.json({ error: err.message || "Failed to update session" }, { status: 500 });
  }
}
