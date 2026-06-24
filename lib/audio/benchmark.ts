/**
 * Benchmark generator — derives optimal EQ settings from audio analysis.
 * Three listening contexts: headphone, studio, live.
 *
 * The approach:
 * 1. Analyze the audio's spectral balance (band energies, tilt, centroid)
 * 2. Compare against a target curve for each context
 * 3. Generate EQ settings that would bring the audio closer to the target
 * 4. Also generate per-band weights for scoring
 */
import type { AudioAnalysis } from "./analyzer";
import type { EQSettings } from "@/lib/types";

export type ListeningContext = "headphone" | "studio" | "live";

export interface ContextTarget {
  /** Target dB offset from mid band (positive = band louder than mid) */
  lowOffset: number;
  eq298Offset: number;
  highOffset: number;
  /** Target LUFS range */
  lufsRange: [number, number];
  /** Weight for each EQ band in scoring */
  weights: EQSettings;
}

export interface BenchmarkResult {
  context: ListeningContext;
  settings: EQSettings;       // optimal EQ settings
  weights: EQSettings;        // scoring weights per band
  analysis: AudioAnalysis;
  target: ContextTarget;
  qualityScore: number;       // 0-100, how good the raw audio already is
  notes: string[];            // human-readable analysis notes
}

// --- Target curves per context ---
const clamp = (v: number) => Math.max(-12, Math.min(12, Math.round(v * 10) / 10));

const TARGETS: Record<ListeningContext, ContextTarget> = {
  headphone: {
    lowOffset: 4,
    eq298Offset: -1,
    highOffset: -4,
    lufsRange: [-16, -10],
    weights: { low: 0.25, mid: 0.20, high: 0.25, gain: 0.10, eq298: 0.20 },
  },
  studio: {
    lowOffset: 3,
    eq298Offset: -1,
    highOffset: -3,
    lufsRange: [-20, -14],
    weights: { low: 0.22, mid: 0.22, high: 0.22, gain: 0.12, eq298: 0.22 },
  },
  live: {
    lowOffset: 5,
    eq298Offset: -2,
    highOffset: -6,
    lufsRange: [-14, -8],
    weights: { low: 0.28, mid: 0.25, high: 0.15, gain: 0.10, eq298: 0.22 },
  },
};

/**
 * Generate benchmark EQ settings for a given context from audio analysis.
 */
export function generateBenchmark(
  analysis: AudioAnalysis,
  context: ListeningContext
): BenchmarkResult {
  const target = TARGETS[context];
  const notes: string[] = [];
  const { bands } = analysis;

  // --- Actual dB offsets from mid band ---
  const midDb = bands.mid.energyDb;
  const actualLowOffset = bands.low.energyDb - midDb;
  const actualEq298Offset = bands.eq298.energyDb - midDb;
  const actualHighOffset = bands.high.energyDb - midDb;

  // --- EQ corrections: bring actual offsets closer to target offsets ---
  // If actual low is +20 but target is +4, cut lows by 16 dB (clamped to -12)
  let low = clamp(target.lowOffset - actualLowOffset);
  let eq298 = clamp(target.eq298Offset - actualEq298Offset);
  let high = clamp(target.highOffset - actualHighOffset);

  // Mid: no correction needed (it's the reference)
  let mid = 0;

  // --- Gain correction based on LUFS ---
  const targetLufs = (target.lufsRange[0] + target.lufsRange[1]) / 2;
  const lufsDev = analysis.lufsIntegrated - targetLufs;
  // If too loud → negative gain, if too quiet → positive gain
  let gain = clamp(-lufsDev * 0.5);

  // --- Context-specific adjustments ---
  if (context === "headphone") {
    low = clamp(low + 1);
    if (analysis.spectralCentroid > 4000) {
      high = clamp(high - 1);
      notes.push("Track is bright — high shelf reduced for headphone comfort");
    }
  } else if (context === "live") {
    mid = clamp(mid + 1);
    if (actualHighOffset > -2) {
      high = clamp(high - 2);
      notes.push("High energy detected — reduced for live PA protection");
    }
  } else if (context === "studio") {
    low = Math.round(low * 0.7 * 10) / 10;
    mid = Math.round(mid * 0.7 * 10) / 10;
    high = Math.round(high * 0.7 * 10) / 10;
    eq298 = Math.round(eq298 * 0.7 * 10) / 10;
  }

  // --- Quality score ---
  const lowErr = Math.abs(actualLowOffset - target.lowOffset);
  const eq298Err = Math.abs(actualEq298Offset - target.eq298Offset);
  const highErr = Math.abs(actualHighOffset - target.highOffset);

  // Penalty: 1.5 points per dB off, capped at 60 for bands
  const bandPenalty = Math.min((lowErr + eq298Err + highErr) * 1.5, 60);
  const lufsPenalty = Math.min(Math.abs(lufsDev) * 1.5, 15);
  const crestPenalty = analysis.crestFactor > 15 ? 10 : 0;

  const totalPenalty = bandPenalty + lufsPenalty + crestPenalty;
  const qualityScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  // --- Notes ---
  if (actualLowOffset > target.lowOffset + 3)
    notes.push(`Low frequencies are ${actualLowOffset.toFixed(0)}dB above mids (target: +${target.lowOffset}dB) — bass reduction recommended`);
  if (actualLowOffset < target.lowOffset - 3)
    notes.push(`Low frequencies are thin (${actualLowOffset.toFixed(0)}dB above mids) — bass boost recommended`);
  if (actualHighOffset < target.highOffset - 3)
    notes.push(`High frequencies are dull (${actualHighOffset.toFixed(0)}dB below mids) — treble boost recommended`);
  if (actualHighOffset > target.highOffset + 3)
    notes.push(`High frequencies are harsh (${actualHighOffset.toFixed(0)}dB relative to mids) — treble reduction recommended`);
  if (Math.abs(actualEq298Offset - target.eq298Offset) > 3)
    notes.push(`298Hz region is ${actualEq298Offset > target.eq298Offset ? "elevated" : "scooped"} — ${actualEq298Offset > target.eq298Offset ? "cut" : "boost"} recommended`);
  if (analysis.crestFactor > 15)
    notes.push("High crest factor — dynamics are uneven, may need compression");
  if (analysis.lufsIntegrated < -20)
    notes.push("Track is quiet — gain boost recommended");
  if (analysis.lufsIntegrated > -6)
    notes.push("Track is very loud — may be over-compressed");

  const settings: EQSettings = { low, mid, high, gain, eq298 };

  return {
    context,
    settings,
    weights: target.weights,
    analysis,
    target,
    qualityScore,
    notes,
  };
}

/**
 * Generate benchmarks for all three contexts at once.
 */
export function generateAllBenchmarks(analysis: AudioAnalysis): Record<ListeningContext, BenchmarkResult> {
  return {
    headphone: generateBenchmark(analysis, "headphone"),
    studio: generateBenchmark(analysis, "studio"),
    live: generateBenchmark(analysis, "live"),
  };
}
