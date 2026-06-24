/**
 * Noise Gate AudioWorklet Processor
 * RMS threshold gate with attack/release smoothing.
 */

class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.rmsSum = 0;
    this.rmsCount = 0;
    this.gain = 1.0;
    this.attackCoef = 0.0;
    this.releaseCoef = 0.0;
    this.threshold = 0.0; // linear
  }

  static get parameterDescriptors() {
    return [
      { name: "threshold", defaultValue: -40, minValue: -60, maxValue: 0 },
      { name: "attack", defaultValue: 5, minValue: 1, maxValue: 100 },
      { name: "release", defaultValue: 50, minValue: 10, maxValue: 500 },
    ];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;

    const sr = globalThis.sampleRate || 44100;
    const thresholdDb = parameters.threshold[0];
    this.threshold = Math.pow(10, thresholdDb / 20);
    const attackMs = parameters.attack[0];
    const releaseMs = parameters.release[0];
    this.attackCoef = Math.exp(-1 / (attackMs * sr / 1000));
    this.releaseCoef = Math.exp(-1 / (releaseMs * sr / 1000));

    const channelCount = Math.min(input.length, output.length);
    const blockSize = input[0].length;

    for (let i = 0; i < blockSize; i++) {
      // Sum RMS across ALL channels for stereo-aware gating
      let sum = 0;
      for (let ch = 0; ch < channelCount; ch++) {
        const s = input[ch][i];
        sum += s * s;
      }
      this.rmsSum += sum / channelCount;
      this.rmsCount++;

      // RMS every 128 samples (~3ms at 44.1kHz)
      if (this.rmsCount >= 128) {
        const rms = Math.sqrt(this.rmsSum / this.rmsCount);
        this.rmsSum = 0;
        this.rmsCount = 0;

        const target = rms > this.threshold ? 1.0 : 0.0;
        const coef = target > this.gain ? this.attackCoef : this.releaseCoef;
        this.gain = target + coef * (this.gain - target);
      }

      // Apply same gain to ALL channels
      for (let ch = 0; ch < channelCount; ch++) {
        output[ch][i] = input[ch][i] * this.gain;
      }
    }

    return true;
  }
}

registerProcessor("noise-gate", NoiseGateProcessor);
