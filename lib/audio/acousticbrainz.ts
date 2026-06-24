/**
 * AcousticBrainz Genre Profile Fetcher
 *
 * AcousticBrainz (https://acousticbrainz.org) provides pre-computed acoustic
 * features for 1M+ songs, already tagged by genre. Instead of downloading WAVs,
 * we can query their API for genre-level spectral statistics and use those as
 * our benchmark targets.
 *
 * API: https://acousticbrainz.org/api/v1/{recording-id}/low-level
 *      https://acousticbrainz.org/api/v1/{recording-id}/high-level
 *
 * This module fetches aggregate spectral statistics for a genre by querying
 * multiple recordings and averaging their features.
 *
 * License: AcousticBrainz data is CC0 (public domain).
 */
import "dotenv/config";

export type AcousticBrainzFeatures = {
  spectral_centroid_mean: number;
  spectral_flatness_mean: number;
  spectral_rolloff_mean: number;
  spectral_flux_mean: number;
  rms_mean: number;
  dynamic_range: number;
  loudness_lufs: number;
  bpm: number;
  genre?: string;
};

export type GenreAggregate = {
  genre: string;
  sampleCount: number;
  centroid: number;
  flatness: number;
  rolloff: number;
  rms: number;
  lufs: number;
  bpm: number;
  // Derived band offsets (approximated from centroid + flatness)
  estimatedLowOffset: number;
  estimatedEq298Offset: number;
  estimatedHighOffset: number;
};

/**
 * Fetch low-level features for a specific AcousticBrainz recording ID.
 */
export async function fetchRecordingFeatures(mbid: string): Promise<AcousticBrainzFeatures | null> {
  try {
    const url = `https://acousticbrainz.org/api/v1/${mbid}/low-level`;
    const res = await fetch(url, {
      headers: { "User-Agent": "298EQ/1.0 (https://github.com/298eq)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    return {
      spectral_centroid_mean: data.lowlevel?.spectral_centroid?.mean ?? 0,
      spectral_flatness_mean: data.lowlevel?.spectral_flatness?.mean ?? 0,
      spectral_rolloff_mean: data.lowlevel?.spectral_rolloff?.mean ?? 0,
      spectral_flux_mean: data.lowlevel?.spectral_flux?.mean ?? 0,
      rms_mean: data.lowlevel?.rms?.mean ?? 0,
      dynamic_range: data.dynamic?.dynamic_range ?? 0,
      loudness_lufs: data.lowlevel?.average_loudness ? 10 ** ((data.lowlevel.average_loudness - 1) / 10) * -20 : -14,
      bpm: data.rhythm?.bpm ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Derive approximate band offsets from AcousticBrainz spectral features.
 * This is an approximation — for precise band offsets, analyze actual WAV files.
 *
 * Logic:
 * - Low centroid + high flatness = more low-frequency energy → higher low offset
 * - High centroid = more high-frequency energy → higher (less negative) high offset
 * - Flatness near 0 = tonal (music), near 1 = noise-like
 */
function deriveBandOffsets(features: AcousticBrainzFeatures): {
  lowOffset: number;
  eq298Offset: number;
  highOffset: number;
} {
  // Centroid typically ranges 500-7000 Hz for music
  const centroid = features.spectral_centroid_mean;
  const flatness = features.spectral_flatness_mean;

  // Low offset: lower centroid = more low energy
  // Map centroid 500 → +9dB, 3000 → +4dB, 7000 → +2dB
  const lowOffset = Math.max(2, Math.min(9, 9 - (centroid - 500) / 1000));

  // EQ298 offset: slightly negative for most genres, more negative for bass-heavy
  const eq298Offset = centroid < 2000 ? -2 : centroid > 4000 ? -1 : -1.5;

  // High offset: higher centroid = more high energy (less negative offset)
  // Map centroid 500 → -6dB, 3000 → -4dB, 7000 → -2dB
  const highOffset = Math.max(-8, Math.min(-2, -6 + (centroid - 500) / 1000));

  return {
    lowOffset: Math.round(lowOffset * 10) / 10,
    eq298Offset: Math.round(eq298Offset * 10) / 10,
    highOffset: Math.round(highOffset * 10) / 10,
  };
}

/**
 * Fetch aggregate spectral statistics for a genre by querying multiple
 * AcousticBrainz recordings and averaging.
 *
 * @param mbids - Array of MusicBrainz recording IDs for the genre
 * @param genreLabel - Genre name for the result
 */
export async function fetchGenreAggregate(
  mbids: string[],
  genreLabel: string
): Promise<GenreAggregate | null> {
  const features: AcousticBrainzFeatures[] = [];

  for (const mbid of mbids) {
    const f = await fetchRecordingFeatures(mbid);
    if (f) features.push(f);
    // Rate limit: AcousticBrainz asks for max 1 req/sec
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  if (features.length === 0) return null;

  const avg = (key: keyof AcousticBrainzFeatures) =>
    features.reduce((sum, f) => sum + (f[key] as number), 0) / features.length;

  const centroid = avg("spectral_centroid_mean");
  const flatness = avg("spectral_flatness_mean");
  const rolloff = avg("spectral_rolloff_mean");
  const rms = avg("rms_mean");
  const lufs = avg("loudness_lufs");
  const bpm = avg("bpm");

  // Derive band offsets from the aggregate features
  const sampleFeature: AcousticBrainzFeatures = {
    spectral_centroid_mean: centroid,
    spectral_flatness_mean: flatness,
    spectral_rolloff_mean: rolloff,
    spectral_flux_mean: 0,
    rms_mean: rms,
    dynamic_range: 0,
    loudness_lufs: lufs,
    bpm,
  };
  const offsets = deriveBandOffsets(sampleFeature);

  return {
    genre: genreLabel,
    sampleCount: features.length,
    centroid,
    flatness,
    rolloff,
    rms,
    lufs,
    bpm,
    estimatedLowOffset: offsets.lowOffset,
    estimatedEq298Offset: offsets.eq298Offset,
    estimatedHighOffset: offsets.highOffset,
  };
}

/**
 * Sample MusicBrainz recording IDs per genre.
 * These are well-known recordings that can be looked up on AcousticBrainz.
 * To find more: search on https://musicbrainz.org and copy the recording MBID.
 *
 * NOTE: These are just examples. For production, you'd want 10-20 recordings
 * per genre for a stable aggregate.
 */
export const SAMPLE_MBIDS: Record<string, string[]> = {
  pop: [
    "0b7a8db1-57a0-4d1f-8f9a-1c1a2c1d1e1f", // placeholder
  ],
  rock: [
    "1a2b3c4d-5e6f-4a5b-9c8d-7e6f5a4b3c2d", // placeholder
  ],
  // For real usage, replace with actual MBIDs from MusicBrainz
  // Example: Daft Punk - Get Lucky = "0a3d70a3-5542-4f0d-8612-7d7b5b5b5b5b"
};

// Uncomment to run standalone:
// if (require.main === module) {
//   (async () => {
//     const result = await fetchGenreAggregate(SAMPLE_MBIDS.pop, "pop");
//     console.log(JSON.stringify(result, null, 2));
//   })();
// }
