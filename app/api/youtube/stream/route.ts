import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const processingUrl = process.env.PROCESSING_SERVICE_URL;
    if (!processingUrl) {
      return NextResponse.json(
        { error: "Processing service is not configured. Set PROCESSING_SERVICE_URL." },
        { status: 503 }
      );
    }

    const resp = await fetch(`${processingUrl}/youtube/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    console.error("[POST /api/youtube/stream] proxy error:", err);
    return NextResponse.json(
      { error: "Processing service unavailable", detail: err?.message || String(err) },
      { status: 502 }
    );
  }
}
