import { Pool } from "pg";

let pool: Pool | null = null;

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
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 3000,
      allowExitOnIdle: false,
    });

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
