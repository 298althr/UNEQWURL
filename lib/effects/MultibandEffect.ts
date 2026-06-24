/**
 * MultibandEffect — 3-band compressor for music mastering.
 * Splits audio into Low (<250Hz), Mid (250Hz–4kHz), High (>4kHz)
 * and applies per-band dynamics compression.
 *
 * Real-world use: taming boomy lows, smoothing harsh mids,
 * controlling sizzly highs without affecting the whole mix.
 */

export type MultibandParams = {
  enabled: boolean;
  lowRatio: number;   // 1–12
  midRatio: number;   // 1–12
  highRatio: number;  // 1–12
};

export class MultibandEffect {
  ctx: AudioContext;
  input: GainNode;
  output: GainNode;
  bypassGain: GainNode;
  fxGain: GainNode;
  params: MultibandParams;

  // Low band: LPF → compressor → gain
  lowFilter: BiquadFilterNode;
  lowComp: DynamicsCompressorNode;
  lowMakeup: GainNode;

  // Mid band: BPF → compressor → gain
  midFilter: BiquadFilterNode;
  midComp: DynamicsCompressorNode;
  midMakeup: GainNode;

  // High band: HPF → compressor → gain
  highFilter: BiquadFilterNode;
  highComp: DynamicsCompressorNode;
  highMakeup: GainNode;

  constructor(ctx: AudioContext, params: MultibandParams) {
    this.ctx = ctx;
    this.params = params ?? { enabled: false, lowRatio: 2, midRatio: 3, highRatio: 2 };

    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.bypassGain = ctx.createGain();
    this.fxGain = ctx.createGain();

    // Low band: everything below 250Hz
    this.lowFilter = ctx.createBiquadFilter();
    this.lowFilter.type = "lowpass";
    this.lowFilter.frequency.value = 250;
    this.lowFilter.Q.value = 0.7;

    this.lowComp = ctx.createDynamicsCompressor();
    this.lowComp.threshold.value = -24;
    this.lowComp.knee.value = 10;
    this.lowComp.ratio.value = this.params.lowRatio;
    this.lowComp.attack.value = 0.02;
    this.lowComp.release.value = 0.25;

    this.lowMakeup = ctx.createGain();
    this.lowMakeup.gain.value = 1.0;

    // Mid band: 250Hz–4kHz
    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = "bandpass";
    this.midFilter.frequency.value = 1500;
    this.midFilter.Q.value = 0.5; // wide band

    this.midComp = ctx.createDynamicsCompressor();
    this.midComp.threshold.value = -22;
    this.midComp.knee.value = 10;
    this.midComp.ratio.value = this.params.midRatio;
    this.midComp.attack.value = 0.01;
    this.midComp.release.value = 0.2;

    this.midMakeup = ctx.createGain();
    this.midMakeup.gain.value = 1.0;

    // High band: everything above 4kHz
    this.highFilter = ctx.createBiquadFilter();
    this.highFilter.type = "highpass";
    this.highFilter.frequency.value = 4000;
    this.highFilter.Q.value = 0.7;

    this.highComp = ctx.createDynamicsCompressor();
    this.highComp.threshold.value = -26;
    this.highComp.knee.value = 10;
    this.highComp.ratio.value = this.params.highRatio;
    this.highComp.attack.value = 0.005;
    this.highComp.release.value = 0.15;

    this.highMakeup = ctx.createGain();
    this.highMakeup.gain.value = 1.0;

    // Routing: input splits to bypass + 3 parallel FX paths
    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    this.input.connect(this.fxGain);
    this.fxGain.connect(this.lowFilter);
    this.lowFilter.connect(this.lowComp);
    this.lowComp.connect(this.lowMakeup);
    this.lowMakeup.connect(this.output);

    this.fxGain.connect(this.midFilter);
    this.midFilter.connect(this.midComp);
    this.midComp.connect(this.midMakeup);
    this.midMakeup.connect(this.output);

    this.fxGain.connect(this.highFilter);
    this.highFilter.connect(this.highComp);
    this.highComp.connect(this.highMakeup);
    this.highMakeup.connect(this.output);

    this.setEnabled(this.params.enabled);
  }

  setEnabled(enabled: boolean): void {
    const now = this.ctx.currentTime;
    const ramp = 0.05;
    if (enabled) {
      this.fxGain.gain.linearRampToValueAtTime(1, now + ramp);
      this.bypassGain.gain.linearRampToValueAtTime(0, now + ramp);
    } else {
      this.fxGain.gain.linearRampToValueAtTime(0, now + ramp);
      this.bypassGain.gain.linearRampToValueAtTime(1, now + ramp);
    }
  }

  update(params: Partial<MultibandParams>): void {
    const now = this.ctx.currentTime;

    if (params.lowRatio !== undefined) {
      this.lowComp.ratio.setTargetAtTime(params.lowRatio, now, 0.05);
    }
    if (params.midRatio !== undefined) {
      this.midComp.ratio.setTargetAtTime(params.midRatio, now, 0.05);
    }
    if (params.highRatio !== undefined) {
      this.highComp.ratio.setTargetAtTime(params.highRatio, now, 0.05);
    }

    if (params.enabled !== undefined) {
      this.setEnabled(params.enabled);
    }

    this.params = { ...this.params, ...params };
  }

  connectInput(source: AudioNode): void {
    source.connect(this.input);
  }

  connectOutput(destination: AudioNode): void {
    this.output.connect(destination);
  }

  destroy(): void {
    this.setEnabled(false);
    try {
      this.input.disconnect();
      this.bypassGain.disconnect();
      this.fxGain.disconnect();
      this.lowFilter.disconnect();
      this.lowComp.disconnect();
      this.lowMakeup.disconnect();
      this.midFilter.disconnect();
      this.midComp.disconnect();
      this.midMakeup.disconnect();
      this.highFilter.disconnect();
      this.highComp.disconnect();
      this.highMakeup.disconnect();
      this.output.disconnect();
    } catch { /* already disconnected */ }
  }
}
