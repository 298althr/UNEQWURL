/**
 * FilterSweepEffect — Biquad LPF/HPF.
 * Two modes:
 *   sweep  — LFO-modulated cutoff (classic filter sweep)
 *   static — fixed cutoff frequency (steady HPF/LPF filtering)
 */

export type FilterSweepParams = {
  enabled: boolean;
  type: "lpf" | "hpf";
  mode: "sweep" | "static";
  lfoRate: number; // Hz, only in sweep mode
  resonance: number; // Q
  cutoff: number; // Hz, only in static mode
};

export class FilterSweepEffect {
  ctx: AudioContext;
  filter: BiquadFilterNode;
  input: GainNode;
  output: GainNode;
  params: FilterSweepParams;
  lfoInterval: ReturnType<typeof setInterval> | null = null;
  phase = 0;

  constructor(ctx: AudioContext, params: FilterSweepParams) {
    this.ctx = ctx;
    this.params = params;

    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = params.type === "lpf" ? "lowpass" : "highpass";
    this.filter.Q.value = params.resonance;

    if (params.mode === "static") {
      this.filter.frequency.value = params.cutoff;
    } else {
      this.filter.frequency.value = 1000;
    }

    // Routing
    this.input.connect(this.filter);
    this.filter.connect(this.output);

    if (params.enabled && params.mode === "sweep") {
      this.startLFO();
    }
  }

  startLFO(): void {
    if (this.lfoInterval) return;
    this.phase = 0;
    this.lfoInterval = setInterval(() => {
      const dt = 0.05; // 50ms
      this.phase += 2 * Math.PI * this.params.lfoRate * dt;
      const minFreq = 100;
      const maxFreq = 10000;
      const normalized = (Math.sin(this.phase) + 1) / 2;
      const freq = minFreq + normalized * (maxFreq - minFreq);
      this.filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    }, 50);
  }

  stopLFO(): void {
    if (this.lfoInterval) {
      clearInterval(this.lfoInterval);
      this.lfoInterval = null;
    }
  }

  update(params: Partial<FilterSweepParams>): void {
    const now = this.ctx.currentTime;

    if (params.type !== undefined && params.type !== this.params.type) {
      this.filter.type = params.type === "lpf" ? "lowpass" : "highpass";
    }

    if (params.resonance !== undefined) {
      this.filter.Q.setTargetAtTime(params.resonance, now, 0.05);
    }

    if (params.cutoff !== undefined && this.params.mode === "static") {
      this.filter.frequency.setTargetAtTime(params.cutoff, now, 0.05);
    }

    // Handle mode switch
    const newMode = params.mode ?? this.params.mode;
    const wasEnabled = this.params.enabled;
    const newEnabled = params.enabled ?? wasEnabled;

    if (newMode !== this.params.mode || newEnabled !== wasEnabled) {
      if (newMode === "sweep" && newEnabled) {
        this.startLFO();
      } else {
        this.stopLFO();
        if (newMode === "static") {
          const targetCutoff = params.cutoff ?? this.params.cutoff;
          this.filter.frequency.setTargetAtTime(targetCutoff, now, 0.05);
        } else if (!newEnabled) {
          this.filter.frequency.setTargetAtTime(20000, now, 0.1);
        }
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
    this.stopLFO();
    try {
      this.input.disconnect();
      this.filter.disconnect();
      this.output.disconnect();
    } catch { /* already disconnected */ }
  }
}
