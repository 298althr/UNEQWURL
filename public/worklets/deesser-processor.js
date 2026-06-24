/**
 * De-esser AudioWorklet Processor
 * Sidechain-style band compressor targeting sibilance (6-8kHz).
 * Uses a biquad peaking filter for detection + envelope follower for gain reduction.
 */

class DeesserProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Biquad state: previous inputs (x1, x2) and previous outputs (y1, y2)
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    // Coefficients
    this.b0 = 1; this.b1 = 0; this.b2 = 0;
    this.a0 = 1; this.a1 = 0; this.a2 = 0;
    // Sidechain
    this.env = 0;
    this.gain = 1.0;
    // Cache last freq to avoid recomputing coeffs every block
    this.lastFreq = -1;
  }

  static get parameterDescriptors() {
    return [
      { name: "frequency", defaultValue: 7000, minValue: 4000, maxValue: 12000 },
      { name: "threshold", defaultValue: -20, minValue: -40, maxValue: 0 },
      { name: "reduction", defaultValue: 6, minValue: 1, maxValue: 20 },
    ];
  }

  computeCoeffs(freq, q, gainDb) {
    const sr = globalThis.sampleRate || 44100;
    const w0 = (2 * Math.PI * freq) / sr;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * q);
    const A = Math.pow(10, gainDb / 40);

    this.b0 =  1 + alpha * A;
    this.b1 = -2 * cosw0;
    this.b2 =  1 - alpha * A;
    this.a0 =  1 + alpha / A;
    this.a1 = -2 * cosw0;
    this.a2 =  1 - alpha / A;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;

    const freq = parameters.frequency[0];
    const thresholdDb = parameters.threshold[0];
    const reductionDb = parameters.reduction[0];

    // Only recompute coefficients when frequency changes
    if (freq !== this.lastFreq) {
      this.computeCoeffs(freq, 2.0, 3); // Q=2, +3dB peaking for detection
      this.lastFreq = freq;
    }

    const threshold = Math.pow(10, thresholdDb / 20);
    const reduction = Math.pow(10, -reductionDb / 20);
    const releaseCoef = Math.exp(-1 / (50 * sampleRate / 1000));

    const channelCount = Math.min(input.length, output.length);
    const blockSize = input[0].length;

    for (let i = 0; i < blockSize; i++) {
      // Sidechain: use LEFT channel for detection, apply reduction to ALL channels
      const x = input[0][i];

      // Biquad peaking filter (direct form I)
      // y[n] = (b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]) / a0
      const y = (this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2
               - this.a1 * this.y1 - this.a2 * this.y2) / this.a0;

      // Shift state
      this.x2 = this.x1; this.x1 = x;
      this.y2 = this.y1; this.y1 = y;

      // Envelope follower on filtered signal
      const level = Math.abs(y);
      this.env = level + releaseCoef * (this.env - level);

      // Gain reduction when sibilance detected
      const targetGain = this.env > threshold ? reduction : 1.0;
      this.gain += 0.05 * (targetGain - this.gain);

      // Apply same reduction to ALL channels (linked stereo de-esser)
      for (let ch = 0; ch < channelCount; ch++) {
        output[ch][i] = input[ch][i] * this.gain;
      }
    }

    return true;
  }
}

registerProcessor("deesser", DeesserProcessor);
