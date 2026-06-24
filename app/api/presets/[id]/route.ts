import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";

/* DELETE — soft-delete a preset by id (owner only) → sets status = 'archived' */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rowCount } = await query(
      `UPDATE presets SET status = 'archived' WHERE id = $1 AND user_id = $2 AND status != 'archived'`,
      [params.id, session.userId]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "Preset not found or not owned" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[DELETE /api/presets/[id]] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* PATCH — toggle is_public / status (draft ↔ published) */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const isPublic = Boolean(body.is_public);
    const newStatus = isPublic ? 'published' : 'draft';

    const { rowCount } = await query(
      `UPDATE presets SET is_public = $3, status = $4 WHERE id = $1 AND user_id = $2`,
      [params.id, session.userId, isPublic, newStatus]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "Preset not found or not owned" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, is_public: isPublic });
  } catch (err: any) {
    console.error("[PATCH /api/presets/[id]] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
