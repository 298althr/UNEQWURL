import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "298eq_session";
const SESSION_TTL = "7d";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is required but not set.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;
    const role = payload.role;
    if (!userId || (role !== "user" && role !== "student" && role !== "admin")) return null;
    const normalizedRole = role === "user" ? "student" : role;
    return { userId, role: normalizedRole };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

function isSecure(req?: Request): boolean {
  // Trust x-forwarded-proto from proxies (Railway, Vercel, Cloudflare, etc.)
  if (req) {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto) return proto === "https";
  }
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(token: string, req?: Request) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearSessionCookieOptions(req?: Request) {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure(req),
    path: "/",
    maxAge: 0,
  };
}
