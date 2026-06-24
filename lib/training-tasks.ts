/**
 * AdvancedTraining — training task definitions and generators for Phase 5.
 *
 * Modes:
 * 5.1 Genre-aware ear training
 * 5.2 Reference matching tasks
 * 5.3 Problem detection quiz
 * 5.4 Dynamic range training
 * 5.5 Stereo width training
 * 5.6 Mastering chain quiz
 * 5.7 BPM/key-aware tasks
 * 5.8 Streaming platform prep
 */

import type { EQSettings } from "@/lib/types";
import type { ConsoleSettings } from "@/lib/audio-chain";
import { getDefaultConsoleSettings } from "@/lib/audio-chain";

export type TrainingMode =
  | "genre-aware"
  | "reference-match"
  | "problem-detection"
  | "dynamic-range"
  | "stereo-width"
  | "mastering-chain"
  | "bpm-key"
  | "streaming-prep";

export interface TrainingTask {
  id: string;
  mode: TrainingMode;
  prompt: string;
  hint: string;
  // Target settings the student should aim for
  targetEQ: EQSettings;
  targetConsole?: ConsoleSettings;
  // Degraded/starting settings applied to the audio
  degradedEQ: EQSettings;
  degradedConsole?: ConsoleSettings;
  // Scoring weights
  weights: EQSettings;
  // Optional metadata
  genre?: string;
  bpm?: number;
  key?: string;
  platform?: string;
  targetLufs?: number;
  // For problem detection: the problem to identify
  problemType?: "clipping" | "mud" | "harshness" | "resonance" | "thin" | "boxy";
  problemOptions?: string[];
  correctAnswer?: string;
}

const FLAT: EQSettings = { low: 0, mid: 0, high: 0, gain: 0, eq298: 0 };
const DEFAULT_WEIGHTS: EQSettings = { low: 25, mid: 20, high: 20, gain: 10, eq298: 25 };

function baseConsole(): ConsoleSettings {
  return getDefaultConsoleSettings();
}

// ─── 5.1 Genre-Aware Ear Training ───────────────────────────
const GENRE_TASKS: TrainingTask[] = [
  {
    id: "genre-1",
    mode: "genre-aware",
    prompt: "This amapiano track lacks low-end weight. Adjust the EQ to match the genre standard: punchy lows, present mids, sparkling highs.",
    hint: "Amapiano needs +6-9dB low, neutral mids, +3-5dB high. The 298Hz band adds warmth.",
    targetEQ: { low: 7, mid: 0, high: 4, gain: 0, eq298: 3 },
    degradedEQ: { low: -5, mid: 3, high: -2, gain: 0, eq298: -3 },
    weights: { low: 30, mid: 15, high: 20, gain: 5, eq298: 30 },
    genre: "amapiano",
  },
  {
    id: "genre-2",
    mode: "genre-aware",
    prompt: "This worship track sounds harsh and thin. Fix the EQ to match worship genre standards: warm, full, intimate.",
    hint: "Worship needs +3-5dB low, +2dB mid, 0 to +2 high. 298Hz +2-3 for vocal warmth.",
    targetEQ: { low: 4, mid: 2, high: 1, gain: 0, eq298: 2 },
    degradedEQ: { low: -4, mid: -2, high: 8, gain: 0, eq298: -4 },
    weights: { low: 25, mid: 20, high: 20, gain: 5, eq298: 30 },
    genre: "worship",
  },
  {
    id: "genre-3",
    mode: "genre-aware",
    prompt: "This techno track is too warm and muddy. Shape it for techno: tight lows, aggressive mids, extended highs.",
    hint: "Techno: +3dB low, +4dB mid, +5dB high, 298Hz -2 for tightness.",
    targetEQ: { low: 3, mid: 4, high: 5, gain: 0, eq298: -2 },
    degradedEQ: { low: 8, mid: -3, high: -4, gain: 0, eq298: 5 },
    weights: { low: 20, mid: 25, high: 25, gain: 5, eq298: 25 },
    genre: "techno",
  },
  {
    id: "genre-4",
    mode: "genre-aware",
    prompt: "This podcast has excessive low rumble and lacks clarity. Fix it for podcast standards: clean speech, present vocals.",
    hint: "Podcast: -2 to 0 low, +3 mid, +4 high, 298Hz +3 for voice presence.",
    targetEQ: { low: -1, mid: 3, high: 4, gain: 0, eq298: 3 },
    degradedEQ: { low: 6, mid: -3, high: -2, gain: 0, eq298: -4 },
    weights: { low: 25, mid: 20, high: 20, gain: 5, eq298: 30 },
    genre: "podcast",
  },
];

// ─── 5.2 Reference Matching Tasks ───────────────────────────
const REFERENCE_TASKS: TrainingTask[] = [
  {
    id: "ref-1",
    mode: "reference-match",
    prompt: "Match this track to the reference mix. The reference has a balanced warm sound with slight low boost and airy highs.",
    hint: "Target: +3 low, 0 mid, +4 high, 298Hz +2. Listen for the warmth vs clarity balance.",
    targetEQ: { low: 3, mid: 0, high: 4, gain: 0, eq298: 2 },
    degradedEQ: { low: -5, mid: 5, high: -3, gain: 0, eq298: -3 },
    weights: DEFAULT_WEIGHTS,
  },
  {
    id: "ref-2",
    mode: "reference-match",
    prompt: "The reference mix is bright and punchy. Match your EQ to get as close as possible to the reference sound.",
    hint: "Target: +2 low, +1 mid, +6 high, 298Hz 0. The reference is notably bright.",
    targetEQ: { low: 2, mid: 1, high: 6, gain: 0, eq298: 0 },
    degradedEQ: { low: 4, mid: 3, high: -5, gain: 0, eq298: 3 },
    weights: { low: 20, mid: 15, high: 35, gain: 5, eq298: 25 },
  },
  {
    id: "ref-3",
    mode: "reference-match",
    prompt: "This reference has a vintage, warm character. Match the EQ curve to replicate the vintage warmth.",
    hint: "Target: +5 low, +2 mid, -2 high, 298Hz +4. Vintage = warm lows, rolled-off highs.",
    targetEQ: { low: 5, mid: 2, high: -2, gain: 0, eq298: 4 },
    degradedEQ: { low: -3, mid: -2, high: 6, gain: 0, eq298: -3 },
    weights: { low: 30, mid: 20, high: 20, gain: 5, eq298: 25 },
  },
];

// ─── 5.3 Problem Detection Quiz ─────────────────────────────
const PROBLEM_TASKS: TrainingTask[] = [
  {
    id: "prob-1",
    mode: "problem-detection",
    prompt: "Listen carefully. What problem do you hear in this mix?",
    hint: "The low frequencies are excessive, making the mix sound muddy and unfocused.",
    targetEQ: FLAT,
    degradedEQ: { low: 10, mid: 4, high: -3, gain: 0, eq298: 5 },
    weights: DEFAULT_WEIGHTS,
    problemType: "mud",
    problemOptions: ["Clipping", "Mud/Boominess", "Harshness", "Thin/Lacking bass"],
    correctAnswer: "Mud/Boominess",
  },
  {
    id: "prob-2",
    mode: "problem-detection",
    prompt: "Identify the issue in this mix.",
    hint: "The high frequencies are too prominent, causing ear fatigue.",
    targetEQ: FLAT,
    degradedEQ: { low: -2, mid: -1, high: 10, gain: 0, eq298: -3 },
    weights: DEFAULT_WEIGHTS,
    problemType: "harshness",
    problemOptions: ["Mud/Boominess", "Harshness", "Boxy", "Resonance"],
    correctAnswer: "Harshness",
  },
  {
    id: "prob-3",
    mode: "problem-detection",
    prompt: "What's wrong with this track?",
    hint: "The mix lacks low-end energy and sounds tinny.",
    targetEQ: FLAT,
    degradedEQ: { low: -8, mid: -2, high: 5, gain: 0, eq298: -4 },
    weights: DEFAULT_WEIGHTS,
    problemType: "thin",
    problemOptions: ["Thin/Lacking bass", "Clipping", "Mud/Boominess", "Boxy"],
    correctAnswer: "Thin/Lacking bass",
  },
  {
    id: "prob-4",
    mode: "problem-detection",
    prompt: "Diagnose the problem in this mix.",
    hint: "There's a buildup around 298Hz making the mix sound boxy.",
    targetEQ: FLAT,
    degradedEQ: { low: 2, mid: 3, high: 0, gain: 0, eq298: 10 },
    weights: DEFAULT_WEIGHTS,
    problemType: "boxy",
    problemOptions: ["Boxy", "Harshness", "Thin/Lacking bass", "Resonance"],
    correctAnswer: "Boxy",
  },
];

// ─── 5.4 Dynamic Range Training ─────────────────────────────
const DYNAMIC_TASKS: TrainingTask[] = [
  {
    id: "dyn-1",
    mode: "dynamic-range",
    prompt: "This track has too much dynamic range. Apply compression via the console to tighten it up. Target: ratio 4:1, threshold -18dB.",
    hint: "Enable the compressor, set threshold to -18dB, ratio to 4, attack 5ms, release 150ms.",
    targetEQ: FLAT,
    degradedEQ: FLAT,
    targetConsole: {
      ...baseConsole(),
      compressor: { threshold: -18, ratio: 4, attack: 0.005, release: 0.15, knee: 20, enabled: true },
      limiter: { ceiling: -1, enabled: true },
    },
    degradedConsole: {
      ...baseConsole(),
      compressor: { threshold: -18, ratio: 4, attack: 0.005, release: 0.15, knee: 20, enabled: false },
      limiter: { ceiling: -1, enabled: false },
    },
    weights: DEFAULT_WEIGHTS,
  },
  {
    id: "dyn-2",
    mode: "dynamic-range",
    prompt: "This mix is over-compressed and lifeless. Reduce the compression to restore dynamics. Target: ratio 2:1, threshold -24dB.",
    hint: "Lower the ratio to 2, raise threshold to -24dB. The mix should breathe more.",
    targetEQ: FLAT,
    degradedEQ: FLAT,
    targetConsole: {
      ...baseConsole(),
      compressor: { threshold: -24, ratio: 2, attack: 0.01, release: 0.3, knee: 30, enabled: true },
      limiter: { ceiling: -1, enabled: true },
    },
    degradedConsole: {
      ...baseConsole(),
      compressor: { threshold: -10, ratio: 10, attack: 0.001, release: 0.05, knee: 0, enabled: true },
      limiter: { ceiling: -1, enabled: true },
    },
    weights: DEFAULT_WEIGHTS,
  },
];

// ─── 5.5 Stereo Width Training ──────────────────────────────
const STEREO_TASKS: TrainingTask[] = [
  {
    id: "stereo-1",
    mode: "stereo-width",
    prompt: "This mix is too narrow (almost mono). Widen the stereo image using the width control. Target: 150% width.",
    hint: "Set the width to 1.5 (150%) in the console strip. The sound should fill the stereo field.",
    targetEQ: FLAT,
    degradedEQ: FLAT,
    targetConsole: { ...baseConsole(), width: 1.5 },
    degradedConsole: { ...baseConsole(), width: 0.3 },
    weights: DEFAULT_WEIGHTS,
  },
  {
    id: "stereo-2",
    mode: "stereo-width",
    prompt: "This mix is too wide and lacks focus. Narrow the stereo image. Target: 80% width.",
    hint: "Set width to 0.8 (80%). The mix should be more focused and centered.",
    targetEQ: FLAT,
    degradedEQ: FLAT,
    targetConsole: { ...baseConsole(), width: 0.8 },
    degradedConsole: { ...baseConsole(), width: 2.0 },
    weights: DEFAULT_WEIGHTS,
  },
];

// ─── 5.6 Mastering Chain Quiz ───────────────────────────────
const MASTERING_TASKS: TrainingTask[] = [
  {
    id: "master-1",
    mode: "mastering-chain",
    prompt: "Master this track for streaming. Apply EQ, compression, and limiting to reach -14 LUFS. Target: slight low boost, gentle comp, limiter at -1dB.",
    hint: "EQ: +2 low, +1 mid, +2 high. Comp: -18dB threshold, 2:1 ratio. Limiter: -1dB ceiling.",
    targetEQ: { low: 2, mid: 1, high: 2, gain: 0, eq298: 1 },
    targetConsole: {
      ...baseConsole(),
      compressor: { threshold: -18, ratio: 2, attack: 0.01, release: 0.3, knee: 30, enabled: true },
      limiter: { ceiling: -1, enabled: true },
    },
    degradedEQ: { low: -3, mid: -2, high: -1, gain: 0, eq298: -2 },
    degradedConsole: {
      ...baseConsole(),
      compressor: { threshold: -18, ratio: 2, attack: 0.01, release: 0.3, knee: 30, enabled: false },
      limiter: { ceiling: -1, enabled: false },
    },
    weights: { low: 20, mid: 15, high: 20, gain: 5, eq298: 20 },
    targetLufs: -14,
  },
  {
    id: "master-2",
    mode: "mastering-chain",
    prompt: "Master this for broadcast. Target: -23 LUFS, conservative settings. EQ should be near-flat with gentle correction.",
    hint: "EQ: +1 low, 0 mid, +1 high. Comp: -20dB, 3:1. Limiter: -2dB ceiling for broadcast safety.",
    targetEQ: { low: 1, mid: 0, high: 1, gain: 0, eq298: 0 },
    targetConsole: {
      ...baseConsole(),
      compressor: { threshold: -20, ratio: 3, attack: 0.005, release: 0.25, knee: 20, enabled: true },
      limiter: { ceiling: -2, enabled: true },
    },
    degradedEQ: { low: 5, mid: 4, high: 6, gain: 0, eq298: 3 },
    degradedConsole: {
      ...baseConsole(),
      compressor: { threshold: -20, ratio: 3, attack: 0.005, release: 0.25, knee: 20, enabled: false },
      limiter: { ceiling: -2, enabled: false },
    },
    weights: { low: 20, mid: 15, high: 20, gain: 5, eq298: 20 },
    targetLufs: -23,
  },
];

// ─── 5.7 BPM/Key-Aware Tasks ────────────────────────────────
const BPM_KEY_TASKS: TrainingTask[] = [
  {
    id: "bpm-1",
    mode: "bpm-key",
    prompt: "This track is 128 BPM in A minor — a dance track. EQ it for the dance floor: punchy bass, cutting mids, sparkling highs.",
    hint: "128 BPM dance: +4 low, +3 mid, +5 high, 298Hz -1 for punch. A minor benefits from bright highs.",
    targetEQ: { low: 4, mid: 3, high: 5, gain: 0, eq298: -1 },
    degradedEQ: { low: -3, mid: -1, high: -2, gain: 0, eq298: 4 },
    weights: { low: 25, mid: 20, high: 25, gain: 5, eq298: 25 },
    bpm: 128,
    key: "A minor",
  },
  {
    id: "bpm-2",
    mode: "bpm-key",
    prompt: "This track is 72 BPM in C major — a slow ballad. EQ for warmth and intimacy.",
    hint: "Slow ballad in C major: +4 low, +2 mid, +1 high, 298Hz +3 for warmth.",
    targetEQ: { low: 4, mid: 2, high: 1, gain: 0, eq298: 3 },
    degradedEQ: { low: -4, mid: 3, high: 6, gain: 0, eq298: -3 },
    weights: { low: 25, mid: 20, high: 20, gain: 5, eq298: 30 },
    bpm: 72,
    key: "C major",
  },
  {
    id: "bpm-3",
    mode: "bpm-key",
    prompt: "This track is 140 BPM in E minor — aggressive electronic. EQ for maximum impact on the dance floor.",
    hint: "140 BPM E minor: +3 low, +5 mid, +6 high, 298Hz -2. E minor = cut mids slightly for aggression.",
    targetEQ: { low: 3, mid: 5, high: 6, gain: 0, eq298: -2 },
    degradedEQ: { low: 5, mid: -3, high: -4, gain: 0, eq298: 4 },
    weights: { low: 20, mid: 25, high: 25, gain: 5, eq298: 25 },
    bpm: 140,
    key: "E minor",
  },
];

// ─── 5.8 Streaming Platform Prep ────────────────────────────
const STREAMING_TASKS: TrainingTask[] = [
  {
    id: "stream-1",
    mode: "streaming-prep",
    prompt: "Master this track for Spotify. Target: -14 LUFS, modern sound. Spotify normalizes to -14 LUFS.",
    hint: "Spotify: +2 low, +1 mid, +3 high. Comp 2:1 at -18dB. Limiter at -1dB. Target -14 LUFS.",
    targetEQ: { low: 2, mid: 1, high: 3, gain: 0, eq298: 1 },
    targetConsole: {
      ...baseConsole(),
      compressor: { threshold: -18, ratio: 2, attack: 0.01, release: 0.3, knee: 30, enabled: true },
      limiter: { ceiling: -1, enabled: true },
    },
    degradedEQ: { low: -2, mid: -1, high: -1, gain: 0, eq298: -1 },
    degradedConsole: {
      ...baseConsole(),
      compressor: { threshold: -18, ratio: 2, attack: 0.01, release: 0.3, knee: 30, enabled: false },
      limiter: { ceiling: -1, enabled: false },
    },
    weights: { low: 20, mid: 15, high: 20, gain: 5, eq298: 20 },
    platform: "Spotify",
    targetLufs: -14,
  },
  {
    id: "stream-2",
    mode: "streaming-prep",
    prompt: "Master this for YouTube. Target: -14 LUFS, slightly louder than Spotify. YouTube also normalizes to -14 LUFS.",
    hint: "YouTube: +3 low, +1 mid, +3 high. Comp 2.5:1 at -16dB. Limiter at -1dB. Target -14 LUFS.",
    targetEQ: { low: 3, mid: 1, high: 3, gain: 0, eq298: 0 },
    targetConsole: {
      ...baseConsole(),
      compressor: { threshold: -16, ratio: 2.5, attack: 0.008, release: 0.25, knee: 25, enabled: true },
      limiter: { ceiling: -1, enabled: true },
    },
    degradedEQ: { low: -3, mid: 2, high: -2, gain: 0, eq298: 3 },
    degradedConsole: {
      ...baseConsole(),
      compressor: { threshold: -16, ratio: 2.5, attack: 0.008, release: 0.25, knee: 25, enabled: false },
      limiter: { ceiling: -1, enabled: false },
    },
    weights: { low: 20, mid: 15, high: 20, gain: 5, eq298: 20 },
    platform: "YouTube",
    targetLufs: -14,
  },
  {
    id: "stream-3",
    mode: "streaming-prep",
    prompt: "Master this for Apple Music. Target: -16 LUFS, warmer sound. Apple Music normalizes to -16 LUFS.",
    hint: "Apple Music: +3 low, +1 mid, +2 high. Comp 2:1 at -20dB. Limiter at -1.5dB. Target -16 LUFS.",
    targetEQ: { low: 3, mid: 1, high: 2, gain: 0, eq298: 1 },
    targetConsole: {
      ...baseConsole(),
      compressor: { threshold: -20, ratio: 2, attack: 0.01, release: 0.35, knee: 30, enabled: true },
      limiter: { ceiling: -1.5, enabled: true },
    },
    degradedEQ: { low: -2, mid: -2, high: 4, gain: 0, eq298: -2 },
    degradedConsole: {
      ...baseConsole(),
      compressor: { threshold: -20, ratio: 2, attack: 0.01, release: 0.35, knee: 30, enabled: false },
      limiter: { ceiling: -1.5, enabled: false },
    },
    weights: { low: 20, mid: 15, high: 20, gain: 5, eq298: 20 },
    platform: "Apple Music",
    targetLufs: -16,
  },
];

export const ALL_TRAINING_TASKS: Record<TrainingMode, TrainingTask[]> = {
  "genre-aware": GENRE_TASKS,
  "reference-match": REFERENCE_TASKS,
  "problem-detection": PROBLEM_TASKS,
  "dynamic-range": DYNAMIC_TASKS,
  "stereo-width": STEREO_TASKS,
  "mastering-chain": MASTERING_TASKS,
  "bpm-key": BPM_KEY_TASKS,
  "streaming-prep": STREAMING_TASKS,
};

export const TRAINING_MODE_INFO: Record<TrainingMode, { label: string; description: string; icon: string }> = {
  "genre-aware": { label: "Genre Training", description: "Match EQ to genre standards", icon: "music" },
  "reference-match": { label: "Reference Match", description: "Match a target mix sound", icon: "target" },
  "problem-detection": { label: "Problem Detection", description: "Identify mix issues by ear", icon: "alert" },
  "dynamic-range": { label: "Dynamic Range", description: "Compression control training", icon: "gauge" },
  "stereo-width": { label: "Stereo Width", description: "Match stereo field targets", icon: "move" },
  "mastering-chain": { label: "Mastering Chain", description: "Full mastering for LUFS target", icon: "trophy" },
  "bpm-key": { label: "BPM/Key Aware", description: "EQ with BPM and key context", icon: "activity" },
  "streaming-prep": { label: "Streaming Prep", description: "Master for Spotify/YouTube/Apple", icon: "cloud" },
};

export function getTasksForMode(mode: TrainingMode): TrainingTask[] {
  return ALL_TRAINING_TASKS[mode] || [];
}
