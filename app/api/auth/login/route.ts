import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeJsonBody } from "@/lib/body-parser";
import {
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";

function noCache(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function POST(req: Request) {
  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return noCache(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }));
    }
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    const { rows } = await query<{
      id: string;
      username: string;
      password_hash: string;
      role: "user" | "admin";
    }>(`select id, username, password_hash, role from users where username = $1`, [
      username,
    ]);

    const user = rows[0];
    if (!user) {
      // Do NOT call verifyPassword for non-existent users — prevents timing attack
      return noCache(NextResponse.json({ error: "Invalid credentials" }, { status: 401 }));
    }
    if (!(await verifyPassword(password, user.password_hash))) {
      return noCache(NextResponse.json({ error: "Invalid credentials" }, { status: 401 }));
    }

    const normalizedRole = user.role === "user" ? "student" : user.role;
    const token = await createSessionToken({
      userId: user.id,
      role: normalizedRole,
    });
    const response = NextResponse.json({
      id: user.id,
      username: user.username,
      role: normalizedRole,
    });
    response.cookies.set(sessionCookieOptions(token, req));
    return noCache(response);
  } catch (err: any) {
    console.error("[login] Error:", err?.message || err);
    const isTimeout = String(err?.message || "").includes("timeout") || err?.code === "ETIMEDOUT";
    return noCache(NextResponse.json(
      {
        error: isTimeout
          ? "Database connection timed out. The database may be paused — try again in a moment."
          : "Login failed",
      },
      { status: 500 }
    ));
  }
}
