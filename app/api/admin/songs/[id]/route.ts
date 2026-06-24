import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";
import { isValidSettings } from "@/lib/scoring";
import type { EQSettings, SongAdmin } from "@/lib/types";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.benchmark_settings !== undefined) {
      if (!isValidSettings(body.benchmark_settings)) {
        return NextResponse.json({ error: "Invalid benchmark_settings" }, { status: 400 });
      }
      values.push(JSON.stringify(body.benchmark_settings));
      updates.push(`benchmark_settings = $${values.length}`);
    }

    if (body.benchmark_weights !== undefined) {
      if (!isValidSettings(body.benchmark_weights)) {
        return NextResponse.json({ error: "Invalid benchmark_weights" }, { status: 400 });
      }
      values.push(JSON.stringify(body.benchmark_weights));
      updates.push(`benchmark_weights = $${values.length}`);
    }

    if (body.benchmark_ready !== undefined) {
      // Map boolean to analysis_status for backward compat
      values.push(Boolean(body.benchmark_ready) ? 'ready' : 'pending');
      updates.push(`analysis_status = $${values.length}`);
    }

    if (body.analysis_status !== undefined) {
      const validStatuses = ['pending', 'analyzing', 'ready', 'failed'];
      if (!validStatuses.includes(String(body.analysis_status))) {
        return NextResponse.json({ error: `Invalid analysis_status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
      }
      values.push(body.analysis_status);
      updates.push(`analysis_status = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    values.push(params.id);
    const { rows, rowCount } = await query<SongAdmin>(
      `update songs set ${updates.join(", ")}
       where id = $${values.length}
       returning id, title, artist, file_url, duration_seconds,
                 benchmark_settings, benchmark_weights, benchmark_ready, analysis_status, probe_data`,
      values
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows } = await query<SongAdmin & { benchmark_settings: EQSettings }>(
    `select id, title, artist, file_url, duration_seconds,
            benchmark_settings, benchmark_weights, benchmark_ready, analysis_status, probe_data
     from songs where id = $1`,
    [params.id]
  );

  if (!rows[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}
