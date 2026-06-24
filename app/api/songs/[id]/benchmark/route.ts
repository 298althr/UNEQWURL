import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import type { EQSettings } from "@/lib/types";

/* GET — fetch benchmark settings for a song or user upload.
 * Optional ?context=headphone|studio|live to get context-specific benchmark.
 * Checks audio_benchmarks table first (new genre-aware data), then falls back
 * to songs table probe_data for backward compatibility. */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const context = url.searchParams.get("context") || "headphone";

    // Determine source: songs or user_uploads
    const { rows: songRows } = await query<{ id: string }>(
      `SELECT id FROM songs WHERE id = $1`, [params.id]
    );
    const source = songRows.length > 0 ? "song" : "upload";

    // Check audio_benchmarks table (new genre-aware data)
    const { rows: bmRows } = await query<{
      detected_genre: string;
      genre_confidence: number;
      mastering_preset: string;
      benchmarks: Record<string, { settings: EQSettings; weights: EQSettings; qualityScore: number; notes: string[] }>;
      optimal_eq: Record<string, EQSettings>;
      quality_score_headphone: number;
      quality_score_studio: number;
      quality_score_live: number;
      reference_comparison: any;
      reference_track_title: string | null;
    }>(
      `SELECT detected_genre, genre_confidence, mastering_preset,
              benchmarks, optimal_eq,
              quality_score_headphone, quality_score_studio, quality_score_live,
              reference_comparison, reference_track_title
       FROM audio_benchmarks WHERE track_id = $1 AND track_source = $2`,
      [params.id, source]
    );

    if (bmRows.length > 0) {
      const bm = bmRows[0];
      const ctxData = bm.benchmarks?.[context];
      const qualityScore = context === "headphone" ? bm.quality_score_headphone
        : context === "studio" ? bm.quality_score_studio
        : bm.quality_score_live;

      return NextResponse.json({
        benchmark_settings: ctxData?.settings || bm.optimal_eq?.[context] || null,
        benchmark_weights: ctxData?.weights || null,
        benchmark_ready: true,
        context,
        qualityScore: qualityScore ?? ctxData?.qualityScore,
        quality_score_studio: bm.quality_score_studio,
        detected_genre: bm.detected_genre,
        genre_confidence: bm.genre_confidence,
        mastering_preset: bm.mastering_preset,
        notes: ctxData?.notes || [],
        all_contexts: bm.benchmarks,
        reference_comparison: bm.reference_comparison || null,
        reference_track_title: bm.reference_track_title || null,
        benchmarks: bm.benchmarks,
      });
    }

    // Fall back to songs table probe_data (backward compat)
    if (source === "song") {
      const { rows } = await query<{
        benchmark_settings: EQSettings | null;
        benchmark_weights: EQSettings | null;
        benchmark_ready: boolean;
        probe_data: { contexts?: Record<string, { settings: EQSettings; weights: EQSettings; qualityScore: number }> } | null;
      }>(
        `SELECT benchmark_settings, benchmark_weights, benchmark_ready, probe_data
         FROM songs WHERE id = $1`,
        [params.id]
      );

      if (rows.length > 0) {
        const row = rows[0];
        if (row.probe_data?.contexts?.[context]) {
          const ctxData = row.probe_data.contexts[context];
          return NextResponse.json({
            benchmark_settings: ctxData.settings,
            benchmark_weights: ctxData.weights,
            benchmark_ready: true,
            context,
            qualityScore: ctxData.qualityScore,
          });
        }
        return NextResponse.json({ ...row, context });
      }
    }

    // Check user_uploads analysis_status
    if (source === "upload") {
      const { rows: uploadRows } = await query<{ analysis_status: string }>(
        `SELECT analysis_status FROM user_uploads WHERE id = $1`,
        [params.id]
      );
      if (uploadRows.length > 0) {
        return NextResponse.json({
          benchmark_settings: null,
          benchmark_weights: null,
          benchmark_ready: uploadRows[0].analysis_status === 'ready',
          analysis_status: uploadRows[0].analysis_status,
          context,
        });
      }
    }

    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  } catch (err: any) {
    console.error("[GET /api/songs/[id]/benchmark] error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
