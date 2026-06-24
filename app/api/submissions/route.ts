import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { safeJsonBody } from "@/lib/body-parser";
import { query } from "@/lib/db";
import { computeScore, isValidSettings } from "@/lib/scoring";
import type { EQSettings, SubmissionResult } from "@/lib/types";

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
    const songId = body.song_id ? String(body.song_id) : null;
    const uploadId = body.upload_id ? String(body.upload_id) : null;
    const settings = body.settings;
    const controlsLog = body.controls_log ?? null;

    if (!isValidSettings(settings)) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }

    if (!songId && !uploadId) {
      return NextResponse.json({ error: "Missing song_id or upload_id" }, { status: 400 });
    }

    // Auto-resolve: if song_id doesn't exist in songs table, check user_uploads
    let resolvedSongId = songId;
    let resolvedUploadId = uploadId;
    if (songId && !uploadId) {
      const { rows: songCheck } = await query(
        `select 1 from songs where id = $1`,
        [songId]
      );
      if (songCheck.length === 0) {
        const { rows: uploadCheck } = await query(
          `select 1 from user_uploads where id = $1`,
          [songId]
        );
        if (uploadCheck.length > 0) {
          resolvedUploadId = songId;
          resolvedSongId = null;
        }
      }
    }

    let score: number | null = null;
    let scoreBreakdown: Record<string, { diff: number; weighted: number }> | null = null;
    let scoringStatus = "unscored";
    let qualityLabel: string | null = null;

    // Only compute score if submitting against a benchmark-ready song
    if (resolvedSongId) {
      const { rows } = await query<{
        id: string;
        benchmark_settings: EQSettings;
        benchmark_weights: EQSettings;
        analysis_status: string;
      }>(
        `select id, benchmark_settings, benchmark_weights, analysis_status
         from songs where id = $1`,
        [resolvedSongId]
      );

      const song = rows[0];
      if (song && song.analysis_status === 'ready' && song.benchmark_settings) {
        const weights = song.benchmark_weights ?? {
          low: 0.2,
          mid: 0.2,
          high: 0.2,
          gain: 0.2,
          eq298: 0.2,
        };
        const result = computeScore(settings, song.benchmark_settings, weights);
        score = result.score;
        scoreBreakdown = result.breakdown;
        scoringStatus = "scored";
        qualityLabel = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";
      }
    }

    // Also try scoring against upload benchmarks if no song score was computed
    if (score === null && resolvedUploadId) {
      const { rows: bmRows } = await query<{
        optimal_eq: any;
        benchmarks: any;
      }>(
        `SELECT optimal_eq, benchmarks FROM audio_benchmarks WHERE track_id = $1 AND track_source = 'upload'`,
        [resolvedUploadId]
      );

      if (bmRows.length > 0 && bmRows[0].optimal_eq) {
        const optimalEq = bmRows[0].optimal_eq;
        const benchmarkSettings = optimalEq.headphone || optimalEq;
        if (benchmarkSettings && benchmarkSettings.low !== undefined) {
          const eqSettings: EQSettings = {
            low: Number(benchmarkSettings.low),
            mid: Number(benchmarkSettings.mid),
            high: Number(benchmarkSettings.high),
            gain: Number(benchmarkSettings.gain),
            eq298: Number(benchmarkSettings.eq298),
          };
          const weights: EQSettings = {
            low: 0.2, mid: 0.2, high: 0.2, gain: 0.2, eq298: 0.2,
          };
          const result = computeScore(settings, eqSettings, weights);
          score = result.score;
          scoreBreakdown = result.breakdown;
          scoringStatus = "scored";
          qualityLabel = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";
        }
      }
    }

    const { rows: inserted } = await query<SubmissionResult>(
      `insert into submissions (user_id, song_id, upload_id, settings, controls_log, score, score_breakdown, scoring_status, quality_label)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, score, score_breakdown, submitted_at`,
      [
        session.userId,
        resolvedSongId,
        resolvedUploadId,
        JSON.stringify(settings),
        controlsLog ? JSON.stringify(controlsLog) : null,
        score,
        scoreBreakdown ? JSON.stringify(scoreBreakdown) : null,
        scoringStatus,
        qualityLabel,
      ]
    );

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const isAdmin = session.role === "admin";
  const adminParam = url.searchParams.get("admin");
  const viewAll = isAdmin && adminParam !== "false";

  try {
    if (viewAll) {
      const { rows } = await query(
        `select
          sub.id,
          u.username,
          coalesce(s.title, up.title) as audio_title,
          sub.settings,
          sub.controls_log,
          sub.score,
          sub.score_breakdown,
          sub.submitted_at
         from submissions sub
         join users u on sub.user_id = u.id
         left join songs s on sub.song_id = s.id
         left join user_uploads up on sub.upload_id = up.id
         order by sub.submitted_at desc`
      );
      return NextResponse.json(rows);
    }

    const { rows } = await query(
      `select
        sub.id,
        coalesce(s.title, up.title) as audio_title,
        coalesce(s.artist, up.artist) as audio_artist,
        sub.settings,
        sub.controls_log,
        sub.score,
        sub.score_breakdown,
        sub.submitted_at
       from submissions sub
       left join songs s on sub.song_id = s.id
       left join user_uploads up on sub.upload_id = up.id
       where sub.user_id = $1
       order by sub.submitted_at desc`,
      [session.userId]
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Failed to fetch submissions:", err);
    const detail = err?.detail || err?.message || String(err);
    return NextResponse.json(
      { error: "Database query failed", detail },
      { status: 500 }
    );
  }
}
