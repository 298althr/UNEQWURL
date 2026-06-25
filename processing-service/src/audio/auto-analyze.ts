/**
 * Auto-analysis service — runs the full analysis pipeline on a single track.
 */
import { query } from "../db";
import { decodeAudio } from "./decoder";
import { analyzeWithLibsonare, ensureInit } from "./libsonare-analyzer";
import { extractFeaturesWithLibrosa } from "./librosa-bridge";
import { generateGenreBenchmark, detectGenre, type GenreHint } from "./genre-benchmark";
import { getReferenceForGenre, compareAgainstReference } from "./reference-analysis";
import { getDownloadUrl } from "../b2-storage";

interface TrackInfo {
  id: string;
  source: "song" | "upload";
  b2_file_name: string;
  hint?: GenreHint;
}

export async function autoAnalyzeTrack(track: TrackInfo): Promise<boolean> {
  const { id, source, b2_file_name, hint } = track;

  await query(
    `INSERT INTO analysis_queue (track_id, track_source, status, started_at)
     VALUES ($1, $2, 'processing', now())
     ON CONFLICT (track_id, track_source) DO UPDATE SET status = 'processing', started_at = now(), error_message = NULL`,
    [id, source]
  );

  try {
    const url = b2_file_name.startsWith("http") ? b2_file_name : getDownloadUrl(b2_file_name);

    const decoded = decodeAudio(url, 120);

    await ensureInit();
    const analysis = await analyzeWithLibsonare(decoded);

    const features = extractFeaturesWithLibrosa(url, 120);

    let genreHint = hint;
    if (!genreHint && source === "upload") {
      const { rows: hintRows } = await query<{ upload_type: string; genre: string | null; title: string }>(
        `SELECT upload_type, genre, title FROM user_uploads WHERE id = $1`,
        [id]
      );
      if (hintRows.length > 0) {
        genreHint = { upload_type: hintRows[0].upload_type, declared_genre: hintRows[0].genre || undefined, title: hintRows[0].title };
      }
    }

    const genrePreDetect = detectGenre(analysis, features, genreHint);
    const referenceTrack = await getReferenceForGenre(genrePreDetect.genre);
    const referenceComparison = referenceTrack ? compareAgainstReference(analysis, referenceTrack) : null;

    const benchmark = generateGenreBenchmark(analysis, features, genreHint, referenceComparison);

    const analysisRow = await query(
      `INSERT INTO audio_analysis (
        track_id, track_source,
        lufs_integrated, lufs_momentary, lufs_short_term, loudness_range,
        rms_db, peak_db, true_peak_db, crest_factor_db, dynamic_range,
        spectral_centroid_hz, spectral_flatness, spectral_rolloff_hz, spectral_bandwidth, spectral_contrast,
        dc_offset, clipping_detected, clipping_samples,
        stereo_correlation, stereo_width, tuning_deviation,
        spectrum_snapshot, sample_rate, duration_seconds, fft_size
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22,
        $23, $24, $25, $26
      )
      ON CONFLICT (track_id, track_source) DO UPDATE SET
        lufs_integrated = EXCLUDED.lufs_integrated,
        lufs_momentary = EXCLUDED.lufs_momentary,
        lufs_short_term = EXCLUDED.lufs_short_term,
        loudness_range = EXCLUDED.loudness_range,
        rms_db = EXCLUDED.rms_db,
        peak_db = EXCLUDED.peak_db,
        true_peak_db = EXCLUDED.true_peak_db,
        crest_factor_db = EXCLUDED.crest_factor_db,
        dynamic_range = EXCLUDED.dynamic_range,
        spectral_centroid_hz = EXCLUDED.spectral_centroid_hz,
        spectral_flatness = EXCLUDED.spectral_flatness,
        spectral_rolloff_hz = EXCLUDED.spectral_rolloff_hz,
        spectral_bandwidth = EXCLUDED.spectral_bandwidth,
        spectral_contrast = EXCLUDED.spectral_contrast,
        dc_offset = EXCLUDED.dc_offset,
        clipping_detected = EXCLUDED.clipping_detected,
        clipping_samples = EXCLUDED.clipping_samples,
        tuning_deviation = EXCLUDED.tuning_deviation,
        spectrum_snapshot = EXCLUDED.spectrum_snapshot,
        sample_rate = EXCLUDED.sample_rate,
        duration_seconds = EXCLUDED.duration_seconds,
        analyzed_at = now()
      RETURNING id`,
      [
        id, source,
        analysis.lufs_integrated, analysis.lufs_momentary, analysis.lufs_short_term, analysis.loudness_range,
        analysis.rms_db, analysis.peak_db, analysis.true_peak_db, analysis.crest_factor_db, analysis.dynamic_range,
        analysis.spectral_centroid_hz, analysis.spectral_flatness, analysis.spectral_rolloff_hz, analysis.spectral_bandwidth,
        JSON.stringify(analysis.spectral_contrast),
        analysis.dc_offset, analysis.clipping_detected, analysis.clipping_samples,
        analysis.stereo_correlation, analysis.stereo_width, analysis.tuning_deviation,
        JSON.stringify(analysis.spectrum_snapshot),
        analysis.sample_rate, analysis.duration_seconds, analysis.fft_size,
      ]
    );
    const analysisId = (analysisRow.rows[0] as { id: string }).id;

    await query(
      `INSERT INTO audio_features (
        track_id, track_source,
        bpm, bpm_confidence, musical_key, key_mode, key_confidence, key_alternatives,
        chords, sections, timbre,
        harmonic_energy, percussive_energy, residual_energy,
        mfcc_summary, onset_count, onset_density
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17
      )
      ON CONFLICT (track_id, track_source) DO UPDATE SET
        bpm = EXCLUDED.bpm,
        bpm_confidence = EXCLUDED.bpm_confidence,
        musical_key = EXCLUDED.musical_key,
        key_mode = EXCLUDED.key_mode,
        key_confidence = EXCLUDED.key_confidence,
        key_alternatives = EXCLUDED.key_alternatives,
        chords = EXCLUDED.chords,
        sections = EXCLUDED.sections,
        timbre = EXCLUDED.timbre,
        harmonic_energy = EXCLUDED.harmonic_energy,
        percussive_energy = EXCLUDED.percussive_energy,
        residual_energy = EXCLUDED.residual_energy,
        mfcc_summary = EXCLUDED.mfcc_summary,
        onset_count = EXCLUDED.onset_count,
        onset_density = EXCLUDED.onset_density,
        analyzed_at = now()`,
      [
        id, source,
        features.bpm, features.bpm_confidence, features.musical_key, features.key_mode, features.key_confidence,
        JSON.stringify(features.key_alternatives),
        JSON.stringify(features.chords), JSON.stringify(features.sections), JSON.stringify(features.timbre),
        features.harmonic_energy, features.percussive_energy, features.residual_energy,
        JSON.stringify(features.mfcc_summary), features.onset_count, features.onset_density,
      ]
    );

    await query(
      `INSERT INTO audio_benchmarks (
        track_id, track_source,
        detected_genre, genre_confidence, genre_alternatives,
        mastering_preset, benchmarks, optimal_eq, platform_targets,
        quality_score_headphone, quality_score_studio, quality_score_live,
        reference_comparison, reference_track_title,
        analysis_id
      ) VALUES (
        $1, $2,
        $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14,
        $15
      )
      ON CONFLICT (track_id, track_source) DO UPDATE SET
        detected_genre = EXCLUDED.detected_genre,
        genre_confidence = EXCLUDED.genre_confidence,
        genre_alternatives = EXCLUDED.genre_alternatives,
        mastering_preset = EXCLUDED.mastering_preset,
        benchmarks = EXCLUDED.benchmarks,
        optimal_eq = EXCLUDED.optimal_eq,
        platform_targets = EXCLUDED.platform_targets,
        quality_score_headphone = EXCLUDED.quality_score_headphone,
        quality_score_studio = EXCLUDED.quality_score_studio,
        quality_score_live = EXCLUDED.quality_score_live,
        reference_comparison = EXCLUDED.reference_comparison,
        reference_track_title = EXCLUDED.reference_track_title,
        analysis_id = EXCLUDED.analysis_id,
        benchmarked_at = now()`,
      [
        id, source,
        benchmark.detected_genre, benchmark.genre_confidence, JSON.stringify(benchmark.genre_alternatives),
        benchmark.mastering_preset,
        JSON.stringify(benchmark.benchmarks),
        JSON.stringify(benchmark.optimal_eq),
        JSON.stringify(benchmark.platform_targets),
        benchmark.quality_score_headphone, benchmark.quality_score_studio, benchmark.quality_score_live,
        benchmark.reference_comparison ? JSON.stringify(benchmark.reference_comparison) : null,
        benchmark.reference_track_title || null,
        analysisId,
      ]
    );

    if (source === "upload") {
      await query(
        `UPDATE user_uploads SET analysis_ready = true, genre = $1, bpm = $2, musical_key = $3, duration_seconds = $4, analysis_status = 'ready' WHERE id = $5`,
        [benchmark.detected_genre, features.bpm, `${features.musical_key} ${features.key_mode}`, analysis.duration_seconds, id]
      );
    } else if (source === "song") {
      await query(
        `UPDATE songs SET bpm = $1, musical_key = $2, duration_seconds = $3, analysis_status = 'ready' WHERE id = $4`,
        [features.bpm, `${features.musical_key} ${features.key_mode}`, analysis.duration_seconds, id]
      );
    }

    await query(
      `UPDATE analysis_queue SET status = 'complete', completed_at = now() WHERE track_id = $1 AND track_source = $2`,
      [id, source]
    );

    console.log(`[autoAnalyze] ✅ Track ${id} analyzed: genre=${benchmark.detected_genre}, bpm=${features.bpm}`);
    return true;
  } catch (e: any) {
    console.error(`[autoAnalyze] ❌ Track ${id} failed:`, e.message?.slice(0, 200));
    await query(
      `UPDATE analysis_queue SET status = 'failed', error_message = $3, completed_at = now() WHERE track_id = $1 AND track_source = $2`,
      [id, source, e.message?.slice(0, 500)]
    );
    return false;
  }
}
