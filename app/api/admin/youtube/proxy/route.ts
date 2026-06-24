import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Only allow googlevideo.com YouTube CDN URLs
  if (!url.includes("googlevideo.com")) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "audio/webm,audio/mp4,audio/mpeg,*/*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status }
      );
    }

    const headers = new Headers();
    const contentType = res.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    const contentLength = res.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "no-store");

    return new NextResponse(res.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("[YouTube proxy] error:", err);
    return NextResponse.json(
      { error: "Proxy fetch failed" },
      { status: 502 }
    );
  }
}
