import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await query<{
      username: string;
      role: string;
      email: string | null;
      phone: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `select username, role, email, phone, display_name, avatar_url
       from users where id = $1`,
      [session.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = rows[0];
    const normalizedRole = user.role === "user" ? "student" : user.role;
    return NextResponse.json({
      username: user.username,
      role: normalizedRole,
      email: user.email ?? `${user.username.replace(/\s+/g, ".").toLowerCase()}@UNEQWURL.com`,
      phone: user.phone ?? "+1 (555) 298-4491",
      displayName: user.display_name ?? user.username,
      avatarUrl: user.avatar_url,
    });
  } catch (err: any) {
    if (err?.code === "42703") {
      const { rows } = await query<{ username: string; role: string }>(
        `select username, role from users where id = $1`,
        [session.userId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const user = rows[0];
      const normalizedRole = user.role === "user" ? "student" : user.role;
      return NextResponse.json({
        username: user.username,
        role: normalizedRole,
        email: `${user.username.replace(/\s+/g, ".").toLowerCase()}@UNEQWURL.com`,
        phone: "+1 (555) 298-4491",
        displayName: user.username,
        avatarUrl: null,
      });
    }
    throw err;
  }
}

export async function PUT(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { displayName, email, phone } = body;

    const { rows } = await query<{
      username: string;
      role: string;
      email: string | null;
      phone: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `update users
       set display_name = coalesce($1, display_name),
           email = coalesce($2, email),
           phone = coalesce($3, phone)
       where id = $4
       returning username, role, email, phone, display_name, avatar_url`,
      [
        displayName ?? null,
        email ?? null,
        phone ?? null,
        session.userId,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = rows[0];
    const normalizedRole = user.role === "user" ? "student" : user.role;
    return NextResponse.json({
      username: user.username,
      role: normalizedRole,
      email: user.email ?? `${user.username.replace(/\s+/g, ".").toLowerCase()}@UNEQWURL.com`,
      phone: user.phone ?? "+1 (555) 298-4491",
      displayName: user.display_name ?? user.username,
      avatarUrl: user.avatar_url,
    });
  } catch (err: any) {
    if (err?.code === "42703") {
      return NextResponse.json(
        { error: "Profile fields not available. Run migration 004." },
        { status: 501 }
      );
    }
    console.error("[PUT /api/user/profile] error:", err);
    return NextResponse.json(
      { error: "Update failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
