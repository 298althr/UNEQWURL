/**
 * VocalChainEffect — HPF (~80Hz) + Presence boost (~3kHz) + Compressor + MakeupGain.
 * All native Web Audio nodes.
 */

export type VocalChainParams = {
  enabled: boolean;
  hpfFreq: number;
  presenceBoost: number; // dB
  compThreshold: number; // dB
};

export class VocalChainEffect {
  ctx: AudioContext;
  hpf: BiquadFilterNode;
  presence: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  makeupGain: GainNode;
  input: GainNode;
  output: GainNode;
  bypassGain: GainNode;
  fxGain: GainNode;
  params: VocalChainParams;

  constructor(ctx: AudioContext, params: VocalChainParams) {
    this.ctx = ctx;
    this.params = params;

    // Input split: bypass path + FX path
    this.input = ctx.createGain();
    this.bypassGain = ctx.createGain();
    this.fxGain = ctx.createGain();
    this.output = ctx.createGain();

    // FX chain: HPF -> Presence EQ -> Compressor -> Makeup
    this.hpf = ctx.createBiquadFilter();
    this.hpf.type = "highpass";
    this.hpf.frequency.value = params.hpfFreq;
    this.hpf.Q.value = 0.7;

    this.presence = ctx.createBiquadFilter();
    this.presence.type = "peaking";
    this.presence.frequency.value = 3000;
    this.presence.Q.value = 1.0;
    this.presence.gain.value = params.presenceBoost;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = params.compThreshold;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.value = 1.2; // ~1.8dB makeup

    // Routing
    this.input.connect(this.bypassGain);
    this.input.connect(this.fxGain);

    this.fxGain.connect(this.hpf);
    this.hpf.connect(this.presence);
    this.presence.connect(this.compressor);
    this.compressor.connect(this.makeupGain);
    this.makeupGain.connect(this.output);
    this.bypassGain.connect(this.output);

    this.setEnabled(params.enabled);
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

  update(params: Partial<VocalChainParams>): void {
    const now = this.ctx.currentTime;

    if (params.hpfFreq !== undefined) {
      this.hpf.frequency.setTargetAtTime(params.hpfFreq, now, 0.05);
    }

    if (params.presenceBoost !== undefined) {
      this.presence.gain.setTargetAtTime(params.presenceBoost, now, 0.05);
    }

    if (params.compThreshold !== undefined) {
      this.compressor.threshold.setTargetAtTime(params.compThreshold, now, 0.05);
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
    try {
      this.input.disconnect();
      this.bypassGain.disconnect();
      this.fxGain.disconnect();
      this.hpf.disconnect();
      this.presence.disconnect();
      this.compressor.disconnect();
      this.makeupGain.disconnect();
      this.output.disconnect();
    } catch { /* already disconnected */ }
  }
}
