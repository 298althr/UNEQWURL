/**
 * Degradation generator — creates deliberately degraded EQ settings
 * for the "Fix the Mix" quiz mode.
 *
 * Each degradation type has a specific sonic problem the student must fix.
 * The scoring compares the student's EQ against the benchmark (optimal fix).
 */
import type { EQSettings } from "@/lib/types";

export interface DegradationPreset {
  id: string;
  name: string;
  description: string;
  /** Degraded EQ settings applied to the audio */
  degradedSettings: EQSettings;
  /** The optimal fix (what the student should aim for) */
  optimalFix: EQSettings;
  /** Scoring weights — which bands matter most for this task */
  weights: EQSettings;
  /** Hint text shown to the student */
  hint: string;
}

/**
 * Predefined degradation presets.
 * Each represents a common mixing problem.
 */
export const DEGRADATION_PRESETS: DegradationPreset[] = [
  {
    id: "muddy-bass",
    name: "Muddy Bass",
    description: "The low frequencies are overpowering. The mix sounds boomy and unclear.",
    degradedSettings: { low: 8, mid: -3, high: 0, gain: 0, eq298: 5 },
    optimalFix: { low: -4, mid: 2, high: 1, gain: 0, eq298: -2 },
    weights: { low: 0.35, mid: 0.15, high: 0.10, gain: 0.05, eq298: 0.35 },
    hint: "Cut the low frequencies and the 298Hz region to remove the mud. Slightly boost mids for clarity.",
  },
  {
    id: "harsh-treble",
    name: "Harsh Treble",
    description: "The high frequencies are piercing. The mix sounds fatiguing and brittle.",
    degradedSettings: { low: 0, mid: -2, high: 9, gain: 0, eq298: 0 },
    optimalFix: { low: 1, mid: 2, high: -5, gain: 0, eq298: 1 },
    weights: { low: 0.10, mid: 0.20, high: 0.45, gain: 0.05, eq298: 0.20 },
    hint: "Reduce the high frequencies significantly. Boost mids slightly to restore warmth.",
  },
  {
    id: "buried-vocals",
    name: "Buried Vocals",
    description: "The vocals are hidden. The mid frequencies are scooped and the mix lacks presence.",
    degradedSettings: { low: 3, mid: -7, high: 2, gain: 0, eq298: -4 },
    optimalFix: { low: -1, mid: 5, high: 0, gain: 0, eq298: 3 },
    weights: { low: 0.15, mid: 0.40, high: 0.10, gain: 0.05, eq298: 0.30 },
    hint: "Boost the mid frequencies to bring vocals forward. Add 298Hz presence. Reduce excess low end.",
  },
  {
    id: "thin-mix",
    name: "Thin Mix",
    description: "The mix lacks body. Everything sounds tinny and lightweight with no low-end foundation.",
    degradedSettings: { low: -8, mid: 3, high: 5, gain: 0, eq298: -5 },
    optimalFix: { low: 4, mid: -1, high: -2, gain: 0, eq298: 3 },
    weights: { low: 0.35, mid: 0.15, high: 0.20, gain: 0.05, eq298: 0.25 },
    hint: "Boost the low frequencies to add weight. Add 298Hz for warmth. Reduce excess highs.",
  },
  {
    id: "boxy-mids",
    name: "Boxy Mids",
    description: "The mid frequencies are honky and boxy, like listening through a telephone.",
    degradedSettings: { low: 0, mid: 8, high: -3, gain: 0, eq298: 6 },
    optimalFix: { low: 1, mid: -4, high: 2, gain: 0, eq298: -3 },
    weights: { low: 0.10, mid: 0.35, high: 0.15, gain: 0.05, eq298: 0.35 },
    hint: "Cut the mid and 298Hz frequencies to remove the boxiness. Slightly boost highs for air.",
  },
  {
    id: "dark-mix",
    name: "Dark Mix",
    description: "The mix is muffled and dark. High frequencies are severely lacking.",
    degradedSettings: { low: 5, mid: 2, high: -8, gain: 0, eq298: 3 },
    optimalFix: { low: -2, mid: 0, high: 5, gain: 0, eq298: -1 },
    weights: { low: 0.25, mid: 0.10, high: 0.45, gain: 0.05, eq298: 0.15 },
    hint: "Boost the high frequencies to add brightness and air. Reduce excess low end.",
  },
];

/**
 * Get a random subset of degradation presets for a quiz session.
 */
export function pickDegradations(count: number, seed?: number): DegradationPreset[] {
  const indices = Array.from(DEGRADATION_PRESETS.keys());
  // Simple seeded shuffle
  let s = seed ?? Date.now();
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, Math.min(count, DEGRADATION_PRESETS.length)).map(
    (i) => DEGRADATION_PRESETS[i]
  );
}
