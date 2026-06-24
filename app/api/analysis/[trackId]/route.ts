import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * GET /api/analysis/[trackId]?source=song|upload
 * Returns full analysis data for a track: audio_analysis + audio_features + audio_benchmarks
 */
export async function GET(
  request: Request,
  { params }: { params: { trackId: string } }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackId } = params;
    const url = new URL(request.url);
    const source = url.searchParams.get("source") || "upload";

    // Fetch analysis
    const { rows: analysisRows } = await query(
      `SELECT * FROM audio_analysis WHERE track_id = $1 AND track_source = $2`,
      [trackId, source]
    );

    // Fetch features
    const { rows: featureRows } = await query(
      `SELECT * FROM audio_features WHERE track_id = $1 AND track_source = $2`,
      [trackId, source]
    );

    // Fetch benchmarks
    const { rows: benchmarkRows } = await query(
      `SELECT * FROM audio_benchmarks WHERE track_id = $1 AND track_source = $2`,
      [trackId, source]
    );

    // Fetch queue status
    const { rows: queueRows } = await query<{ status: string; error_message: string | null }>(
      `SELECT status, error_message FROM analysis_queue WHERE track_id = $1 AND track_source = $2`,
      [trackId, source]
    );

    if (analysisRows.length === 0 && queueRows.length === 0) {
      return NextResponse.json({
        status: "pending",
        analysis: null,
        features: null,
        benchmarks: null,
      });
    }

    const queueStatus = queueRows[0]?.status || "pending";

    return NextResponse.json({
      status: queueStatus,
      error: queueRows[0]?.error_message || null,
      analysis: analysisRows[0] || null,
      features: featureRows[0] || null,
      benchmarks: benchmarkRows[0] || null,
    });
  } catch (err: any) {
    console.error("[GET /api/analysis] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
