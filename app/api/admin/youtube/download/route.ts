import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const resp = await fetch(`${processingUrl}/youtube/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        userId: session.userId,
      }),
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    console.error("[POST /api/admin/youtube/download] proxy error:", err);
    return NextResponse.json(
      { error: "Processing service unavailable", detail: err?.message || String(err) },
      { status: 502 }
    );
  }
}
