import type { EQSettings } from "./types";
import { computeScore } from "./scoring";

// ============================================================
// Genre Spectral Profiles
// These define what "healthy" spectral balance looks like per genre.
// Values are dB offsets from mid (0 = mid reference).
// Source: mastering engineering conventions + libsonare presets.
// ============================================================

export type GenreSpectralProfile = {
  lowOffset: number;      // expected low band relative to mid
  eq298Offset: number;    // expected 298Hz band relative to mid
  highOffset: number;     // expected high band relative to mid
  lufsTarget: number;     // expected integrated loudness
  description: string;
};

export const GENRE_SPECTRAL_PROFILES: Record<string, GenreSpectralProfile> = {
  techno:      { lowOffset: 7,  eq298Offset: -2, highOffset: -4, lufsTarget: -9,  description: "Punchy low, controlled highs" },
  edm:         { lowOffset: 6,  eq298Offset: -2, highOffset: -3, lufsTarget: -8,  description: "Full low, bright top" },
  deepHouse:   { lowOffset: 8,  eq298Offset: -3, highOffset: -5, lufsTarget: -10, description: "Heavy sub, rolled-off highs" },
  house:       { lowOffset: 6,  eq298Offset: -2, highOffset: -4, lufsTarget: -10, description: "Solid low, smooth top" },
  trance:      { lowOffset: 5,  eq298Offset: -1, highOffset: -2, lufsTarget: -8,  description: "Balanced energy, bright" },
  drumAndBass: { lowOffset: 9,  eq298Offset: -3, highOffset: -3, lufsTarget: -9,  description: "Very heavy sub, present highs" },
  trap:        { lowOffset: 8,  eq298Offset: -2, highOffset: -4, lufsTarget: -9,  description: "Booming low, dark top" },
  lofi:        { lowOffset: 4,  eq298Offset: 0,  highOffset: -8, lufsTarget: -14, description: "Warm, intentionally dull" },
  amapiano:    { lowOffset: 9,  eq298Offset: -2, highOffset: -5, lufsTarget: -12, description: "Deep sub, dark top, percussive mids" },
  afrobeats:   { lowOffset: 7,  eq298Offset: -1, highOffset: -4, lufsTarget: -12, description: "Full low, smooth highs" },
  hipHop:      { lowOffset: 7,  eq298Offset: -2, highOffset: -4, lufsTarget: -10, description: "Heavy low, controlled highs" },
  rnb:         { lowOffset: 5,  eq298Offset: -1, highOffset: -3, lufsTarget: -12, description: "Warm low, smooth top" },
  metal:       { lowOffset: 4,  eq298Offset: -1, highOffset: -2, lufsTarget: -8,  description: "Tight low, aggressive highs" },
  rock:        { lowOffset: 4,  eq298Offset: -1, highOffset: -3, lufsTarget: -10, description: "Solid low, present highs" },
  pop:         { lowOffset: 4,  eq298Offset: -1, highOffset: -3, lufsTarget: -14, description: "Balanced spectrum, polished" },
  jazz:        { lowOffset: 3,  eq298Offset: 0,  highOffset: -4, lufsTarget: -16, description: "Natural, gentle rolloff" },
  classical:   { lowOffset: 2,  eq298Offset: 0,  highOffset: -5, lufsTarget: -20, description: "Flat, wide dynamics" },
  acoustic:    { lowOffset: 3,  eq298Offset: 0,  highOffset: -4, lufsTarget: -16, description: "Warm, natural" },
  ambient:     { lowOffset: 4,  eq298Offset: 0,  highOffset: -6, lufsTarget: -18, description: "Soft low, airy top" },
  worship:     { lowOffset: 4,  eq298Offset: -1, highOffset: -5, lufsTarget: -14, description: "Warm, clear vocals" },
  gospel:      { lowOffset: 5,  eq298Offset: -1, highOffset: -4, lufsTarget: -13, description: "Full low, bright vocals" },
  podcast:     { lowOffset: 0,  eq298Offset: 0,  highOffset: -2, lufsTarget: -16, description: "Flat, vocal-focused" },
  speech:      { lowOffset: 0,  eq298Offset: 0,  highOffset: -2, lufsTarget: -16, description: "Flat, vocal-focused" },
};

export function getGenreSpectralProfile(genre: string): GenreSpectralProfile {
  return GENRE_SPECTRAL_PROFILES[genre] || GENRE_SPECTRAL_PROFILES["pop"];
}

// ============================================================
// Learning Indicators Engine
// Real-time feedback system that guides students to understanding
// by showing how each config change impacts multiple dimensions.
// ============================================================

export type IndicatorStatus = "excellent" | "good" | "caution" | "warning" | "neutral";

export type BandKey = keyof EQSettings;

export type BandInfo = {
  key: BandKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  neutral: number;
};

export const BAND_INFO: Record<BandKey, BandInfo> = {
  low:   { key: "low",   label: "Low",    unit: "dB", min: -12, max: 12, neutral: 0 },
  mid:   { key: "mid",   label: "Mid",    unit: "dB", min: -12, max: 12, neutral: 0 },
  high:  { key: "high",  label: "High",   unit: "dB", min: -12, max: 12, neutral: 0 },
  gain:  { key: "gain",  label: "Gain",   unit: "dB", min: -12, max: 12, neutral: 0 },
  eq298: { key: "eq298", label: "298EQ",  unit: "%",  min: -12, max: 12, neutral: 0 },
};

export type IndicatorResult = {
  /** 0-100 score for this indicator */
  value: number;
  status: IndicatorStatus;
  /** Short label like "Excellent", "Too Hot", "Balanced" */
  label: string;
  /** One-line guidance for the student */
  hint: string;
  /** Which band is causing the most impact (for targeted feedback) */
  primaryBand?: BandKey;
};

export type LearningIndicators = {
  /** Overall sound quality vs benchmark (0-100). Null if no benchmark. */
  soundQuality: IndicatorResult | null;
  /** Maximum attainable score given the current settings — how close user is to the best possible result */
  maxAttainable: IndicatorResult | null;
  /** Spectral balance — are the bands in a healthy relationship to each other? */
  spectralBalance: IndicatorResult;
  /** Headroom safety — is the user at risk of clipping? */
  headroom: IndicatorResult;
  /** Adjustment engagement — how much the user is actively experimenting */
  engagement: IndicatorResult;
  /** Per-band contribution — how much each band is helping or hurting the score */
  bandContributions: Record<BandKey, { diff: number; impact: number; direction: "up" | "down" | "flat" }>;
  /** Trend — is the score improving or declining since last calculation? */
  trend: "improving" | "declining" | "stable";
  /** Number of A/B toggles used */
  abToggles: number;
  /** Time spent in seconds */
  timeSpent: number;
};

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function statusFromScore(score: number): IndicatorStatus {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "caution";
  return "warning";
}

function statusFromValue(value: number, thresholds: [number, number, number]): IndicatorStatus {
  // thresholds: [excellentAbove, goodAbove, cautionAbove]
  if (value >= thresholds[0]) return "excellent";
  if (value >= thresholds[1]) return "good";
  if (value >= thresholds[2]) return "caution";
  return "warning";
}

// ── Core calculation ──

export function computeIndicators(params: {
  settings: EQSettings;
  benchmark?: { settings: EQSettings; weights: EQSettings } | null;
  previousScore?: number | null;
  abToggles: number;
  timeSpent: number;
  isEnhanced: boolean;
  genre?: string;
}): LearningIndicators {
  const { settings, benchmark, previousScore, abToggles, timeSpent, isEnhanced, genre } = params;

  // ── 1. Sound Quality (vs benchmark) ──
  let soundQuality: IndicatorResult | null = null;
  let maxAttainable: IndicatorResult | null = null;

  if (benchmark) {
    const { score, breakdown } = computeScore(settings, benchmark.settings, benchmark.weights);

    const status = statusFromScore(score);
    const labels: Record<IndicatorStatus, string> = {
      excellent: "Excellent",
      good: "Good",
      caution: "Needs Work",
      warning: "Off Track",
      neutral: "—",
    };
    const hints: Record<IndicatorStatus, string> = {
      excellent: "Your settings closely match the reference. Keep it up!",
      good: "You're on the right track. Fine-tune the bands highlighted below.",
      caution: "Some bands are far from the target. Check the per-band guidance.",
      warning: "Major adjustments needed. Compare with the reference using A/B.",
      neutral: "No benchmark available for this track.",
    };

    // Find the band with the highest weighted penalty
    let worstBand: BandKey | undefined;
    let worstPenalty = 0;
    for (const [key, info] of Object.entries(breakdown) as [BandKey, { diff: number; weighted: number }][]) {
      if (info.weighted > worstPenalty) {
        worstPenalty = info.weighted;
        worstBand = key;
      }
    }

    soundQuality = {
      value: score,
      status,
      label: labels[status],
      hint: hints[status],
      primaryBand: worstBand,
    };

    // ── 2. Max Attainable ──
    // If the user moved every band to the benchmark, what score would they get?
    // The gap between current and max shows how much room for improvement exists.
    const maxPossible = 100; // Perfect match = 100
    const gap = maxPossible - score;
    const attainablePercent = score; // Current score IS the % of max attainable

    const attainableStatus = statusFromScore(attainablePercent);
    maxAttainable = {
      value: attainablePercent,
      status: attainableStatus,
      label: `${gap < 5 ? "Near Maximum" : gap < 15 ? "Room to Improve" : "Far from Maximum"}`,
      hint: gap < 5
        ? "You're within 5 points of the maximum attainable quality."
        : gap < 15
        ? `${gap.toFixed(1)} points away from maximum. Adjust ${worstBand ? BAND_INFO[worstBand].label : "any"} band.`
        : `${gap.toFixed(1)} points away. Use A/B to compare with the reference.`,
      primaryBand: worstBand,
    };
  }

  // ── 3. Spectral Balance (genre-aware) ──
  // "Healthy" depends on the genre. A hip-hop track SHOULD have +7dB low offset.
  // A jazz track should have only +2dB. We compare the user's current band
  // relationships against the genre's expected spectral profile.
  const profile = getGenreSpectralProfile(genre || "pop");

  // User's actual band offsets (relative to their own mid)
  const userLowOffset = settings.low - settings.mid;
  const userEq298Offset = settings.eq298 - settings.mid;
  const userHighOffset = settings.high - settings.mid;

  // Deviation from the genre's expected profile
  const lowDev = Math.abs(userLowOffset - profile.lowOffset);
  const eq298Dev = Math.abs(userEq298Offset - profile.eq298Offset);
  const highDev = Math.abs(userHighOffset - profile.highOffset);
  const totalDev = lowDev + eq298Dev + highDev;

  // Score: 0 deviation = 100, 15dB total deviation = 0
  const balanceScore = clamp(100 - (totalDev * 6.67), 0, 100);
  const balanceStatus = statusFromScore(balanceScore);

  // Find the worst band
  let balanceBand: BandKey | undefined;
  let worstDev = 0;
  if (lowDev >= eq298Dev && lowDev >= highDev) { balanceBand = "low"; worstDev = lowDev; }
  else if (eq298Dev >= highDev) { balanceBand = "eq298"; worstDev = eq298Dev; }
  else { balanceBand = "high"; worstDev = highDev; }

  let balanceHint: string;
  if (balanceStatus === "excellent") {
    balanceHint = `Spectral balance matches ${genre || "pop"} expectations. ${profile.description}.`;
  } else if (balanceStatus === "good") {
    balanceHint = `Close to ${genre || "pop"} ideal. ${BAND_INFO[balanceBand!].label} is ${worstDev.toFixed(1)}dB off target.`;
  } else if (balanceStatus === "caution") {
    const dir = balanceBand === "low" ? (userLowOffset > profile.lowOffset ? "too heavy" : "too thin") :
                balanceBand === "eq298" ? (userEq298Offset > profile.eq298Offset ? "too muddy" : "too scooped") :
                (userHighOffset > profile.highOffset ? "too harsh" : "too dull");
    balanceHint = `${BAND_INFO[balanceBand!].label} is ${dir} for ${genre || "pop"}. Target: ${profile.description.toLowerCase()}.`;
  } else {
    balanceHint = `Spectral balance is far from ${genre || "pop"} expectations. ${BAND_INFO[balanceBand!].label} needs ${worstDev.toFixed(1)}dB adjustment toward the genre profile.`;
  }

  const spectralBalance: IndicatorResult = {
    value: balanceScore,
    status: balanceStatus,
    label: balanceStatus === "excellent" ? "Genre-Matched" : balanceStatus === "good" ? "Close to Genre" : balanceStatus === "caution" ? "Off Genre" : "Wrong Profile",
    hint: balanceHint,
    primaryBand: balanceBand,
  };

  // ── 4. Headroom Safety ──
  // Total gain across all bands — if too high, risk of clipping
  const totalGain = settings.low + settings.mid + settings.high + settings.gain;
  // Also factor in eq298 as intensity
  const effectiveLevel = totalGain + (settings.eq298 * 0.5);

  let headroomScore: number;
  let headroomLabel: string;
  let headroomHint: string;
  let headroomStatus: IndicatorStatus;

  if (effectiveLevel <= 0) {
    headroomScore = 100;
    headroomLabel = "Safe";
    headroomHint = "Plenty of headroom. You can push levels up if needed.";
    headroomStatus = "excellent";
  } else if (effectiveLevel <= 12) {
    headroomScore = clamp(100 - (effectiveLevel * 3), 60, 100);
    headroomLabel = "Moderate";
    headroomHint = "Levels are moderate. Safe but watch if you push further.";
    headroomStatus = "good";
  } else if (effectiveLevel <= 24) {
    headroomScore = clamp(100 - (effectiveLevel * 2.5), 30, 60);
    headroomLabel = "Hot";
    headroomHint = "Combined gain is high. Risk of clipping — reduce some bands.";
    headroomStatus = "caution";
  } else {
    headroomScore = clamp(100 - (effectiveLevel * 2), 0, 30);
    headroomLabel = "Clipping Risk";
    headroomHint = "Danger: total gain too high. Turn down Gain or cut some bands.";
    headroomStatus = "warning";
  }

  const headroom: IndicatorResult = {
    value: headroomScore,
    status: headroomStatus,
    label: headroomLabel,
    hint: headroomHint,
    primaryBand: settings.gain > 6 ? "gain" : settings.low > 6 ? "low" : settings.high > 6 ? "high" : undefined,
  };

  // ── 5. Engagement ──
  // How actively is the student experimenting?
  // Factors: number of bands changed from neutral, A/B toggles, time spent
  const bandsChanged = (Object.keys(settings) as BandKey[]).filter(k => Math.abs(settings[k]) > 0.5).length;
  const engagementRaw = (bandsChanged * 15) + (abToggles * 10) + Math.min(timeSpent * 0.5, 25);
  const engagementScore = clamp(engagementRaw, 0, 100);

  let engagementLabel: string;
  let engagementHint: string;
  let engagementStatus: IndicatorStatus;

  if (engagementScore < 20) {
    engagementLabel = "Just Started";
    engagementHint = "Start adjusting EQ bands and use A/B to compare.";
    engagementStatus = "neutral";
  } else if (engagementScore < 50) {
    engagementLabel = "Exploring";
    engagementHint = "Good experimentation. Try more A/B comparisons.";
    engagementStatus = "good";
  } else if (engagementScore < 80) {
    engagementLabel = "Active";
    engagementHint = "Great engagement! You're actively learning by doing.";
    engagementStatus = "excellent";
  } else {
    engagementLabel = "Deep Practice";
    engagementHint = "Excellent deep practice. You're maximizing your learning.";
    engagementStatus = "excellent";
  }

  const engagement: IndicatorResult = {
    value: engagementScore,
    status: engagementStatus,
    label: engagementLabel,
    hint: engagementHint,
  };

  // ── 6. Per-band contributions ──
  const bandContributions: LearningIndicators["bandContributions"] = {} as Record<BandKey, { diff: number; impact: number; direction: "up" | "down" | "flat" }>;

  for (const key of Object.keys(BAND_INFO) as BandKey[]) {
    const userVal = settings[key];
    const benchVal = benchmark?.settings[key] ?? 0;
    const diff = userVal - benchVal;
    const impact = benchmark ? Math.abs(diff) * (benchmark.weights[key] / 24) * 100 : 0;
    const direction: "up" | "down" | "flat" = diff > 0.5 ? "up" : diff < -0.5 ? "down" : "flat";

    bandContributions[key] = { diff, impact, direction };
  }

  // ── 7. Trend ──
  let trend: "improving" | "declining" | "stable" = "stable";
  if (previousScore !== null && previousScore !== undefined && soundQuality) {
    const delta = soundQuality.value - previousScore;
    if (delta > 1) trend = "improving";
    else if (delta < -1) trend = "declining";
  }

  return {
    soundQuality,
    maxAttainable,
    spectralBalance,
    headroom,
    engagement,
    bandContributions,
    trend,
    abToggles,
    timeSpent,
  };
}

// ── Status colors for UI ──

export const STATUS_COLORS: Record<IndicatorStatus, { fg: string; bg: string; border: string }> = {
  excellent: { fg: "#22c55e", bg: "rgba(34, 197, 94, 0.1)",  border: "rgba(34, 197, 94, 0.3)" },
  good:      { fg: "#84cc16", bg: "rgba(132, 204, 22, 0.1)", border: "rgba(132, 204, 22, 0.3)" },
  caution:   { fg: "#eab308", bg: "rgba(234, 179, 8, 0.1)",  border: "rgba(234, 179, 8, 0.3)" },
  warning:   { fg: "#ef4444", bg: "rgba(239, 68, 68, 0.1)",  border: "rgba(239, 68, 68, 0.3)" },
  neutral:   { fg: "#71717a", bg: "rgba(113, 113, 122, 0.1)", border: "rgba(113, 113, 122, 0.3)" },
};

export const STATUS_ICONS: Record<IndicatorStatus, string> = {
  excellent: "✓",
  good: "○",
  caution: "!",
  warning: "✕",
  neutral: "—",
};
