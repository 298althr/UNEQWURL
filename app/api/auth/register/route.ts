import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeJsonBody } from "@/lib/body-parser";
import { hashPassword } from "@/lib/auth";
import { getUserFolderPrefix } from "@/lib/b2-storage";

export async function POST(req: Request) {
  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3–30 characters, alphanumeric with hyphens/underscores only" },
        { status: 400 }
      );
    }
    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await query<{ id: string; username: string }>(
      `insert into users (username, password_hash) values ($1, $2)
       returning id, username`,
      [username, passwordHash]
    );

    const user = rows[0];

    // B2 user folder is ready (folders are implicit prefixes: users/{userId}/)
    const folderPrefix = getUserFolderPrefix(user.id);
    console.log(`[B2] User folder ready: ${folderPrefix}`);

    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "23505"
    ) {
      return NextResponse.json({ error: "Username taken" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
