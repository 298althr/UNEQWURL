import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import { getDownloadUrl } from "@/lib/b2-storage";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing upload id" }, { status: 400 });
  }

  // Look up upload and verify ownership
  const { rows } = await query<{ b2_file_name: string }>(
    `select b2_file_name from user_uploads where id = $1 and user_id = $2`,
    [id, session.userId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  // Redirect to B2 download URL
  const url = getDownloadUrl(rows[0].b2_file_name);
  return NextResponse.redirect(url);
}
