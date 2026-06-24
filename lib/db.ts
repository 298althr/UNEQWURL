import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Connection timeout errors should not be retried — retrying just doubles
 * the user's wait time for an error that won't resolve in 8 seconds.
 */
function isConnectionTimeout(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("connection timeout") ||
         msg.includes("connect etimedout") ||
         err?.code === "ETIMEDOUT";
}

function isStaleConnection(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("connection terminated") ||
         msg.includes("socket closed") ||
         err?.code === "ECONNRESET";
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 3000,
      allowExitOnIdle: false,
    });

    // Log pool errors so we can diagnose stale connections
    pool.on("error", (err) => {
      console.error("[db] Pool error:", err.message);
    });
  }
  return pool;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const p = getPool();
  try {
    const result = await p.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } catch (err: any) {
    // Retry once on stale/broken connections — give the pool a moment to
    // establish a fresh connection before the second attempt.
    if (isStaleConnection(err)) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        const result = await p.query(text, params);
        return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
      } catch (retryErr) {
        throw retryErr;
      }
    }
    throw err;
  }
}
