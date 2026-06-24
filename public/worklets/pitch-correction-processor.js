/**
 * Pitch Correction AudioWorklet Processor
 * Simple autocorrelation pitch detection + basic resampling pitch shift.
 */

class PitchCorrectionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.pitch = 0;
    this.smoothedPitch = 0;
    this.pitchRatio = 1.0;
  }

  static get parameterDescriptors() {
    return [
      { name: "speed", defaultValue: 0.3, minValue: 0.01, maxValue: 1.0 },
      { name: "amount", defaultValue: 0.5, minValue: 0, maxValue: 1.0 },
    ];
  }

  detectPitch(frame) {
    const sr = globalThis.sampleRate || 44100;
    const N = frame.length;
    let bestLag = 0;
    let bestCorr = -1;
    const minLag = Math.floor(sr / 800);  // ~800Hz max
    const maxLag = Math.floor(sr / 80);   // ~80Hz min

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < N - lag; i++) {
        corr += frame[i] * frame[i + lag];
      }
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    return bestLag > 0 ? sr / bestLag : 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;

    const speed = parameters.speed[0];
    const amount = parameters.amount[0];

    const channelCount = Math.min(input.length, output.length);
    const blockSize = input[0].length;

    for (let i = 0; i < blockSize; i++) {
      // Use LEFT channel for pitch detection
      const sample = input[0][i];

      // Write to circular buffer
      this.buffer[this.writeIndex] = sample;
      this.writeIndex = (this.writeIndex + 1) % this.buffer.length;

      // Pitch detection every 512 samples
      if (this.writeIndex % 512 === 0) {
        const frame = new Float32Array(1024);
        for (let j = 0; j < 1024; j++) {
          const idx = (this.writeIndex - 1024 + j + this.buffer.length) % this.buffer.length;
          frame[j] = this.buffer[idx];
        }
        this.pitch = this.detectPitch(frame);
        const sr = globalThis.sampleRate || 44100;
        if (this.pitch > 0 && this.pitch < sr / 2) {
          const semitones = Math.round(Math.log2(this.pitch / 440) * 12);
          const target = 440 * Math.pow(2, semitones / 12);
          const ratio = target / this.pitch;
          this.pitchRatio = 1.0 + (ratio - 1.0) * amount;
          // Clamp ratio to avoid extreme shifts
          if (this.pitchRatio < 0.5) this.pitchRatio = 0.5;
          if (this.pitchRatio > 2.0) this.pitchRatio = 2.0;
        }
      }

      // Simple resampling pitch shift with crossfade
      this.readIndex += this.pitchRatio;
      // Wrap around circular buffer (handles both positive and negative)
      this.readIndex = ((this.readIndex % this.buffer.length) + this.buffer.length) % this.buffer.length;

      const idx = Math.floor(this.readIndex);
      const frac = this.readIndex - idx;
      const s0 = this.buffer[idx % this.buffer.length];
      const s1 = this.buffer[(idx + 1) % this.buffer.length];
      const shifted = s0 + frac * (s1 - s0);

      // Apply same pitch shift to ALL channels (mono pitch detect, stereo output)
      for (let ch = 0; ch < channelCount; ch++) {
        output[ch][i] = shifted;
      }
    }

    return true;
  }
}

registerProcessor("pitch-correction", PitchCorrectionProcessor);
