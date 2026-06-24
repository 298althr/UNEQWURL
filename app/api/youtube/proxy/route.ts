import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    // Forward Range header from browser for scrub/seek support
    const rangeHeader = req.headers.get("range");
    const upstreamHeaders: Record<string, string> = {
      "Accept": "audio/webm,audio/mp4,audio/mpeg,*/*",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;

    const res = await fetch(url, { headers: upstreamHeaders });

    if (!res.ok && res.status !== 206) {
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
    const contentRange = res.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "no-store");

    return new NextResponse(res.body, {
      status: res.status === 206 ? 206 : 200,
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
