/**
 * DeesserEffect — AudioWorklet wrapper for the deesser processor.
 * Biquad peaking filter detection + envelope follower gain reduction.
 */

import { registerWorklet } from "./AudioWorkletRegistry";

export type DeesserParams = {
  enabled: boolean;
  frequency: number; // Hz
  threshold: number; // dB
  reduction: number; // dB
};

export class DeesserEffect {
  ctx: AudioContext;
  node: AudioWorkletNode | null = null;
  input: GainNode;
  output: GainNode;
  bypass: GainNode;
  fxPath: GainNode;
  params: DeesserParams;
  isReady = false;

  constructor(ctx: AudioContext, params: DeesserParams) {
    this.ctx = ctx;
    this.params = params ?? { enabled: false, frequency: 7000, threshold: -20, reduction: 6 };

    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.bypass = ctx.createGain();
    this.fxPath = ctx.createGain();

    this.input.connect(this.bypass);
    this.bypass.connect(this.output);
    this.bypass.gain.value = 1;
    this.fxPath.gain.value = 0;

    this.setEnabled(this.params.enabled);
  }

  async init(): Promise<boolean> {
    if (this.isReady) return true;
    const ok = await registerWorklet(this.ctx, "/worklets/deesser-processor.js");
    if (!ok) return false;

    this.node = new AudioWorkletNode(this.ctx, "deesser", {
      parameterData: {
        frequency: this.params.frequency,
        threshold: this.params.threshold,
        reduction: this.params.reduction,
      },
    });

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

  update(params: Partial<DeesserParams>): void {
    if (params.enabled !== undefined) {
      this.setEnabled(params.enabled);
    }

    if (!this.node) return;

    const now = this.ctx.currentTime;
    const p = this.node.parameters;

    if (params.frequency !== undefined) {
      p.get("frequency")?.setTargetAtTime(params.frequency, now, 0.02);
    }
    if (params.threshold !== undefined) {
      p.get("threshold")?.setTargetAtTime(params.threshold, now, 0.02);
    }
    if (params.reduction !== undefined) {
      const clamped = Math.max(1, Math.min(20, params.reduction));
      p.get("reduction")?.setTargetAtTime(clamped, now, 0.02);
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
