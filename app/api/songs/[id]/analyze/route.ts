import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const processingUrl = process.env.PROCESSING_SERVICE_URL;
    if (!processingUrl) {
      return NextResponse.json(
        { error: "Processing service is not configured. Set PROCESSING_SERVICE_URL." },
        { status: 503 }
      );
    }

    const body = await safeJsonBody(req);
    const source = body?.source || "song";

    const resp = await fetch(`${processingUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: params.id,
        source,
      }),
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    console.error("[POST /api/songs/[id]/analyze] proxy error:", err);
    return NextResponse.json(
      { error: "Processing service unavailable", detail: err?.message || String(err) },
      { status: 502 }
    );
  }
}
