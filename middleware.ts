import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

const protectedPaths = ["/dashboard", "/room", "/soundfiles", "/account"];
const adminPaths = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const needsAdmin = adminPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!needsAuth && !needsAdmin) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (needsAdmin && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/room/:path*", "/soundfiles/:path*", "/account/:path*", "/admin/:path*"],
};
