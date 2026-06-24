/**
 * ScenePresets — pre-configured mixing scenes for live production.
 *
 * Phase 4: Live Production Mode
 *
 * Each scene preset configures:
 * - Console settings (gain, pan, width, compressor, limiter)
 * - Advanced FX parameters
 * - EQ settings
 * - Description and icon
 */

import type { ConsoleSettings } from "./audio-chain";
import { getDefaultConsoleSettings } from "./audio-chain";
import type { EQSettings } from "./types";
import type { FXEffectParams } from "./types";

export interface ScenePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  console: ConsoleSettings;
  eq: EQSettings;
  fx: Partial<FXEffectParams>;
  fxEnabled: boolean;
}

function baseConsole(): ConsoleSettings {
  return getDefaultConsoleSettings();
}

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: "vocal-reverb",
    name: "Vocal Reverb Send",
    description: "Warm vocal with plate reverb and gentle compression",
    icon: "mic",
    console: {
      ...baseConsole(),
      gain: 2,
      pan: 0,
      width: 1,
      compressor: {
        threshold: -20,
        ratio: 3,
        attack: 0.005,
        release: 0.15,
        knee: 20,
        enabled: true,
      },
      limiter: { ceiling: -1, enabled: true },
    },
    eq: { low: 2, mid: 1, high: 3, gain: 0, eq298: 2 },
    fx: {
      noiseGate: { enabled: true, threshold: -45, attack: 5, release: 80 },
      deesser: { enabled: true, frequency: 7000, threshold: -22, reduction: 5 },
      vocalChain: { enabled: true, hpfFreq: 80, presenceBoost: 3, compThreshold: -18 },
      plateReverb: { enabled: true, wetMix: 0.18, decay: 1.2 },
      reverb: { enabled: true, type: "plate", wetMix: 0.15 },
    },
    fxEnabled: true,
  },
  {
    id: "podcast-clean",
    name: "Podcast Clean",
    description: "Clean speech with noise gate, de-esser, and light EQ",
    icon: "mic",
    console: {
      ...baseConsole(),
      gain: 3,
      pan: 0,
      width: 1,
      compressor: {
        threshold: -18,
        ratio: 4,
        attack: 0.003,
        release: 0.2,
        knee: 25,
        enabled: true,
      },
      limiter: { ceiling: -2, enabled: true },
    },
    eq: { low: -1, mid: 2, high: 3, gain: 0, eq298: 1 },
    fx: {
      noiseGate: { enabled: true, threshold: -40, attack: 5, release: 50 },
      deesser: { enabled: true, frequency: 6500, threshold: -20, reduction: 6 },
      vocalChain: { enabled: true, hpfFreq: 90, presenceBoost: 4, compThreshold: -16 },
    },
    fxEnabled: true,
  },
  {
    id: "music-wide",
    name: "Music Wide",
    description: "Wide stereo music with punchy compression and limiter",
    icon: "music",
    console: {
      ...baseConsole(),
      gain: 0,
      pan: 0,
      width: 1.5,
      compressor: {
        threshold: -14,
        ratio: 2.5,
        attack: 0.01,
        release: 0.3,
        knee: 30,
        enabled: true,
      },
      limiter: { ceiling: -1, enabled: true },
    },
    eq: { low: 3, mid: 0, high: 2, gain: 0, eq298: 0 },
    fx: {
      parallelComp: { enabled: true, blend: 0.25, compressionRatio: 6 },
      plateReverb: { enabled: false, wetMix: 0.08, decay: 0.8 },
    },
    fxEnabled: true,
  },
  {
    id: "live-stage",
    name: "Live Stage",
    description: "Open stage with feedback control and heavy limiting",
    icon: "radio",
    console: {
      ...baseConsole(),
      gain: 0,
      pan: 0,
      width: 1,
      compressor: {
        threshold: -16,
        ratio: 5,
        attack: 0.002,
        release: 0.1,
        knee: 10,
        enabled: true,
      },
      limiter: { ceiling: -1.5, enabled: true },
    },
    eq: { low: -2, mid: 2, high: 3, gain: 0, eq298: 1 },
    fx: {
      noiseGate: { enabled: true, threshold: -38, attack: 3, release: 30 },
      deesser: { enabled: true, frequency: 6000, threshold: -18, reduction: 7 },
      vocalChain: { enabled: true, hpfFreq: 100, presenceBoost: 5, compThreshold: -14 },
    },
    fxEnabled: true,
  },
  {
    id: "instrument-di",
    name: "Instrument DI",
    description: "Direct instrument input with clean gain and EQ",
    icon: "guitar",
    console: {
      ...baseConsole(),
      gain: 5,
      pan: 0,
      width: 1,
      compressor: {
        threshold: -20,
        ratio: 2,
        attack: 0.01,
        release: 0.4,
        knee: 35,
        enabled: true,
      },
      limiter: { ceiling: -0.5, enabled: true },
    },
    eq: { low: 2, mid: 1, high: 2, gain: 0, eq298: 0 },
    fx: {
      parallelComp: { enabled: true, blend: 0.2, compressionRatio: 4 },
    },
    fxEnabled: true,
  },
  {
    id: "broadcast",
    name: "Broadcast",
    description: "EBU R128 broadcast compliant with -23 LUFS target",
    icon: "radio",
    console: {
      ...baseConsole(),
      gain: 0,
      pan: 0,
      width: 1,
      compressor: {
        threshold: -18,
        ratio: 3.5,
        attack: 0.005,
        release: 0.25,
        knee: 20,
        enabled: true,
      },
      limiter: { ceiling: -2, enabled: true },
    },
    eq: { low: 0, mid: 1, high: 1, gain: 0, eq298: 0 },
    fx: {
      noiseGate: { enabled: true, threshold: -50, attack: 10, release: 100 },
      deesser: { enabled: true, frequency: 7000, threshold: -24, reduction: 4 },
      vocalChain: { enabled: true, hpfFreq: 80, presenceBoost: 2, compThreshold: -20 },
    },
    fxEnabled: true,
  },
];

export function getScenePresetById(id: string): ScenePreset | undefined {
  return SCENE_PRESETS.find((s) => s.id === id);
}

export function getScenesForSoundClass(soundClass: string): ScenePreset[] {
  if (soundClass === "podcast") {
    return SCENE_PRESETS.filter((s) => ["podcast-clean", "broadcast", "vocal-reverb"].includes(s.id));
  }
  if (soundClass === "live" || soundClass === "stream") {
    return SCENE_PRESETS.filter((s) => ["live-stage", "vocal-reverb", "broadcast", "instrument-di"].includes(s.id));
  }
  return SCENE_PRESETS;
}
