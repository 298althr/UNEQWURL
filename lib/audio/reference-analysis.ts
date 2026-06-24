/**
 * Reference-track spectral balance extraction and comparison.
 *
 * Phase 2.5: Instead of hardcoded EQ targets per genre, we analyze
 * professionally mixed reference tracks and use their actual spectral
 * balance as the EQ target. A student's track is then compared against
 * the reference to determine EQ corrections.
 */
import type { AnalysisResult } from "./libsonare-analyzer";
import type { AudioFeatures } from "./librosa-bridge";
import { query } from "@/lib/db";

// --- Types ---

export interface SpectralBalance {
  contrast: number[];              // 7-band spectral contrast means
  centroid_hz: number;
  flatness: number;
  lufs_integrated: number;
  rms_db: number;
  peak_db: number;
  crest_factor_db: number;
  dynamic_range: number;
  band_offsets: {
    low: number;                   // contrast[0] - contrast[3] (sub bass vs mid)
    eq298: number;                 // contrast[1] - contrast[3] (low mid vs mid)
    mid: number;                   // 0 (reference point)
    high: number;                  // contrast[5] - contrast[3] (high vs mid)
  };
}

export interface ReferenceTrack {
  id: string;
  genre: string;
  title: string;
  artist: string | null;
  spectral_balance: SpectralBalance | null;
  is_active: boolean;
  notes: string | null;
}

export interface ReferenceComparison {
  reference: ReferenceTrack;
  studentBalance: SpectralBalance;
  referenceBalance: SpectralBalance;
  // Deviations (student - reference), positive = student has more
  deviations: {
    low: number;
    eq298: number;
    high: number;
    lufs: number;
    centroid: number;
  };
  // Recommended EQ corrections to bring student closer to reference
  corrections: {
    low: number;
    eq298: number;
    high: number;
    gain: number;
  };
  // 0-100, higher = closer to reference
  matchScore: number;
}

// --- Spectral balance extraction ---

/**
 * Extract spectral balance from an AnalysisResult.
 * This is the "sonic fingerprint" we use for comparison.
 */
export function extractSpectralBalance(analysis: AnalysisResult): SpectralBalance {
  const contrast = analysis.spectral_contrast || new Array(7).fill(0);

  // Use band 3 (mid) as reference point
  const midRef = contrast[3] || 0;

  return {
    contrast,
    centroid_hz: analysis.spectral_centroid_hz,
    flatness: analysis.spectral_flatness,
    lufs_integrated: analysis.lufs_integrated,
    rms_db: analysis.rms_db,
    peak_db: analysis.peak_db,
    crest_factor_db: analysis.crest_factor_db,
    dynamic_range: analysis.dynamic_range,
    band_offsets: {
      low: (contrast[0] || 0) - midRef,
      eq298: (contrast[1] || 0) - midRef,
      mid: 0,
      high: (contrast[5] || 0) - midRef,
    },
  };
}

// --- Reference comparison ---

/**
 * Compare a student track's spectral balance against a reference track.
 * Returns deviations, recommended corrections, and a match score.
 */
export function compareAgainstReference(
  studentAnalysis: AnalysisResult,
  reference: ReferenceTrack
): ReferenceComparison | null {
  if (!reference.spectral_balance) return null;

  const studentBalance = extractSpectralBalance(studentAnalysis);
  const refBalance = reference.spectral_balance;

  // Deviations: positive = student has MORE energy in that band than reference
  const deviations = {
    low: studentBalance.band_offsets.low - refBalance.band_offsets.low,
    eq298: studentBalance.band_offsets.eq298 - refBalance.band_offsets.eq298,
    high: studentBalance.band_offsets.high - refBalance.band_offsets.high,
    lufs: studentBalance.lufs_integrated - refBalance.lufs_integrated,
    centroid: studentBalance.centroid_hz - refBalance.centroid_hz,
  };

  // Corrections: if student has MORE low than reference, CUT low (negative correction)
  // If student has LESS low than reference, BOOST low (positive correction)
  const clamp = (v: number) => Math.max(-12, Math.min(12, Math.round(v * 10) / 10));
  const corrections = {
    low: clamp(-deviations.low),
    eq298: clamp(-deviations.eq298),
    high: clamp(-deviations.high),
    gain: clamp(-deviations.lufs * 0.5),
  };

  // Match score: how close the student is to the reference (0-100)
  const lowErr = Math.abs(deviations.low);
  const eq298Err = Math.abs(deviations.eq298);
  const highErr = Math.abs(deviations.high);
  const lufsErr = Math.abs(deviations.lufs);
  const centroidErr = Math.min(Math.abs(deviations.centroid) / 1000, 5);

  const totalError = lowErr * 1.5 + eq298Err * 1.2 + highErr * 1.5 + lufsErr * 0.8 + centroidErr * 0.5;
  const matchScore = Math.max(0, Math.min(100, Math.round(100 - totalError * 3)));

  return {
    reference,
    studentBalance,
    referenceBalance: refBalance,
    deviations,
    corrections,
    matchScore,
  };
}

// --- DB operations ---

/**
 * Get the active reference track for a genre.
 */
export async function getReferenceForGenre(genre: string): Promise<ReferenceTrack | null> {
  const { rows } = await query<ReferenceTrack>(
    `SELECT id, genre, title, artist, spectral_balance, is_active, notes
     FROM reference_tracks
     WHERE genre = $1 AND is_active = true
     LIMIT 1`,
    [genre]
  );
  return rows[0] || null;
}

/**
 * Get all reference tracks (optionally only active ones).
 */
export async function getAllReferences(activeOnly = true): Promise<ReferenceTrack[]> {
  const sql = activeOnly
    ? `SELECT id, genre, title, artist, spectral_balance, is_active, notes
       FROM reference_tracks WHERE is_active = true ORDER BY genre`
    : `SELECT id, genre, title, artist, spectral_balance, is_active, notes
       FROM reference_tracks ORDER BY genre, is_active DESC`;
  const { rows } = await query<ReferenceTrack>(sql);
  return rows;
}

/**
 * Store or update a reference track's spectral balance.
 * If a reference already exists for this genre, deactivate the old one.
 */
export async function upsertReferenceTrack(params: {
  genre: string;
  title: string;
  artist?: string;
  b2_file_name?: string;
  file_url?: string;
  spectral_balance?: SpectralBalance;
  notes?: string;
}): Promise<ReferenceTrack> {
  const { genre, title, artist, b2_file_name, file_url, spectral_balance, notes } = params;

  // Deactivate existing active reference for this genre
  await query(
    `UPDATE reference_tracks SET is_active = false, updated_at = now() WHERE genre = $1 AND is_active = true`,
    [genre]
  );

  // Insert new reference
  const { rows } = await query<ReferenceTrack>(
    `INSERT INTO reference_tracks (genre, title, artist, b2_file_name, file_url, spectral_balance, notes, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id, genre, title, artist, spectral_balance, is_active, notes`,
    [genre, title, artist || null, b2_file_name || null, file_url || null,
     spectral_balance ? JSON.stringify(spectral_balance) : null, notes || null]
  );
  return rows[0];
}

/**
 * Analyze a reference track: decode + libsonare analysis + extract spectral balance.
 */
export async function analyzeReferenceTrack(
  audio: { samples: Float32Array; sampleRate: number; duration: number; channels: number }
): Promise<SpectralBalance> {
  const { analyzeWithLibsonare } = await import("./libsonare-analyzer");
  const { ensureInit } = await import("./libsonare-analyzer");

  await ensureInit();
  const analysis = await analyzeWithLibsonare(audio);
  return extractSpectralBalance(analysis);
}
