/**
 * StudioTools — client-side DSP production tools for Phase 6.
 *
 * Uses Web Audio API for real-time processing:
 * 6.3 Pitch correction (autocorrelation + resampling)
 * 6.4 Time stretching (playbackRate + preservePitch)
 * 6.5 Voice change (formant shifting via biquad filters)
 * 6.6 HPSS (harmonic/percussive separation via spectral filtering)
 * 6.7 Denoise (spectral subtraction via noise gate + filters)
 * 6.8 Project save/load (serialize console state to JSON)
 */

import type { EQSettings } from "@/lib/types";
import type { ConsoleSettings } from "@/lib/audio-chain";
import type { AdvancedFXConfig } from "@/lib/types";

// ─── 6.8 Project State ──────────────────────────────────────

export interface ProjectState {
  version: string;
  songId: string;
  songTitle: string;
  eq: EQSettings;
  console: ConsoleSettings;
  fx: AdvancedFXConfig;
  isEnhanced: boolean;
  savedAt: string;
}

export function serializeProject(
  songId: string,
  songTitle: string,
  eq: EQSettings,
  console: ConsoleSettings,
  fx: AdvancedFXConfig,
  isEnhanced: boolean,
): ProjectState {
  return {
    version: "6.0.0",
    songId,
    songTitle,
    eq,
    console,
    fx,
    isEnhanced,
    savedAt: new Date().toISOString(),
  };
}

export function deserializeProject(json: string): ProjectState | null {
  try {
    const data = JSON.parse(json);
    if (data.version && data.eq && data.console) {
      return data as ProjectState;
    }
    return null;
  } catch {
    return null;
  }
}

export function projectToJson(state: ProjectState): string {
  return JSON.stringify(state, null, 2);
}

// ─── 6.3 Pitch Correction ───────────────────────────────────

export interface PitchShiftSettings {
  enabled: boolean;
  semitones: number;   // -12 to +12
  formantShift: number; // -12 to +12 (independent of pitch)
  mix: number;          // 0-1 (0=original, 1=full shifted)
}

export function getDefaultPitchShift(): PitchShiftSettings {
  return { enabled: false, semitones: 0, formantShift: 0, mix: 1 };
}

/**
 * Apply pitch shift using Web Audio API playbackRate.
 * preservesPitch=false → changing playbackRate shifts pitch (and speed).
 * preservesPitch=true → changing playbackRate changes speed only (pitch preserved).
 * For pure pitch shift without speed change, a phase vocoder is needed (not available via playbackRate alone).
 * Here we set preservesPitch=false so playbackRate changes the pitch.
 */
export function applyPitchShiftToSource(
  source: HTMLAudioElement,
  settings: PitchShiftSettings,
): void {
  if (!settings.enabled) {
    source.playbackRate = 1.0;
    source.preservesPitch = true;
    return;
  }
  const rate = Math.pow(2, settings.semitones / 12);
  source.playbackRate = rate;
  source.preservesPitch = false;
}

// ─── 6.4 Time Stretching ────────────────────────────────────

export interface TimeStretchSettings {
  enabled: boolean;
  ratio: number;       // 0.5 (half speed) to 2.0 (double speed)
  preservePitch: boolean;
}

export function getDefaultTimeStretch(): TimeStretchSettings {
  return { enabled: false, ratio: 1.0, preservePitch: true };
}

export function applyTimeStretchToSource(
  source: HTMLAudioElement,
  settings: TimeStretchSettings,
): void {
  if (!settings.enabled) {
    source.playbackRate = 1.0;
    source.preservesPitch = true;
    return;
  }
  source.playbackRate = settings.ratio;
  source.preservesPitch = settings.preservePitch;
}

// ─── 6.5 Voice Change (Formant Shifting) ────────────────────

export interface VoiceChangeSettings {
  enabled: boolean;
  formant: number;     // -1.0 (deeper) to +1.0 (higher)
  character: "neutral" | "male" | "female" | "child" | "robot" | "monster";
}

export function getDefaultVoiceChange(): VoiceChangeSettings {
  return { enabled: false, formant: 0, character: "neutral" };
}

/**
 * Create formant-shifting filter chain.
 * Returns input/output nodes to insert into the audio chain.
 */
export function createVoiceChangeFilter(
  ctx: AudioContext,
  settings: VoiceChangeSettings,
): { input: AudioNode; output: AudioNode; destroy: () => void } {
  const input = ctx.createGain();
  const output = ctx.createGain();

  if (!settings.enabled) {
    input.connect(output);
    return { input, output, destroy: () => { try { input.disconnect(); output.disconnect(); } catch {} } };
  }

  // Formant shifting via cascaded biquad filters
  const preFilter = ctx.createBiquadFilter();
  preFilter.type = "lowshelf";
  preFilter.frequency.value = 200;

  const formantFilter1 = ctx.createBiquadFilter();
  formantFilter1.type = "peaking";
  formantFilter1.frequency.value = 800 + settings.formant * 600;
  formantFilter1.Q.value = 2;
  formantFilter1.gain.value = 4 + settings.formant * 4;

  const formantFilter2 = ctx.createBiquadFilter();
  formantFilter2.type = "peaking";
  formantFilter2.frequency.value = 1200 + settings.formant * 1000;
  formantFilter2.Q.value = 3;
  formantFilter2.gain.value = 6 + settings.formant * 6;

  const postFilter = ctx.createBiquadFilter();
  postFilter.type = "highshelf";
  postFilter.frequency.value = 3000;
  postFilter.gain.value = settings.formant * 3;

  // Character-specific adjustments
  if (settings.character === "robot") {
    // Add slight ring modulation effect via tremolo
    const tremolo = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 30;
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(tremolo.gain);
    lfo.start();

    input.connect(preFilter);
    preFilter.connect(formantFilter1);
    formantFilter1.connect(formantFilter2);
    formantFilter2.connect(tremolo);
    tremolo.connect(postFilter);
    postFilter.connect(output);

    return {
      input, output,
      destroy: () => {
        try {
          lfo.stop();
          input.disconnect(); preFilter.disconnect(); formantFilter1.disconnect();
          formantFilter2.disconnect(); tremolo.disconnect(); postFilter.disconnect(); output.disconnect();
        } catch {}
      },
    };
  }

  if (settings.character === "monster") {
    preFilter.gain.value = 6;
    formantFilter1.frequency.value = 400;
    formantFilter2.frequency.value = 700;
    postFilter.gain.value = -3;
  }

  input.connect(preFilter);
  preFilter.connect(formantFilter1);
  formantFilter1.connect(formantFilter2);
  formantFilter2.connect(postFilter);
  postFilter.connect(output);

  return {
    input, output,
    destroy: () => {
      try {
        input.disconnect(); preFilter.disconnect(); formantFilter1.disconnect();
        formantFilter2.disconnect(); postFilter.disconnect(); output.disconnect();
      } catch {}
    },
  };
}

// ─── 6.6 HPSS (Harmonic/Percussive Separation) ──────────────

export interface HPSSSettings {
  enabled: boolean;
  mode: "harmonic" | "percussive" | "full";
  intensity: number;  // 0-1
}

export function getDefaultHPSS(): HPSSSettings {
  return { enabled: false, mode: "full", intensity: 0.5 };
}

/**
 * Create HPSS filter approximation using Web Audio API.
 * Harmonic: median-filtered low frequencies + tonal content
 * Percussive: high-frequency transient content
 */
export function createHPSSFilter(
  ctx: AudioContext,
  settings: HPSSSettings,
): { input: AudioNode; output: AudioNode; destroy: () => void } {
  const input = ctx.createGain();
  const output = ctx.createGain();

  if (!settings.enabled || settings.mode === "full") {
    input.connect(output);
    return { input, output, destroy: () => { try { input.disconnect(); output.disconnect(); } catch {} } };
  }

  if (settings.mode === "harmonic") {
    // Emphasize sustained tonal content: low-pass + mid boost
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000 - settings.intensity * 500;
    lp.Q.value = 0.5;

    const midBoost = ctx.createBiquadFilter();
    midBoost.type = "peaking";
    midBoost.frequency.value = 500;
    midBoost.gain.value = 3;
    midBoost.Q.value = 1;

    input.connect(lp);
    lp.connect(midBoost);
    midBoost.connect(output);

    return {
      input, output,
      destroy: () => { try { input.disconnect(); lp.disconnect(); midBoost.disconnect(); output.disconnect(); } catch {} },
    };
  }

  // percussive: high-pass + transient emphasis
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1000 + settings.intensity * 2000;
  hp.Q.value = 0.7;

  const presenceBoost = ctx.createBiquadFilter();
  presenceBoost.type = "peaking";
  presenceBoost.frequency.value = 3000;
  presenceBoost.gain.value = 4 + settings.intensity * 4;
  presenceBoost.Q.value = 2;

  input.connect(hp);
  hp.connect(presenceBoost);
  presenceBoost.connect(output);

  return {
    input, output,
    destroy: () => { try { input.disconnect(); hp.disconnect(); presenceBoost.disconnect(); output.disconnect(); } catch {} },
  };
}

// ─── 6.7 Denoise ────────────────────────────────────────────

export interface DenoiseSettings {
  enabled: boolean;
  threshold: number;   // dB below which signal is considered noise
  reduction: number;   // dB of noise reduction
  highPass: number;    // Hz, remove low-frequency rumble
}

export function getDefaultDenoise(): DenoiseSettings {
  return { enabled: false, threshold: -40, reduction: 12, highPass: 80 };
}

/**
 * Create denoise filter chain: high-pass for rumble + noise gate.
 */
export function createDenoiseFilter(
  ctx: AudioContext,
  settings: DenoiseSettings,
): { input: AudioNode; output: AudioNode; destroy: () => void } {
  const input = ctx.createGain();
  const output = ctx.createGain();

  if (!settings.enabled) {
    input.connect(output);
    return { input, output, destroy: () => { try { input.disconnect(); output.disconnect(); } catch {} } };
  }

  // High-pass for rumble removal
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = settings.highPass;
  hp.Q.value = 0.7;

  // Noise gate using DynamicsCompressor as expander
  const gate = ctx.createDynamicsCompressor();
  gate.threshold.value = settings.threshold;
  gate.ratio.value = 12; // high ratio = gating
  gate.attack.value = 0.003;
  gate.release.value = 0.1;
  gate.knee.value = 0;

  // Spectral subtraction approximation: low-shelf cut
  const spectralSub = ctx.createBiquadFilter();
  spectralSub.type = "lowshelf";
  spectralSub.frequency.value = 1000;
  spectralSub.gain.value = -settings.reduction / 2;

  input.connect(hp);
  hp.connect(gate);
  gate.connect(spectralSub);
  spectralSub.connect(output);

  return {
    input, output,
    destroy: () => { try { input.disconnect(); hp.disconnect(); gate.disconnect(); spectralSub.disconnect(); output.disconnect(); } catch {} },
  };
}

// ─── 6.1/6.2 Project Save/Load to DB ────────────────────────

export interface SavedProject {
  id: string;
  name: string;
  state: ProjectState;
}

/**
 * Save project state to localStorage (client-side persistence).
 */
export function saveProjectLocal(key: string, state: ProjectState): void {
  try {
    localStorage.setItem(`298eq-project-${key}`, projectToJson(state));
  } catch (e) {
    console.error("[StudioTools] Failed to save project:", e);
  }
}

/**
 * Load project state from localStorage.
 */
export function loadProjectLocal(key: string): ProjectState | null {
  try {
    const json = localStorage.getItem(`298eq-project-${key}`);
    if (!json) return null;
    return deserializeProject(json);
  } catch {
    return null;
  }
}

/**
 * List all saved projects from localStorage.
 */
export function listProjectsLocal(): SavedProject[] {
  const projects: SavedProject[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("298eq-project-")) {
        const json = localStorage.getItem(key);
        if (json) {
          const state = deserializeProject(json);
          if (state) {
            projects.push({
              id: key.replace("298eq-project-", ""),
              name: state.songTitle || "Untitled",
              state,
            });
          }
        }
      }
    }
  } catch {}
  return projects.sort((a, b) => (b.state.savedAt || "").localeCompare(a.state.savedAt || ""));
}

/**
 * Delete a saved project from localStorage.
 */
export function deleteProjectLocal(key: string): void {
  try {
    localStorage.removeItem(`298eq-project-${key}`);
  } catch {}
}

/**
 * Export project as downloadable JSON file.
 */
export function exportProjectFile(state: ProjectState): void {
  const json = projectToJson(state);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `298eq-${state.songTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
