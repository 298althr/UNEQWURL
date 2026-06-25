import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSessionCookieOptions(req));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
