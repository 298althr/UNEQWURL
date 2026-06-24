// ============================================================
// Design System Types (from skill.md spec)
// ============================================================

export type AudioCategory = "music" | "podcast" | "live" | "stream";

export interface CategoryConfig {
  id: AudioCategory;
  label: string;
  colorVar: string;
  colorHex: string;
  photoThemeUrl: string;
  subtitle: string;
}

export type ThemeMode = "dark" | "light";
export type DensityMode = "normal" | "compact";

// ============================================================
// Audio / Application Types
// ============================================================

export type EQSettings = {
  low: number;
  mid: number;
  high: number;
  gain: number;
  eq298: number;
};

export type SessionUser = {
  userId: string;
  role: "student" | "admin";
};

export type SongListItem = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  genre: string | null;
  file_url: string;
  duration_seconds: number | null;
  upload_type?: string;
  cover_image?: string | null;
  bpm?: number | null;
  musical_key?: string | null;
};

export type SongAdmin = SongListItem & {
  benchmark_settings: EQSettings | null;
  benchmark_weights: EQSettings | null;
  benchmark_ready: boolean;
  analysis_status?: string;
  probe_data: Record<string, unknown> | null;
};

export type SubmissionResult = {
  id: string;
  score: number;
  score_breakdown: Record<string, { diff: number; weighted: number }>;
  submitted_at: string;
};

export type SoundClass = "music" | "podcast" | "live" | "stream";

export type FXEffectParams = {
  // Music
  multiband?: { enabled: boolean; lowRatio: number; midRatio: number; highRatio: number };
  reverb?: { enabled: boolean; type: "plate" | "hall"; wetMix: number };
  // Podcast
  noiseGate?: { enabled: boolean; threshold: number; attack: number; release: number };
  deesser?: { enabled: boolean; frequency: number; threshold: number; reduction: number };
  vocalChain?: { enabled: boolean; hpfFreq: number; presenceBoost: number; compThreshold: number };
  // Voice
  pitchCorrection?: { enabled: boolean; speed: number; amount: number };
  parallelComp?: { enabled: boolean; blend: number; compressionRatio: number };
  plateReverb?: { enabled: boolean; wetMix: number; decay: number };
};

export type EffectKey =
  | "reverb"
  | "noiseGate"
  | "deesser"
  | "vocalChain"
  | "pitchCorrection"
  | "parallelComp"
  | "plateReverb"
  | "multiband";

export type AdvancedFXConfig = {
  enabled: boolean;
  soundClass: SoundClass;
  macroValue: number; // 0–100, drives all FX params per sound class
  intensities: Record<EffectKey, number>; // 0–100 per effect fader
} & FXEffectParams;

export const EQ_BANDS = ["low", "mid", "high", "gain", "eq298"] as const;
export type EQBand = (typeof EQ_BANDS)[number];

export const BAND_LABELS: Record<EQBand, string> = {
  low: "Low",
  mid: "Mid",
  high: "High",
  gain: "Gain",
  eq298: "298EQ",
};
