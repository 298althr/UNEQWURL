import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  if (!url.startsWith("https://f003.backblazeb2.com/")) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "Accept": "audio/mpeg,*/*" },
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
    headers.set("Cache-Control", "public, max-age=86400, immutable");

    return new NextResponse(res.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Proxy fetch failed" },
      { status: 502 }
    );
  }
}
