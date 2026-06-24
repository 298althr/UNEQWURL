/**
 * NoiseGateEffect — AudioWorklet wrapper for the noise-gate processor.
 * RMS threshold gate with attack/release smoothing.
 */

import { registerWorklet } from "./AudioWorkletRegistry";

export type NoiseGateParams = {
  enabled: boolean;
  threshold: number; // dB
  attack: number;    // ms
  release: number;   // ms
};

export class NoiseGateEffect {
  ctx: AudioContext;
  node: AudioWorkletNode | null = null;
  input: GainNode;
  output: GainNode;
  bypass: GainNode;
  fxPath: GainNode;
  params: NoiseGateParams;
  isReady = false;

  constructor(ctx: AudioContext, params: NoiseGateParams) {
    this.ctx = ctx;
    this.params = params ?? { enabled: false, threshold: -40, attack: 5, release: 50 };

    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.bypass = ctx.createGain();
    this.fxPath = ctx.createGain();

    // Default routing: input -> bypass -> output (FX path closed)
    this.input.connect(this.bypass);
    this.bypass.connect(this.output);
    this.bypass.gain.value = 1;
    this.fxPath.gain.value = 0;

    this.setEnabled(this.params.enabled);
  }

  async init(): Promise<boolean> {
    if (this.isReady) return true;
    const ok = await registerWorklet(this.ctx, "/worklets/noise-gate-processor.js");
    if (!ok) return false;

    this.node = new AudioWorkletNode(this.ctx, "noise-gate", {
      parameterData: {
        threshold: this.params.threshold,
        attack: this.params.attack,
        release: this.params.release,
      },
    });

    // Wire FX path: input -> fxPath -> worklet -> output
    this.input.connect(this.fxPath);
    this.fxPath.connect(this.node);
    this.node.connect(this.output);

    this.isReady = true;
    return true;
  }

  setEnabled(enabled: boolean): void {
    if (enabled && !this.node) {
      // Worklet not ready — keep bypass open to avoid dead-end silence
      return;
    }
    const now = this.ctx.currentTime;
    const ramp = 0.05;
    this.bypass.gain.cancelScheduledValues(now);
    this.fxPath.gain.cancelScheduledValues(now);
    this.bypass.gain.setValueAtTime(this.bypass.gain.value, now);
    this.fxPath.gain.setValueAtTime(this.fxPath.gain.value, now);
    if (enabled) {
      this.bypass.gain.linearRampToValueAtTime(0, now + ramp);
      this.fxPath.gain.linearRampToValueAtTime(1, now + ramp);
    } else {
      this.bypass.gain.linearRampToValueAtTime(1, now + ramp);
      this.fxPath.gain.linearRampToValueAtTime(0, now + ramp);
    }
  }

  update(params: Partial<NoiseGateParams>): void {
    if (params.enabled !== undefined) {
      this.setEnabled(params.enabled);
    }

    if (!this.node) return;

    const now = this.ctx.currentTime;
    const p = this.node.parameters;

    if (params.threshold !== undefined) {
      p.get("threshold")?.setTargetAtTime(params.threshold, now, 0.02);
    }
    if (params.attack !== undefined) {
      p.get("attack")?.setTargetAtTime(params.attack, now, 0.02);
    }
    if (params.release !== undefined) {
      p.get("release")?.setTargetAtTime(params.release, now, 0.02);
    }

    this.params = { ...this.params, ...params };
  }

  destroy(): void {
    this.setEnabled(false);
    try {
      this.input.disconnect();
      this.bypass.disconnect();
      this.fxPath.disconnect();
      this.node?.disconnect();
    } catch { /* already disconnected */ }
    this.node = null;
    this.isReady = false;
  }
}
