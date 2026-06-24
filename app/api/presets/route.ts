import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";
import type { EQSettings } from "@/lib/types";

/* GET — list user's presets + all public presets */
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await query<{
      id: string;
      user_id: string;
      name: string;
      is_public: boolean;
      status: string;
      eq_settings: EQSettings;
      fx_settings: Record<string, unknown> | null;
      created_at: string;
      author_name: string;
    }>(
      `SELECT p.id, p.user_id, p.name, p.is_public, p.status, p.eq_settings, p.fx_settings, p.created_at,
              u.username AS author_name
       FROM presets p
       JOIN users u ON u.id = p.user_id
       WHERE (p.user_id = $1 AND p.status != 'archived') OR p.status = 'published'
       ORDER BY p.status ASC, p.created_at DESC`,
      [session.userId]
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("[GET /api/presets] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* POST — create or update a preset */
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
    const name = String(body.name ?? "").trim();
    const isPublic = Boolean(body.is_public ?? false);
    const eqSettings = body.eq_settings as EQSettings;
    const fxSettings = body.fx_settings ?? null;

    if (!name) {
      return NextResponse.json({ error: "Preset name is required" }, { status: 400 });
    }

    if (!eqSettings || typeof eqSettings !== "object") {
      return NextResponse.json({ error: "eq_settings is required" }, { status: 400 });
    }

    // Upsert: insert or update on conflict (user_id, name)
    // Map is_public to status for new presets
    const presetStatus = isPublic ? 'published' : 'draft';
    const { rows } = await query<{
      id: string;
    }>(
      `INSERT INTO presets (user_id, name, is_public, status, eq_settings, fx_settings)
       VALUES ($1, $2, $3, $6, $4, $5)
       ON CONFLICT (user_id, name)
       DO UPDATE SET is_public = $3, status = $6, eq_settings = $4, fx_settings = $5, created_at = NOW()
       RETURNING id`,
      [session.userId, name, isPublic, JSON.stringify(eqSettings), JSON.stringify(fxSettings), presetStatus]
    );

    return NextResponse.json({ id: rows[0].id, name, is_public: isPublic });
  } catch (err: any) {
    console.error("[POST /api/presets] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
