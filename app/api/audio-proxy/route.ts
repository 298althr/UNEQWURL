import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";

const MAX_PROXY_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_HOSTS = [
  "f003.backblazeb2.com",
  "youtu.be",
  "www.youtube.com",
  "youtube.com",
  "i.ytimg.com",
  "img.youtube.com",
];

function isPrivateOrReservedHost(url: URL): boolean {
  const hostname = url.hostname;
  // Block any IP-looking hostname or internal names
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname === "127.0.0.1") return true;
  if (/^10\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname) || /^0\./.test(hostname) || /^127\./.test(hostname)) return true;
  if (/^::1$|^fc00:|^fe80:/i.test(hostname)) return true;
  return false;
}

function isAllowedUrl(urlString: string): { ok: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "Unsupported protocol" };
  }

  if (parsed.protocol === "http:") {
    return { ok: false, reason: "Insecure protocol not allowed" };
  }

  if (isPrivateOrReservedHost(parsed)) {
    return { ok: false, reason: "Private/internal destination blocked" };
  }

  if (parsed.port && parsed.port !== "443") {
    return { ok: false, reason: "Non-standard port blocked" };
  }

  const hostname = parsed.hostname;
  const allowed = ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  if (!allowed) {
    return { ok: false, reason: "Host not on proxy whitelist" };
  }

  return { ok: true };
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const validation = isAllowedUrl(url);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "Accept": "audio/mpeg,*/*" },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status }
      );
    }

    const contentLength = res.headers.get("content-length");
    const length = contentLength ? parseInt(contentLength, 10) : NaN;
    if (!isNaN(length) && length > MAX_PROXY_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const headers = new Headers();
    const contentType = res.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, max-age=3600");

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
