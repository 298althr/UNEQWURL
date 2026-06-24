/**
 * Reference-track spectral balance extraction and comparison.
 */
import type { AnalysisResult } from "./libsonare-analyzer";
import type { AudioFeatures } from "./librosa-bridge";
import { query } from "../db";

export interface SpectralBalance {
  contrast: number[];
  centroid_hz: number;
  flatness: number;
  lufs_integrated: number;
  rms_db: number;
  peak_db: number;
  crest_factor_db: number;
  dynamic_range: number;
  band_offsets: {
    low: number;
    eq298: number;
    mid: number;
    high: number;
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
  deviations: {
    low: number;
    eq298: number;
    high: number;
    lufs: number;
    centroid: number;
  };
  corrections: {
    low: number;
    eq298: number;
    high: number;
    gain: number;
  };
  matchScore: number;
}

export function extractSpectralBalance(analysis: AnalysisResult): SpectralBalance {
  const contrast = analysis.spectral_contrast || new Array(7).fill(0);
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

export function compareAgainstReference(
  studentAnalysis: AnalysisResult,
  reference: ReferenceTrack
): ReferenceComparison | null {
  if (!reference.spectral_balance) return null;

  const studentBalance = extractSpectralBalance(studentAnalysis);
  const refBalance = reference.spectral_balance;

  const deviations = {
    low: studentBalance.band_offsets.low - refBalance.band_offsets.low,
    eq298: studentBalance.band_offsets.eq298 - refBalance.band_offsets.eq298,
    high: studentBalance.band_offsets.high - refBalance.band_offsets.high,
    lufs: studentBalance.lufs_integrated - refBalance.lufs_integrated,
    centroid: studentBalance.centroid_hz - refBalance.centroid_hz,
  };

  const clamp = (v: number) => Math.max(-12, Math.min(12, Math.round(v * 10) / 10));
  const corrections = {
    low: clamp(-deviations.low),
    eq298: clamp(-deviations.eq298),
    high: clamp(-deviations.high),
    gain: clamp(-deviations.lufs * 0.5),
  };

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
