/**
 * ReverbEffect — Convolution reverb with wet/dry mix.
 * Uses a synthetic impulse response (noise burst + exponential decay).
 * No external .wav files needed.
 */

export type ReverbParams = {
  enabled: boolean;
  type: "plate" | "hall";
  wetMix: number;
};

function generateIR(ctx: AudioContext, type: "plate" | "hall"): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = type === "plate" ? 1.5 : 3.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Exponential decay factor
  const decay = type === "plate" ? 8.0 : 3.5;
  const density = type === "plate" ? 0.995 : 0.98;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-decay * t);
    // Dense reverb tail = filtered noise
    const noise = (Math.random() * 2 - 1) * env;
    // Early reflection spike at start
    const early = i < 50 ? (Math.random() * 0.5 * (1 - i / 50)) : 0;
    data[i] = noise * density + early;
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

export class ReverbEffect {
  ctx: AudioContext;
  convolver: ConvolverNode;
  wetGain: GainNode;
  dryGain: GainNode;
  input: GainNode;
  output: GainNode;
  params: ReverbParams;

  constructor(ctx: AudioContext, params: ReverbParams) {
    this.ctx = ctx;
    this.params = params;

    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    // Generate and assign IR
    this.convolver.buffer = generateIR(ctx, params.type);
    this.convolver.normalize = true;

    // Wet/dry mix
    this.wetGain.gain.value = params.enabled ? params.wetMix : 0;
    this.dryGain.gain.value = params.enabled ? 1 - params.wetMix : 1;

    // Routing: input -> convolver -> wetGain -> output
    //           input -> dryGain -> output
    this.input.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  update(params: Partial<ReverbParams>): void {
    const now = this.ctx.currentTime;
    const ramp = 0.05;

    if (params.wetMix !== undefined) {
      const wet = params.enabled !== false ? params.wetMix : 0;
      const dry = params.enabled !== false ? 1 - params.wetMix : 1;
      this.wetGain.gain.linearRampToValueAtTime(wet, now + ramp);
      this.dryGain.gain.linearRampToValueAtTime(dry, now + ramp);
    }

    if (params.enabled !== undefined) {
      const wet = params.enabled ? (params.wetMix ?? this.params.wetMix) : 0;
      const dry = params.enabled ? 1 - (params.wetMix ?? this.params.wetMix) : 1;
      this.wetGain.gain.linearRampToValueAtTime(wet, now + ramp);
      this.dryGain.gain.linearRampToValueAtTime(dry, now + ramp);
    }

    // If type changed, regenerate IR
    if (params.type !== undefined && params.type !== this.params.type) {
      this.convolver.buffer = generateIR(this.ctx, params.type);
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
