/**
 * ParallelCompEffect — "New York" style parallel compression.
 * Dry path (untouched) blended with heavily compressed path.
 */

export type ParallelCompParams = {
  enabled: boolean;
  blend: number; // 0 = dry, 1 = fully compressed
  compressionRatio: number;
};

export class ParallelCompEffect {
  ctx: AudioContext;
  input: GainNode;
  dryGain: GainNode;
  compGain: GainNode; // input to compressor path
  compressor: DynamicsCompressorNode;
  compMakeup: GainNode;
  blendGain: GainNode; // controls compressed path level
  output: GainNode;
  params: ParallelCompParams;

  constructor(ctx: AudioContext, params: ParallelCompParams) {
    this.ctx = ctx;
    this.params = params;

    this.input = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.compGain = ctx.createGain();
    this.compressor = ctx.createDynamicsCompressor();
    this.compMakeup = ctx.createGain();
    this.blendGain = ctx.createGain();
    this.output = ctx.createGain();

    // Heavily compressed path settings
    this.compressor.threshold.value = -30;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = params.compressionRatio;
    this.compressor.attack.value = 0.001;
    this.compressor.release.value = 0.1;
    this.compMakeup.gain.value = 2.0; // heavy makeup gain

    // Routing:
    // input -> dryGain -> output
    // input -> compGain -> compressor -> compMakeup -> blendGain -> output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.input.connect(this.compGain);
    this.compGain.connect(this.compressor);
    this.compressor.connect(this.compMakeup);
    this.compMakeup.connect(this.blendGain);
    this.blendGain.connect(this.output);

    this.setEnabled(params.enabled);
  }

  setEnabled(enabled: boolean): void {
    const now = this.ctx.currentTime;
    const ramp = 0.05;
    if (enabled) {
      this.dryGain.gain.linearRampToValueAtTime(1 - this.params.blend, now + ramp);
      this.blendGain.gain.linearRampToValueAtTime(this.params.blend, now + ramp);
      this.compGain.gain.linearRampToValueAtTime(1, now + ramp);
    } else {
      this.dryGain.gain.linearRampToValueAtTime(1, now + ramp);
      this.blendGain.gain.linearRampToValueAtTime(0, now + ramp);
      this.compGain.gain.linearRampToValueAtTime(0, now + ramp);
    }
  }

  update(params: Partial<ParallelCompParams>): void {
    const now = this.ctx.currentTime;

    if (params.compressionRatio !== undefined) {
      this.compressor.ratio.setTargetAtTime(params.compressionRatio, now, 0.05);
    }

    if (params.blend !== undefined || params.enabled !== undefined) {
      const enabled = params.enabled ?? this.params.enabled;
      const blend = params.blend ?? this.params.blend;
      if (enabled) {
        this.dryGain.gain.linearRampToValueAtTime(1 - blend, now + 0.05);
        this.blendGain.gain.linearRampToValueAtTime(blend, now + 0.05);
        this.compGain.gain.linearRampToValueAtTime(1, now + 0.05);
      } else {
        this.dryGain.gain.linearRampToValueAtTime(1, now + 0.05);
        this.blendGain.gain.linearRampToValueAtTime(0, now + 0.05);
        this.compGain.gain.linearRampToValueAtTime(0, now + 0.05);
      }
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
      this.dryGain.disconnect();
      this.compGain.disconnect();
      this.compressor.disconnect();
      this.compMakeup.disconnect();
      this.blendGain.disconnect();
      this.output.disconnect();
    } catch { /* already disconnected */ }
  }
}
