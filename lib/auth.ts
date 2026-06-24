import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "./session";

export {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  clearSessionCookieOptions,
  getSessionFromRequest,
} from "./session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
