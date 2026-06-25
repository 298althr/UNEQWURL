import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

const protectedPaths = ["/dashboard", "/room", "/soundfiles", "/account", "/uploads"];
const adminPaths = ["/admin"];

function addSecurityHeaders(response: NextResponse, req: NextRequest) {
  const isSecure = req.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "microphone=(self), camera=(), geolocation=(), payment=()");

  // Only upgrade HTTPS if the request is already served securely (avoid redirect loops in local dev)
  if (isSecure) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // CSP: allow self, Vercel scripts, Google fonts (if used), and inline styles from Next.js
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.vercel.app https://*.vercel.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.backblazeb2.com https://*.ytimg.com https://i.ytimg.com",
    "media-src 'self' https://*.backblazeb2.com blob:",
    "connect-src 'self' https://*.vercel.app https://*.railway.app https://*.backblazeb2.com https://*.youtube.com https://*.ytimg.com",
    "worker-src 'self' blob:",
    "frame-src 'self' https://*.youtube.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const needsAdmin = adminPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const session = await getSessionFromRequest(req);

  if (!needsAuth && !needsAdmin) {
    return addSecurityHeaders(NextResponse.next(), req);
  }

  if (!session) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return addSecurityHeaders(NextResponse.redirect(login), req);
  }

  if (needsAdmin && session.role !== "admin") {
    return addSecurityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)), req);
  }

  return addSecurityHeaders(NextResponse.next(), req);
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|assets/|sw.js|manifest.json).*)",
    "/dashboard/:path*",
    "/room/:path*",
    "/soundfiles/:path*",
    "/account/:path*",
    "/uploads/:path*",
    "/admin/:path*",
  ],
};
