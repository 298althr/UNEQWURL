import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getProfile, updateProfile, deleteProfile } from "@/lib/imperfections";
import { DEFAULT_IMPERFECTION_CONFIG } from "@/lib/imperfection-types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const profile = await getProfile(params.id, session.userId);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err: any) {
    console.error(`[GET /api/imperfections/profiles/${params.id}]`, err);
    return NextResponse.json({ error: err.message || "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const updates: Parameters<typeof updateProfile>[2] = {};
    if (body.name !== undefined) updates.name = String(body.name);
    if (body.description !== undefined) updates.description = body.description ? String(body.description) : null;
    if (body.isDefault !== undefined) updates.is_default = Boolean(body.isDefault);
    if (body.config && typeof body.config === "object") {
      updates.config = { ...DEFAULT_IMPERFECTION_CONFIG, ...body.config };
    }
    const profile = await updateProfile(params.id, session.userId, updates);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err: any) {
    console.error(`[PUT /api/imperfections/profiles/${params.id}]`, err);
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ok = await deleteProfile(params.id, session.userId);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`[DELETE /api/imperfections/profiles/${params.id}]`, err);
    return NextResponse.json({ error: err.message || "Failed to delete profile" }, { status: 500 });
  }
}
