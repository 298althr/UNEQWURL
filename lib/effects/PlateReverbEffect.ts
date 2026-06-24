/**
 * PlateReverbEffect — Short, dense plate reverb for voice demos.
 * Uses synthetic IR (shorter decay than hall reverb) with low wet mix.
 */

export type PlateReverbParams = {
  enabled: boolean;
  wetMix: number;
  decay: number; // seconds
};

function generatePlateIR(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Dense metallic decay characteristic of plate reverb
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-6 * t / duration); // faster initial decay
    // Very dense, almost white noise character
    const noise = (Math.random() * 2 - 1) * env;
    // Metallic ringing: add some high-frequency emphasis
    const ring = i % 20 < 10 ? noise * 0.3 : 0;
    data[i] = noise * 0.99 + ring;
  }

  // Normalize
  let max = 0;
  for (let i = 0; i < length; i++) {
    max = Math.max(max, Math.abs(data[i]));
  }
  if (max > 0) {
    for (let i = 0; i < length; i++) {
      data[i] /= max;
    }
  }

  return buffer;
}

export class PlateReverbEffect {
  ctx: AudioContext;
  convolver: ConvolverNode;
  wetGain: GainNode;
  dryGain: GainNode;
  input: GainNode;
  output: GainNode;
  params: PlateReverbParams;

  constructor(ctx: AudioContext, params: PlateReverbParams) {
    this.ctx = ctx;
    this.params = params;

    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    this.convolver.buffer = generatePlateIR(ctx, params.decay);
    this.convolver.normalize = true;

    this.wetGain.gain.value = params.enabled ? params.wetMix : 0;
    this.dryGain.gain.value = params.enabled ? 1 - params.wetMix : 1;

    this.input.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  update(params: Partial<PlateReverbParams>): void {
    const now = this.ctx.currentTime;
    const ramp = 0.05;

    if (params.wetMix !== undefined || params.enabled !== undefined) {
      const enabled = params.enabled ?? this.params.enabled;
      const wet = enabled ? (params.wetMix ?? this.params.wetMix) : 0;
      const dry = enabled ? 1 - wet : 1;
      this.wetGain.gain.linearRampToValueAtTime(wet, now + ramp);
      this.dryGain.gain.linearRampToValueAtTime(dry, now + ramp);
    }

    if (params.decay !== undefined && params.decay !== this.params.decay) {
      this.convolver.buffer = generatePlateIR(this.ctx, params.decay);
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
      this.convolver.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.output.disconnect();
    } catch { /* already disconnected */ }
  }
}
