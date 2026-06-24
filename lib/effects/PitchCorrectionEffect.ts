/**
 * PitchCorrectionEffect — AudioWorklet wrapper for the pitch-correction processor.
 * Autocorrelation pitch detect + resampling pitch shift.
 */

import { registerWorklet } from "./AudioWorkletRegistry";

export type PitchCorrectionParams = {
  enabled: boolean;
  speed: number;  // 0-1
  amount: number; // 0-1
};

export class PitchCorrectionEffect {
  ctx: AudioContext;
  node: AudioWorkletNode | null = null;
  input: GainNode;
  output: GainNode;
  bypass: GainNode;
  fxPath: GainNode;
  params: PitchCorrectionParams;
  isReady = false;

  constructor(ctx: AudioContext, params: PitchCorrectionParams) {
    this.ctx = ctx;
    this.params = params ?? { enabled: false, speed: 0.3, amount: 0.5 };

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
    const ok = await registerWorklet(this.ctx, "/worklets/pitch-correction-processor.js");
    if (!ok) return false;

    this.node = new AudioWorkletNode(this.ctx, "pitch-correction", {
      parameterData: {
        speed: this.params.speed,
        amount: this.params.amount,
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

  update(params: Partial<PitchCorrectionParams>): void {
    if (params.enabled !== undefined) {
      this.setEnabled(params.enabled);
    }

    if (!this.node) return;

    const now = this.ctx.currentTime;
    const p = this.node.parameters;

    if (params.speed !== undefined) {
      p.get("speed")?.setTargetAtTime(params.speed, now, 0.02);
    }
    if (params.amount !== undefined) {
      p.get("amount")?.setTargetAtTime(params.amount, now, 0.02);
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
