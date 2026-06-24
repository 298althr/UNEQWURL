import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";

/* ── State machine: valid transitions ──
   locked  → pending      (user skips for the first time)
   locked  → completed    (user passes quiz without skipping)
   pending → completed    (user returns and passes quiz)
   pending → pending      (user skips again — refresh timestamp)
   completed → completed  (idempotent re-submit)
   completed → pending    (NOT allowed — can't un-complete a passed quiz)
*/
const VALID_TRANSITIONS: Record<string, string[]> = {
  locked: ["pending", "completed"],
  pending: ["completed", "pending"],
  completed: ["completed"],
};

const VALID_STATUSES = ["completed", "pending", "locked"] as const;
type Status = (typeof VALID_STATUSES)[number];

/* GET — fetch current user's per-stage progress */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await query(
      `select stage_id, status, skipped_at, completed_at
       from user_stages
       where user_id = $1
       order by stage_id`,
      [session.userId]
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("[stage-progress] GET failed:", err);
    // Return empty array on DB error so client can fall back to localStorage
    const isTimeout = String(err?.message || "").includes("timeout");
    if (isTimeout) {
      return NextResponse.json([], { status: 200 });
    }
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: "Failed to fetch stage progress",
        ...(isDev ? { detail: err?.message } : {}),
      },
      { status: 500 }
    );
  }
}

/* POST — update a single stage's status (with state machine validation) */
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
    const stageId = body.stageId as number;
    const status = String(body.status ?? "") as Status;

    if (!stageId || typeof stageId !== "number" || stageId < 1 || stageId > 8) {
      return NextResponse.json({ error: "Missing or invalid stageId (1-8)" }, { status: 400 });
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check current status for state machine validation
    const { rows: existing } = await query<{ status: Status }>(
      `select status from user_stages where user_id = $1 and stage_id = $2`,
      [session.userId, stageId]
    );

    const currentStatus = (existing[0]?.status || "locked") as Status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${currentStatus} → ${status}. Allowed: ${allowed.join(", ") || "none"}`,
          currentStatus,
          requestedStatus: status,
        },
        { status: 409 }
      );
    }

    // Set timestamps based on transition type
    const now = new Date();
    const skippedAt = status === "pending" ? now : null;
    const completedAt = status === "completed" ? now : null;

    const { rows } = await query(
      `insert into user_stages (user_id, stage_id, status, skipped_at, completed_at)
       values ($1, $2, $3, $4, $5)
       on conflict (user_id, stage_id)
       do update set
         status = excluded.status,
         skipped_at = case
           when excluded.status = 'pending' then excluded.skipped_at
           else user_stages.skipped_at
         end,
         completed_at = case
           when excluded.status = 'completed' then excluded.completed_at
           else user_stages.completed_at
         end,
         updated_at = now()
       returning stage_id, status, skipped_at, completed_at`,
      [session.userId, stageId, status, skippedAt, completedAt]
    );

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error("[stage-progress] POST failed:", err);
    const isTimeout = String(err?.message || "").includes("timeout");
    if (isTimeout) {
      // Return 200 with graceful degradation — client will use localStorage
      return NextResponse.json(
        { stage_id: 0, status: "error", detail: "Database unavailable — saved locally only" },
        { status: 200 }
      );
    }
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: "Failed to save stage progress",
        ...(isDev ? { detail: err?.message } : {}),
      },
      { status: 500 }
    );
  }
}

/* PUT — batch upsert multiple stages (for sync/migration) */
export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const stages: { stageId: number; status: Status }[] = body.stages as { stageId: number; status: Status }[];

    if (!Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid stages array" }, { status: 400 });
    }

    // Validate all entries first
    for (const s of stages) {
      if (!s.stageId || typeof s.stageId !== "number" || s.stageId < 1 || s.stageId > 8) {
        return NextResponse.json({ error: `Invalid stageId in batch: ${s.stageId}` }, { status: 400 });
      }
      if (!s.status || !VALID_STATUSES.includes(s.status)) {
        return NextResponse.json({ error: `Invalid status in batch: ${s.status}` }, { status: 400 });
      }
    }

    // Batch upsert using unnest for efficiency
    const stageIds = stages.map(s => s.stageId);
    const statuses = stages.map(s => s.status);
    const now = new Date();
    const skippedAts = stages.map(s => s.status === "pending" ? now : null);
    const completedAts = stages.map(s => s.status === "completed" ? now : null);

    const { rows } = await query(
      `insert into user_stages (user_id, stage_id, status, skipped_at, completed_at)
       select $1, stage_id, status, skipped_at, completed_at
       from unnest($2::int[], $3::text[], $4::timestamptz[], $5::timestamptz[])
       as t(stage_id, status, skipped_at, completed_at)
       on conflict (user_id, stage_id)
       do update set
         status = excluded.status,
         skipped_at = coalesce(excluded.skipped_at, user_stages.skipped_at),
         completed_at = coalesce(excluded.completed_at, user_stages.completed_at),
         updated_at = now()
       returning stage_id, status`,
      [session.userId, stageIds, statuses, skippedAts, completedAts]
    );

    return NextResponse.json({ synced: rows.length, stages: rows }, { status: 200 });
  } catch (err: any) {
    console.error("[stage-progress] PUT failed:", err);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: "Failed to batch sync stage progress",
        ...(isDev ? { detail: err?.message } : {}),
      },
      { status: 500 }
    );
  }
}
