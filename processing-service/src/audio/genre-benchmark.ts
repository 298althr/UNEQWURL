/**
 * Genre-aware benchmark generator using libsonare mastering presets.
 */
import type { AnalysisResult } from "./libsonare-analyzer";
import type { AudioFeatures } from "./librosa-bridge";
import type { EQSettings } from "../types";
import type { ReferenceComparison, SpectralBalance } from "./reference-analysis";

export type ListeningContext = "headphone" | "studio" | "live";

export interface GenreMatch {
  genre: string;
  preset: string;
  confidence: number;
}

export interface ContextBenchmark {
  settings: EQSettings;
  weights: EQSettings;
  qualityScore: number;
  notes: string[];
}

export interface BenchmarkResult {
  detected_genre: string;
  genre_confidence: number;
  genre_alternatives: GenreMatch[];
  mastering_preset: string;
  benchmarks: Record<ListeningContext, ContextBenchmark>;
  optimal_eq: Record<ListeningContext, EQSettings>;
  platform_targets: Record<string, number>;
  quality_score_headphone: number;
  quality_score_studio: number;
  quality_score_live: number;
  reference_comparison?: ReferenceComparison;
  reference_track_title?: string;
}

export interface GenreHint {
  upload_type?: string;
  declared_genre?: string;
  title?: string;
}

interface GenreProfile {
  genre: string;
  preset: string;
  bpmRange: [number, number];
  centroidRange: [number, number];
  flatnessRange: [number, number];
  percussiveRatio: number;
  weights?: { bpm?: number; centroid?: number; flatness?: number; percussive?: number };
  hintOnly?: boolean;
}

const GENRE_PROFILES: GenreProfile[] = [
  { genre: "techno", preset: "techno", bpmRange: [120, 150], centroidRange: [2000, 6000], flatnessRange: [0.05, 0.4], percussiveRatio: 0.5 },
  { genre: "edm", preset: "edm", bpmRange: [124, 134], centroidRange: [3000, 7000], flatnessRange: [0.03, 0.3], percussiveRatio: 0.45 },
  { genre: "deepHouse", preset: "edm", bpmRange: [115, 125], centroidRange: [1500, 4500], flatnessRange: [0.02, 0.2], percussiveRatio: 0.4 },
  { genre: "house", preset: "edm", bpmRange: [115, 130], centroidRange: [2000, 5000], flatnessRange: [0.02, 0.25], percussiveRatio: 0.4 },
  { genre: "trance", preset: "trance", bpmRange: [130, 145], centroidRange: [3000, 7000], flatnessRange: [0.03, 0.25], percussiveRatio: 0.45 },
  { genre: "drumAndBass", preset: "drumAndBass", bpmRange: [160, 180], centroidRange: [2500, 6000], flatnessRange: [0.05, 0.3], percussiveRatio: 0.6 },
  { genre: "trap", preset: "trap", bpmRange: [130, 160], centroidRange: [2000, 5000], flatnessRange: [0.03, 0.25], percussiveRatio: 0.6 },
  { genre: "lofi", preset: "lofi", bpmRange: [60, 90], centroidRange: [1000, 3000], flatnessRange: [0.05, 0.3], percussiveRatio: 0.3 },
  { genre: "amapiano", preset: "edm", bpmRange: [108, 120], centroidRange: [1500, 5000], flatnessRange: [0.02, 0.15], percussiveRatio: 0.45 },
  { genre: "afrobeats", preset: "pop", bpmRange: [100, 115], centroidRange: [1500, 4500], flatnessRange: [0.02, 0.15], percussiveRatio: 0.4 },
  { genre: "hipHop", preset: "hipHop", bpmRange: [70, 100], centroidRange: [1500, 4000], flatnessRange: [0.01, 0.15], percussiveRatio: 0.55 },
  { genre: "rnb", preset: "rnb", bpmRange: [60, 120], centroidRange: [1500, 4500], flatnessRange: [0.01, 0.12], percussiveRatio: 0.35 },
  { genre: "metal", preset: "metal", bpmRange: [100, 200], centroidRange: [2000, 6000], flatnessRange: [0.02, 0.2], percussiveRatio: 0.5 },
  { genre: "rock", preset: "pop", bpmRange: [90, 160], centroidRange: [1500, 4500], flatnessRange: [0.01, 0.15], percussiveRatio: 0.4 },
  { genre: "pop", preset: "pop", bpmRange: [90, 130], centroidRange: [2000, 5000], flatnessRange: [0.01, 0.15], percussiveRatio: 0.4 },
  { genre: "jazz", preset: "jazz", bpmRange: [60, 180], centroidRange: [1000, 3500], flatnessRange: [0.01, 0.12], percussiveRatio: 0.3 },
  { genre: "classical", preset: "classical", bpmRange: [40, 160], centroidRange: [500, 3000], flatnessRange: [0.005, 0.1], percussiveRatio: 0.15 },
  { genre: "acoustic", preset: "acoustic", bpmRange: [60, 140], centroidRange: [1000, 4000], flatnessRange: [0.005, 0.1], percussiveRatio: 0.2 },
  { genre: "ambient", preset: "ambient", bpmRange: [60, 120], centroidRange: [500, 3000], flatnessRange: [0.1, 0.5], percussiveRatio: 0.1 },
  { genre: "worship", preset: "acoustic", bpmRange: [60, 120], centroidRange: [1000, 3500], flatnessRange: [0.005, 0.08], percussiveRatio: 0.2, hintOnly: true },
  { genre: "gospel", preset: "acoustic", bpmRange: [60, 140], centroidRange: [1000, 4000], flatnessRange: [0.005, 0.1], percussiveRatio: 0.25, hintOnly: true },
  { genre: "podcast", preset: "podcast", bpmRange: [0, 0], centroidRange: [300, 2500], flatnessRange: [0, 0.05], percussiveRatio: 0.05,
    weights: { bpm: 0.1, flatness: 3, centroid: 1.5, percussive: 2 } },
  { genre: "speech", preset: "speech", bpmRange: [0, 0], centroidRange: [300, 2500], flatnessRange: [0, 0.05], percussiveRatio: 0.05,
    weights: { bpm: 0.1, flatness: 3, centroid: 1.5, percussive: 2 } },
];

const PLATFORM_TARGETS: Record<string, number> = {
  spotify: -14,
  youtube: -14,
  apple: -16,
  amazon: -24,
  netflix: -27,
  tiktok: -14,
  broadcast: -23,
};

interface ContextAdjustment {
  lowBoost: number;
  highCut: number;
  midBoost: number;
  gainOffset: number;
}

const CONTEXT_ADJUSTMENTS: Record<ListeningContext, ContextAdjustment> = {
  headphone: { lowBoost: 1, highCut: 0, midBoost: 0, gainOffset: 0 },
  studio: { lowBoost: 0, highCut: 0, midBoost: 0, gainOffset: 0 },
  live: { lowBoost: 2, highCut: -2, midBoost: 1, gainOffset: 1.5 },
};

const clamp = (v: number) => Math.max(-12, Math.min(12, Math.round(v * 10) / 10));

function isLikelySpeech(analysis: AnalysisResult, features: AudioFeatures): boolean {
  const flatness = analysis.spectral_flatness || 0;
  const totalEnergy = features.harmonic_energy + features.percussive_energy || 1;
  const percussiveRatio = features.percussive_energy / totalEnergy;
  const centroid = analysis.spectral_centroid_hz || 0;

  if (flatness < 0.01 && percussiveRatio < 0.15 && centroid < 3000) return true;
  if (flatness < 0.005 && centroid < 3500) return true;
  return false;
}

export function detectGenre(
  analysis: AnalysisResult,
  features: AudioFeatures,
  hint?: GenreHint
): { genre: string; preset: string; confidence: number; alternatives: GenreMatch[] } {
  const bpm = features.bpm || 0;
  const centroid = analysis.spectral_centroid_hz || 0;
  const flatness = analysis.spectral_flatness || 0;
  const totalEnergy = features.harmonic_energy + features.percussive_energy || 1;
  const percussiveRatio = features.percussive_energy / totalEnergy;

  const speechLike = isLikelySpeech(analysis, features);

  let hintBoost: Record<string, number> = {};
  if (hint?.upload_type === "podcast") {
    hintBoost = { podcast: 2.0, speech: 1.5 };
  } else if (hint?.upload_type === "live") {
    hintBoost = { acoustic: 0.3 };
  }

  if (hint?.declared_genre) {
    const dg = hint.declared_genre.toLowerCase();
    for (const profile of GENRE_PROFILES) {
      if (profile.hintOnly) continue;
      if (dg.includes(profile.genre.toLowerCase()) || profile.genre.toLowerCase().includes(dg)) {
        hintBoost[profile.genre] = (hintBoost[profile.genre] || 0) + 0.5;
      }
    }
    if (dg.includes("house") || dg.includes("deep")) hintBoost["deepHouse"] = (hintBoost["deepHouse"] || 0) + 0.5;
    if (dg.includes("amap")) hintBoost["amapiano"] = (hintBoost["amapiano"] || 0) + 0.5;
    if (dg.includes("afro")) hintBoost["afrobeats"] = (hintBoost["afrobeats"] || 0) + 0.5;
  }

  if (hint?.title) {
    const t = hint.title.toLowerCase();
    if (t.includes("amap")) hintBoost["amapiano"] = (hintBoost["amapiano"] || 0) + 3.0;
    if (t.includes("worship") || t.includes("gospel") || t.includes("church") || t.includes("god") || t.includes("jesus") || t.includes("dunsin")) hintBoost["worship"] = (hintBoost["worship"] || 0) + 2.0;
    if (t.includes("house")) hintBoost["deepHouse"] = (hintBoost["deepHouse"] || 0) + 2.0;
    if (t.includes("techno")) hintBoost["techno"] = (hintBoost["techno"] || 0) + 2.0;
    if (t.includes("podcast") || t.includes("poju") || t.includes("sermon") || t.includes("preach")) hintBoost["podcast"] = (hintBoost["podcast"] || 0) + 2.0;
    if (t.includes("escape") && t.includes("deep")) hintBoost["deepHouse"] = (hintBoost["deepHouse"] || 0) + 2.0;
    if (t.includes("heaven")) hintBoost["worship"] = (hintBoost["worship"] || 0) + 1.5;
    if (t.includes("love song")) hintBoost["rnb"] = (hintBoost["rnb"] || 0) + 1.5;
  }

  const skipSpeechOverride = hint?.upload_type === "music" || hint?.upload_type === "live";

  const scores: GenreMatch[] = [];

  for (const profile of GENRE_PROFILES) {
    if (profile.hintOnly && !hintBoost[profile.genre]) continue;

    let score = 0;
    let totalWeight = 0;

    const w = profile.weights || {};
    const bpmW = w.bpm ?? 1;
    const centroidW = w.centroid ?? 1;
    const flatnessW = w.flatness ?? 1;
    const percussiveW = w.percussive ?? 1;

    if (profile.bpmRange[1] > 0) {
      if (bpm >= profile.bpmRange[0] && bpm <= profile.bpmRange[1]) {
        score += 1 * bpmW;
      } else {
        const dist = bpm < profile.bpmRange[0] ? profile.bpmRange[0] - bpm : bpm - profile.bpmRange[1];
        score += Math.max(0, 1 - dist / 30) * bpmW;
      }
    } else {
      if (speechLike) {
        score += 1 * bpmW;
      } else if (bpm > 20) {
        score += 0.1 * bpmW;
      } else {
        score += 0.5 * bpmW;
      }
    }
    totalWeight += bpmW;

    if (centroid >= profile.centroidRange[0] && centroid <= profile.centroidRange[1]) {
      score += 1 * centroidW;
    } else {
      const dist = centroid < profile.centroidRange[0] ? profile.centroidRange[0] - centroid : centroid - profile.centroidRange[1];
      score += Math.max(0, 1 - dist / 3000) * centroidW;
    }
    totalWeight += centroidW;

    const [fMin, fMax] = profile.flatnessRange;
    if (flatness >= fMin && flatness <= fMax) {
      score += 1 * flatnessW;
    } else {
      const dist = flatness < fMin ? fMin - flatness : flatness - fMax;
      score += Math.max(0, 1 - dist / 0.15) * flatnessW;
    }
    totalWeight += flatnessW;

    const percDist = Math.abs(percussiveRatio - profile.percussiveRatio);
    score += Math.max(0, 1 - percDist / 0.3) * percussiveW;
    totalWeight += percussiveW;

    if (hintBoost[profile.genre]) {
      score += hintBoost[profile.genre] * totalWeight / 4;
    }

    if (speechLike && !skipSpeechOverride && profile.genre !== "podcast" && profile.genre !== "speech") {
      score *= 0.3;
    }

    const confidence = score / totalWeight;
    scores.push({ genre: profile.genre, preset: profile.preset, confidence });
  }

  scores.sort((a, b) => b.confidence - a.confidence);
  const best = scores[0];

  return {
    genre: best.genre,
    preset: best.preset,
    confidence: best.confidence,
    alternatives: scores.slice(1, 4),
  };
}

const GENRE_EQ_TARGETS: Record<string, {
  lowOffset: number;
  eq298Offset: number;
  highOffset: number;
  lufsTarget: number;
}> = {
  techno:      { lowOffset: 7,  eq298Offset: -2, highOffset: -4, lufsTarget: -9 },
  edm:         { lowOffset: 6,  eq298Offset: -2, highOffset: -3, lufsTarget: -8 },
  deepHouse:   { lowOffset: 8,  eq298Offset: -3, highOffset: -5, lufsTarget: -10 },
  house:       { lowOffset: 6,  eq298Offset: -2, highOffset: -4, lufsTarget: -10 },
  trance:      { lowOffset: 5,  eq298Offset: -1, highOffset: -2, lufsTarget: -8 },
  drumAndBass: { lowOffset: 9,  eq298Offset: -3, highOffset: -3, lufsTarget: -9 },
  trap:        { lowOffset: 8,  eq298Offset: -2, highOffset: -4, lufsTarget: -9 },
  lofi:        { lowOffset: 4,  eq298Offset: 0,  highOffset: -8, lufsTarget: -14 },
  amapiano:    { lowOffset: 9,  eq298Offset: -2, highOffset: -5, lufsTarget: -12 },
  afrobeats:   { lowOffset: 7,  eq298Offset: -1, highOffset: -4, lufsTarget: -12 },
  hipHop:      { lowOffset: 7,  eq298Offset: -2, highOffset: -4, lufsTarget: -10 },
  rnb:         { lowOffset: 5,  eq298Offset: -1, highOffset: -3, lufsTarget: -12 },
  metal:       { lowOffset: 4,  eq298Offset: -1, highOffset: -2, lufsTarget: -8 },
  rock:        { lowOffset: 4,  eq298Offset: -1, highOffset: -3, lufsTarget: -10 },
  pop:         { lowOffset: 4,  eq298Offset: -1, highOffset: -3, lufsTarget: -14 },
  jazz:        { lowOffset: 3,  eq298Offset: 0,  highOffset: -4, lufsTarget: -16 },
  classical:   { lowOffset: 2,  eq298Offset: 0,  highOffset: -5, lufsTarget: -20 },
  acoustic:    { lowOffset: 3,  eq298Offset: 0,  highOffset: -4, lufsTarget: -16 },
  ambient:     { lowOffset: 4,  eq298Offset: 0,  highOffset: -6, lufsTarget: -18 },
  worship:     { lowOffset: 4,  eq298Offset: -1, highOffset: -5, lufsTarget: -14 },
  gospel:      { lowOffset: 5,  eq298Offset: -1, highOffset: -4, lufsTarget: -13 },
  podcast:     { lowOffset: 0,  eq298Offset: 0,  highOffset: -2, lufsTarget: -16 },
  speech:      { lowOffset: 0,  eq298Offset: 0,  highOffset: -2, lufsTarget: -16 },
};

export function generateGenreBenchmark(
  analysis: AnalysisResult,
  features: AudioFeatures,
  hint?: GenreHint,
  referenceComparison?: ReferenceComparison | null
): BenchmarkResult {
  const genreMatch = detectGenre(analysis, features, hint);

  let targetLow: number;
  let targetEq298: number;
  let targetHigh: number;
  let targetLufs: number;
  let usingReference = false;

  if (referenceComparison) {
    const refOffsets = referenceComparison.referenceBalance.band_offsets;
    targetLow = refOffsets.low;
    targetEq298 = refOffsets.eq298;
    targetHigh = refOffsets.high;
    targetLufs = referenceComparison.referenceBalance.lufs_integrated;
    usingReference = true;
  } else {
    const targets = GENRE_EQ_TARGETS[genreMatch.genre] || GENRE_EQ_TARGETS["pop"];
    targetLow = targets.lowOffset;
    targetEq298 = targets.eq298Offset;
    targetHigh = targets.highOffset;
    targetLufs = targets.lufsTarget;
  }

  const lufsDev = analysis.lufs_integrated - targetLufs;

  const contrast = analysis.spectral_contrast;
  const lowEnergy = contrast[0] || 0;
  const lowMidEnergy = contrast[1] || 0;
  const midHighEnergy = contrast[3] || 0;
  const highEnergy = contrast[5] || 0;

  const refDb = midHighEnergy;
  const actualLowOffset = lowEnergy - refDb;
  const actualEq298Offset = lowMidEnergy - refDb;
  const actualHighOffset = highEnergy - refDb;

  const generateContextBenchmark = (ctx: ListeningContext): ContextBenchmark => {
    const adj = CONTEXT_ADJUSTMENTS[ctx];
    const ctxNotes: string[] = [];

    let low = clamp(targetLow - actualLowOffset + adj.lowBoost);
    let eq298 = clamp(targetEq298 - actualEq298Offset);
    let mid = adj.midBoost;
    let high = clamp(targetHigh - actualHighOffset + adj.highCut);
    let gain = clamp(-lufsDev * 0.5 + adj.gainOffset);

    if (ctx === "headphone") {
      low = clamp(low + 0.5);
      if (analysis.spectral_centroid_hz > 5000) {
        high = clamp(high - 1);
        ctxNotes.push("Track is bright — high shelf reduced for headphone comfort");
      }
    } else if (ctx === "live") {
      if (actualHighOffset > -2) {
        high = clamp(high - 2);
        ctxNotes.push("High energy detected — reduced for live PA protection");
      }
    } else if (ctx === "studio") {
      low = Math.round(low * 0.7 * 10) / 10;
      mid = Math.round(mid * 0.7 * 10) / 10;
      high = Math.round(high * 0.7 * 10) / 10;
      eq298 = Math.round(eq298 * 0.7 * 10) / 10;
    }

    const lowErr = Math.abs(actualLowOffset - targetLow);
    const eq298Err = Math.abs(actualEq298Offset - targetEq298);
    const highErr = Math.abs(actualHighOffset - targetHigh);
    const lufsErr = Math.abs(lufsDev);

    const bandPenalty = Math.min((lowErr + eq298Err + highErr) * 1.5, 60);
    const lufsPenalty = Math.min(lufsErr * 1.5, 15);
    const crestPenalty = analysis.crest_factor_db > 15 ? 8 : 0;
    const clipPenalty = analysis.clipping_detected ? 8 : 0;

    const totalPenalty = bandPenalty + lufsPenalty + crestPenalty + clipPenalty;
    const qualityScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

    if (usingReference && referenceComparison) {
      ctxNotes.push(`Genre: ${genreMatch.genre} (${(genreMatch.confidence * 100).toFixed(0)}% match) — compared against reference: "${referenceComparison.reference.title}"`);
      ctxNotes.push(`Reference match score: ${referenceComparison.matchScore}/100`);
    } else {
      ctxNotes.push(`Genre: ${genreMatch.genre} (${(genreMatch.confidence * 100).toFixed(0)}% match) — preset: ${genreMatch.preset}`);
    }
    if (lowErr > 3) ctxNotes.push(`Low end: ${actualLowOffset > targetLow ? "too heavy" : "too thin"} for ${genreMatch.genre} (offset ${actualLowOffset.toFixed(1)}dB vs target ${targetLow.toFixed(1)}dB)`);
    if (highErr > 3) ctxNotes.push(`High end: ${actualHighOffset > targetHigh ? "too harsh" : "too dull"} for ${genreMatch.genre} (offset ${actualHighOffset.toFixed(1)}dB vs target ${targetHigh.toFixed(1)}dB)`);
    if (eq298Err > 3) ctxNotes.push(`298Hz: ${actualEq298Offset > targetEq298 ? "muddy" : "scooped"} — ${actualEq298Offset > targetEq298 ? "cut" : "boost"} recommended`);
    if (lufsErr > 2) ctxNotes.push(`Loudness: ${analysis.lufs_integrated.toFixed(1)} LUFS vs ${targetLufs} target — ${lufsDev > 0 ? "reduce" : "increase"} gain`);
    if (analysis.clipping_detected) ctxNotes.push(`Clipping detected (${analysis.clipping_samples} samples) — reduce levels`);
    if (analysis.crest_factor_db > 15) ctxNotes.push("High crest factor — dynamics may need compression");
    if (features.bpm > 0) ctxNotes.push(`BPM: ${features.bpm.toFixed(1)}, Key: ${features.musical_key} ${features.key_mode}`);

    const totalErr = lowErr + eq298Err + highErr + lufsErr + 1;
    const weights: EQSettings = {
      low: Math.round((lowErr / totalErr + 0.1) * 100) / 100,
      mid: 0.15,
      high: Math.round((highErr / totalErr + 0.1) * 100) / 100,
      gain: Math.round((lufsErr / totalErr + 0.05) * 100) / 100,
      eq298: Math.round((eq298Err / totalErr + 0.1) * 100) / 100,
    };

    const settings: EQSettings = { low, mid, high, gain, eq298 };
    return { settings, weights, qualityScore, notes: ctxNotes };
  };

  const benchmarks = {
    headphone: generateContextBenchmark("headphone"),
    studio: generateContextBenchmark("studio"),
    live: generateContextBenchmark("live"),
  };

  return {
    detected_genre: genreMatch.genre,
    genre_confidence: genreMatch.confidence,
    genre_alternatives: genreMatch.alternatives,
    mastering_preset: genreMatch.preset,
    benchmarks,
    optimal_eq: {
      headphone: benchmarks.headphone.settings,
      studio: benchmarks.studio.settings,
      live: benchmarks.live.settings,
    },
    platform_targets: PLATFORM_TARGETS,
    quality_score_headphone: benchmarks.headphone.qualityScore,
    quality_score_studio: benchmarks.studio.qualityScore,
    quality_score_live: benchmarks.live.qualityScore,
    reference_comparison: referenceComparison || undefined,
    reference_track_title: referenceComparison?.reference.title,
  };
}
