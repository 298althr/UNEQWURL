import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { listProfiles, createProfile } from "@/lib/imperfections";
import { DEFAULT_IMPERFECTION_CONFIG } from "@/lib/imperfection-types";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const profiles = await listProfiles(session.userId);
    return NextResponse.json(profiles);
  } catch (err: any) {
    console.error("[GET /api/imperfections/profiles]", err);
    return NextResponse.json({ error: err.message || "Failed to load profiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Untitled Profile";
    const description = typeof body.description === "string" ? body.description.trim() || null : null;
    const config = body.config && typeof body.config === "object" ? { ...DEFAULT_IMPERFECTION_CONFIG, ...body.config } : DEFAULT_IMPERFECTION_CONFIG;
    const isDefault = body.isDefault === true;
    const profile = await createProfile(session.userId, name, description, config, isDefault);
    return NextResponse.json(profile, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/imperfections/profiles]", err);
    return NextResponse.json({ error: err.message || "Failed to create profile" }, { status: 500 });
  }
}
