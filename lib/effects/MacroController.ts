/**
 * MacroController — maps a single 0–100 slider to multiple effect parameters.
 *
 * Live    → "Polish":   pitch correction + parallel comp + plate reverb
 * Stream  → "Vibe":     reverb + multiband tightening
 * Podcast → "Clarity":  noise gate + de-esser + vocal chain
 * Music   → "Vibe":     reverb + multiband tightening
 */

import type { SoundClass, FXEffectParams } from "@/lib/types";

/** Linear interpolation helper: map t in [0,1] to [outMin, outMax] */
function lerp(t: number, outMin: number, outMax: number): number {
  return outMin + t * (outMax - outMin);
}

/** Exponential curve for more dramatic feel near max */
function expCurve(t: number, power = 2): number {
  return Math.pow(Math.max(0, Math.min(1, t)), power);
}

export function applyMacro(
  soundClass: SoundClass,
  macro: number
): Partial<FXEffectParams> {
  const t = macro / 100; // 0.0 → 1.0
  const et = expCurve(t, 1.6); // gentler exponential feel

  switch (soundClass) {
    case "live": {
      return {
        pitchCorrection: {
          enabled: true,
          speed: lerp(t, 0.05, 0.5),   // faster correction at max
          amount: lerp(t, 0.0, 0.85),   // aggressive but natural
        },
        parallelComp: {
          enabled: true,
          blend: lerp(t, 0.0, 0.6),     // more compressed character
          compressionRatio: lerp(t, 2, 10),
        },
        plateReverb: {
          enabled: true,
          wetMix: lerp(et, 0.0, 0.25),  // audible space without wash
          decay: lerp(t, 0.6, 1.5),
        },
      };
    }

    case "podcast": {
      return {
        noiseGate: {
          enabled: true,
          threshold: lerp(t, -55, -25), // tighter gate at max
          attack: 5,
          release: 50,
        },
        deesser: {
          enabled: true,
          frequency: 7000,
          threshold: lerp(t, -10, -28),  // more aggressive sibilance cut
          reduction: lerp(t, 3, 12),     // deeper reduction
        },
        vocalChain: {
          enabled: true,
          hpfFreq: 80,
          presenceBoost: lerp(t, 0, 6),  // brighter clarity
          compThreshold: lerp(t, -15, -32), // heavier leveling
        },
      };
    }

    case "music": {
      // Vibe = audible reverb space + multiband tightening
      return {
        reverb: {
          enabled: true,
          type: t > 0.5 ? "hall" : "plate",
          wetMix: lerp(et, 0.0, 0.55), // clearly audible reverb
        },
        multiband: {
          enabled: true,
          lowRatio: lerp(t, 1, 6),
          midRatio: lerp(t, 1, 8),
          highRatio: lerp(t, 1, 5),
        },
      };
    }

    case "stream": {
      // Stream = same Vibe treatment as music (YouTube audio is typically already mixed)
      return {
        reverb: {
          enabled: true,
          type: t > 0.5 ? "hall" : "plate",
          wetMix: lerp(et, 0.0, 0.55),
        },
        multiband: {
          enabled: true,
          lowRatio: lerp(t, 1, 6),
          midRatio: lerp(t, 1, 8),
          highRatio: lerp(t, 1, 5),
        },
      };
    }

    default:
      return {};
  }
}

/** Map a single effect's intensity fader (0–100) to its underlying parameters. */
export function applyEffectIntensity(
  effectKey: string,
  intensity: number
): Partial<import("@/lib/types").FXEffectParams> {
  const t = intensity / 100;
  const et = expCurve(t, 1.6);

  switch (effectKey) {
    case "reverb":
      return {
        reverb: {
          enabled: intensity > 0,
          type: t > 0.5 ? "hall" : "plate",
          wetMix: lerp(et, 0, 0.5),
        },
      };
    case "noiseGate":
      return {
        noiseGate: {
          enabled: intensity > 0,
          threshold: lerp(t, -60, -20),
          attack: 5,
          release: 50,
        },
      };
    case "deesser":
      return {
        deesser: {
          enabled: intensity > 0,
          frequency: 7000,
          threshold: lerp(t, -10, -30),
          reduction: lerp(t, 0, 14),
        },
      };
    case "vocalChain":
      return {
        vocalChain: {
          enabled: intensity > 0,
          hpfFreq: 80,
          presenceBoost: lerp(t, 0, 8),
          compThreshold: lerp(t, -12, -35),
        },
      };
    case "pitchCorrection":
      return {
        pitchCorrection: {
          enabled: intensity > 0,
          speed: lerp(t, 0.05, 0.6),
          amount: lerp(t, 0, 1.0),
        },
      };
    case "parallelComp":
      return {
        parallelComp: {
          enabled: intensity > 0,
          blend: lerp(t, 0, 0.7),
          compressionRatio: lerp(t, 2, 12),
        },
      };
    case "plateReverb":
      return {
        plateReverb: {
          enabled: intensity > 0,
          wetMix: lerp(et, 0, 0.35),
          decay: lerp(t, 0.5, 2.0),
        },
      };
    case "multiband":
      return {
        multiband: {
          enabled: intensity > 0,
          lowRatio: lerp(t, 1, 6),
          midRatio: lerp(t, 1, 8),
          highRatio: lerp(t, 1, 5),
        },
      };
    default:
      return {};
  }
}

export const MACRO_LABELS: Record<SoundClass, string> = {
  live: "Polish",
  stream: "Vibe",
  podcast: "Clarity",
  music: "Vibe",
};
