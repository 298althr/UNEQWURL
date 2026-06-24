/**
 * AdvancedFXChain — universal pre-FX sub-graph.
 * All 9 effects are instantiated and connected in series.
 * Any effect can be enabled on any track regardless of upload type.
 * Inserts before WEQ8 EQ in the audio routing.
 *
 * Signal chain:
 *   Source -> [NoiseGate -> Deesser -> VocalChain -> PitchCorrection ->
 *             ParallelComp -> PlateReverb -> Reverb] -> WEQ8
 */

import type { SoundClass, AdvancedFXConfig, FXEffectParams, EffectKey } from "@/lib/types";
import { ReverbEffect } from "./ReverbEffect";
import { VocalChainEffect } from "./VocalChainEffect";
import { ParallelCompEffect } from "./ParallelCompEffect";
import { PlateReverbEffect } from "./PlateReverbEffect";
import { NoiseGateEffect } from "./NoiseGateEffect";
import { DeesserEffect } from "./DeesserEffect";
import { PitchCorrectionEffect } from "./PitchCorrectionEffect";
import { MultibandEffect } from "./MultibandEffect";
import { applyMacro, applyEffectIntensity } from "./MacroController";

const DEFAULT_INTENSITIES: Record<EffectKey, number> = {
  multiband: 0,
  reverb: 0,
  noiseGate: 0,
  deesser: 0,
  vocalChain: 0,
  pitchCorrection: 0,
  parallelComp: 0,
  plateReverb: 0,
};

const DEFAULT_MUSIC_FX: FXEffectParams = {
  multiband: { enabled: false, lowRatio: 2, midRatio: 3, highRatio: 2 },
  reverb: { enabled: false, type: "plate", wetMix: 0.2 },
  noiseGate: { enabled: false, threshold: -40, attack: 5, release: 50 },
  deesser: { enabled: false, frequency: 7000, threshold: -20, reduction: 6 },
  vocalChain: { enabled: false, hpfFreq: 80, presenceBoost: 3, compThreshold: -18 },
  pitchCorrection: { enabled: false, speed: 0.3, amount: 0.5 },
  parallelComp: { enabled: false, blend: 0.3, compressionRatio: 8 },
  plateReverb: { enabled: false, wetMix: 0.12, decay: 1.0 },
};

const DEFAULT_PODCAST_FX: FXEffectParams = {
  multiband: { enabled: false, lowRatio: 2, midRatio: 3, highRatio: 2 },
  reverb: { enabled: false, type: "plate", wetMix: 0.2 },
  noiseGate: { enabled: false, threshold: -40, attack: 5, release: 50 },
  deesser: { enabled: false, frequency: 7000, threshold: -20, reduction: 6 },
  vocalChain: { enabled: false, hpfFreq: 80, presenceBoost: 3, compThreshold: -18 },
  pitchCorrection: { enabled: false, speed: 0.3, amount: 0.5 },
  parallelComp: { enabled: false, blend: 0.3, compressionRatio: 8 },
  plateReverb: { enabled: false, wetMix: 0.12, decay: 1.0 },
};

const DEFAULT_VOICE_FX: FXEffectParams = {
  multiband: { enabled: false, lowRatio: 2, midRatio: 3, highRatio: 2 },
  reverb: { enabled: false, type: "plate", wetMix: 0.2 },
  noiseGate: { enabled: false, threshold: -40, attack: 5, release: 50 },
  deesser: { enabled: false, frequency: 7000, threshold: -20, reduction: 6 },
  vocalChain: { enabled: false, hpfFreq: 80, presenceBoost: 3, compThreshold: -18 },
  pitchCorrection: { enabled: false, speed: 0.3, amount: 0.5 },
  parallelComp: { enabled: false, blend: 0.3, compressionRatio: 8 },
  plateReverb: { enabled: false, wetMix: 0.12, decay: 1.0 },
};

export function getDefaultFXConfig(soundClass: SoundClass): AdvancedFXConfig {
  const base = { enabled: false, soundClass, macroValue: 0, intensities: { ...DEFAULT_INTENSITIES } };
  switch (soundClass) {
    case "music":
      return { ...base, ...DEFAULT_MUSIC_FX };
    case "podcast":
      return { ...base, ...DEFAULT_PODCAST_FX };
    case "live":
      return { ...base, ...DEFAULT_VOICE_FX };
    case "stream":
      return { ...base, ...DEFAULT_MUSIC_FX };
    default:
      return { ...base, ...DEFAULT_MUSIC_FX };
  }
}

export class AdvancedFXChain {
  ctx: AudioContext;
  input: GainNode;
  output: GainNode;
  bypassNode: GainNode;
  fxNode: GainNode;
  config: AdvancedFXConfig;

  // All effects — always instantiated
  multibandEffect: MultibandEffect;
  reverbEffect: ReverbEffect;
  vocalChainEffect: VocalChainEffect;
  parallelCompEffect: ParallelCompEffect;
  plateReverbEffect: PlateReverbEffect;
  noiseGateEffect: NoiseGateEffect;
  deesserEffect: DeesserEffect;
  pitchCorrectionEffect: PitchCorrectionEffect;

  isInitialized = false;

  constructor(ctx: AudioContext, soundClass: SoundClass) {
    this.ctx = ctx;
    this.config = getDefaultFXConfig(soundClass);
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.bypassNode = ctx.createGain();
    this.fxNode = ctx.createGain();
    this.bypassNode.gain.value = 1;
    this.fxNode.gain.value = 0;

    // Instantiate all 9 effects (each has internal bypass)
    this.multibandEffect = new MultibandEffect(ctx, this.config.multiband!);
    this.noiseGateEffect = new NoiseGateEffect(ctx, this.config.noiseGate!);
    this.deesserEffect = new DeesserEffect(ctx, this.config.deesser!);
    this.vocalChainEffect = new VocalChainEffect(ctx, this.config.vocalChain!);
    this.pitchCorrectionEffect = new PitchCorrectionEffect(ctx, this.config.pitchCorrection!);
    this.parallelCompEffect = new ParallelCompEffect(ctx, this.config.parallelComp!);
    this.plateReverbEffect = new PlateReverbEffect(ctx, this.config.plateReverb!);
    this.reverbEffect = new ReverbEffect(ctx, this.config.reverb!);
  }

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    // Init all AudioWorklet effects — failures are swallowed so the rest of the chain works
    try { await this.noiseGateEffect.init(); } catch { /* worklet unavailable */ }
    try { await this.deesserEffect.init(); } catch { /* worklet unavailable */ }
    try { await this.pitchCorrectionEffect.init(); } catch { /* worklet unavailable */ }

    this.isInitialized = true;
    return true;
  }

  connect(destination: AudioNode): void {
    this.input.connect(this.bypassNode);
    this.input.connect(this.fxNode);
    this.bypassNode.connect(this.output);

    // Chain all effects in series (each has internal bypass)
    const chain: { input: AudioNode; output: AudioNode }[] = [
      this.multibandEffect,
      this.noiseGateEffect,
      this.deesserEffect,
      this.vocalChainEffect,
      this.pitchCorrectionEffect,
      this.parallelCompEffect,
      this.plateReverbEffect,
      this.reverbEffect,
    ];

    let current: AudioNode = this.fxNode;
    for (const effect of chain) {
      current.connect(effect.input);
      current = effect.output;
    }
    current.connect(this.output);

    this.output.connect(destination);
  }

  setBypass(bypass: boolean): void {
    const now = this.ctx.currentTime;
    const ramp = 0.05;
    if (bypass) {
      this.bypassNode.gain.linearRampToValueAtTime(1, now + ramp);
      this.fxNode.gain.linearRampToValueAtTime(0, now + ramp);
    } else {
      this.bypassNode.gain.linearRampToValueAtTime(0, now + ramp);
      this.fxNode.gain.linearRampToValueAtTime(1, now + ramp);
    }
  }

  updateConfig(newConfig: Partial<AdvancedFXConfig>): void {
    const prev = this.config;
    this.config = { ...this.config, ...newConfig };

    // Native effects
    this.multibandEffect.update(newConfig.multiband ?? {});
    this.reverbEffect.update(newConfig.reverb ?? {});
    this.vocalChainEffect.update(newConfig.vocalChain ?? {});
    this.parallelCompEffect.update(newConfig.parallelComp ?? {});
    this.plateReverbEffect.update(newConfig.plateReverb ?? {});

    // Worklet effects
    this.noiseGateEffect.update(newConfig.noiseGate ?? {});
    this.deesserEffect.update(newConfig.deesser ?? {});
    this.pitchCorrectionEffect.update(newConfig.pitchCorrection ?? {});

    if (newConfig.enabled !== undefined && newConfig.enabled !== prev.enabled) {
      this.setBypass(!this.config.enabled);
    }
  }

  /** Apply a macro value (0–100) — maps to all effect params for this sound class. */
  setMacro(value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    const mapped = applyMacro(this.config.soundClass, clamped);
    const shouldEnable = clamped > 0;
    this.updateConfig({ macroValue: clamped, enabled: shouldEnable, ...mapped });
  }

  /** Set intensity for a single effect (0–100) — maps to that effect's params. */
  setEffectIntensity(effectKey: string, intensity: number): void {
    const clamped = Math.max(0, Math.min(100, intensity));
    const mapped = applyEffectIntensity(effectKey, clamped);
    const nextIntensities = { ...this.config.intensities, [effectKey]: clamped };
    const anyActive = Object.values(nextIntensities).some((v) => v > 0) || this.config.macroValue > 0;
    this.updateConfig({
      intensities: nextIntensities,
      enabled: anyActive,
      ...mapped,
    } as Partial<AdvancedFXConfig>);
  }

  destroy(): void {
    this.setBypass(true);
    try {
      this.input.disconnect();
      this.output.disconnect();
      this.bypassNode.disconnect();
      this.fxNode.disconnect();
    } catch { /* already disconnected */ }
    this.multibandEffect.destroy();
    this.reverbEffect.destroy();
    this.vocalChainEffect.destroy();
    this.parallelCompEffect.destroy();
    this.plateReverbEffect.destroy();
    this.noiseGateEffect.destroy();
    this.deesserEffect.destroy();
    this.pitchCorrectionEffect.destroy();
  }
}
