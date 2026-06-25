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

  // Try user_uploads first (verify ownership)
  const { rows } = await query<{ b2_file_name: string }>(
    `select b2_file_name from user_uploads where id = $1 and user_id = $2`,
    [id, session.userId]
  );

  if (rows.length > 0) {
    const url = getDownloadUrl(rows[0].b2_file_name);
    return NextResponse.redirect(url);
  }

  // Fallback: check songs table (default/admin tracks available to all users)
  const { rows: songRows } = await query<{ file_url: string }>(
    `select file_url from songs where id = $1`,
    [id]
  );

  if (songRows.length > 0) {
    const fileUrl = songRows[0].file_url;
    // If it's already a full URL (B2), redirect directly
    if (fileUrl.startsWith("http")) {
      return NextResponse.redirect(fileUrl);
    }
    // Otherwise treat as b2_file_name
    const url = getDownloadUrl(fileUrl);
    return NextResponse.redirect(url);
  }

  return NextResponse.json({ error: "Upload not found" }, { status: 404 });
}
