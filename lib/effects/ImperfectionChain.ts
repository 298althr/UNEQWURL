import type { ImperfectionConfig, ImperfectionMetrics } from "../imperfection-types";

function createNoiseBuffer(ctx: AudioContext, type: "white" | "pink" | "brown") {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
  }
  return buffer;
}

function generateImpulseResponse(ctx: AudioContext, duration: number, decay: number, sampleRate: number) {
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function makeDistortionCurve(amount: number, sampleRate = 44100) {
  const k = Math.max(0, amount) * 10;
  const n = 44100;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export class ImperfectionChain {
  ctx: AudioContext;
  input: GainNode;
  output: GainNode;
  analyser: AnalyserNode;
  config: ImperfectionConfig;

  private nodes: AudioNode[] = [];
  private noiseSources: AudioBufferSourceNode[] = [];
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private leftAnalyser: AnalyserNode;
  private rightAnalyser: AnalyserNode;
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;

  private currentMetrics: ImperfectionMetrics = {
    sti: 1,
    c80: 0,
    spl: -60,
    rt60: 0,
    lufs: -60,
    frequencyResponse: 100,
    correlation: 1,
    leftLevel: -60,
    rightLevel: -60,
    thd: 0,
    speakerHealth: 100,
  };

  constructor(ctx: AudioContext, config?: ImperfectionConfig) {
    this.ctx = ctx;
    this.config = config ? { ...config } : this.getDefaultConfig();

    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.leftAnalyser = ctx.createAnalyser();
    this.leftAnalyser.fftSize = 2048;
    this.rightAnalyser = ctx.createAnalyser();
    this.rightAnalyser.fftSize = 2048;
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);

    this.input.connect(this.splitter);
    this.splitter.connect(this.leftAnalyser, 0);
    this.splitter.connect(this.rightAnalyser, 1);
    this.merger.connect(this.output);

    this.rebuild();
    this.startMetricsLoop();
  }

  private getDefaultConfig(): ImperfectionConfig {
    return {
      cable: { enabled: false, noiseLevel: 20, humLevel: 15, crackleProbability: 0.05, frequencyCutoff: 16000 },
      speakerDamage: { enabled: false, distortionAmount: 25, tornFreqLow: 200, tornFreqHigh: 2000, healthPercent: 80 },
      acoustics: { enabled: false, rt60: 1.2, roomSize: 25, absorption: 0.4, reverbAmount: 30 },
      positioning: { enabled: false, leftDelayMs: 0, rightDelayMs: 0, angle: 0, distance: 3 },
      speakerHealth: { enabled: false, lowFreqLoss: 10, highFreqLoss: 10, overallDegradation: 5 },
      inconsistency: { enabled: false, gainVariance: 10, dropoutsPerMin: 0, phaseVariance: 0 },
      amplifier: { enabled: false, saturation: 10, headroom: -6, warmth: 20 },
      output: { leftGain: 0, rightGain: 0, leftDelayMs: 0, rightDelayMs: 0, leftPolarity: true, rightPolarity: true, balance: 0 },
    };
  }

  updateConfig(config: ImperfectionConfig) {
    this.config = config;
    this.rebuild();
  }

  private rebuild() {
    // Disconnect and clean up old nodes
    this.nodes.forEach((n) => {
      try { n.disconnect(); } catch { /* ignore */ }
    });
    this.noiseSources.forEach((s) => {
      try { s.stop(); s.disconnect(); } catch { /* ignore */ }
    });
    if (this.lfo) { try { this.lfo.stop(); this.lfo.disconnect(); } catch { } this.lfo = null; }
    this.nodes = [];
    this.noiseSources = [];

    // Chain: input -> processing -> splitter -> L/R -> merger -> output
    let chainEnd: AudioNode = this.input;

    const { cable, speakerDamage, acoustics, positioning, speakerHealth, inconsistency, amplifier, output } = this.config;

    // Speaker health (freq response loss)
    if (speakerHealth.enabled) {
      const lowShelf = this.ctx.createBiquadFilter();
      lowShelf.type = "lowshelf";
      lowShelf.frequency.value = 200;
      lowShelf.gain.value = -speakerHealth.lowFreqLoss;

      const highShelf = this.ctx.createBiquadFilter();
      highShelf.type = "highshelf";
      highShelf.frequency.value = 6000;
      highShelf.gain.value = -speakerHealth.highFreqLoss;

      const overall = this.ctx.createGain();
      overall.gain.value = 1 - speakerHealth.overallDegradation / 200;

      chainEnd.connect(lowShelf);
      lowShelf.connect(highShelf);
      highShelf.connect(overall);
      this.nodes.push(lowShelf, highShelf, overall);
      chainEnd = overall;
    }

    // Cable noise / interference
    if (cable.enabled) {
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.value = (cable.noiseLevel / 100) * 0.05;
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = createNoiseBuffer(this.ctx, "pink");
      noiseSrc.loop = true;
      noiseSrc.connect(noiseGain);
      noiseSrc.start();
      this.noiseSources.push(noiseSrc);

      const humOsc = this.ctx.createOscillator();
      humOsc.type = "sine";
      humOsc.frequency.value = 60;
      const humGain = this.ctx.createGain();
      humGain.gain.value = (cable.humLevel / 100) * 0.03;
      humOsc.connect(humGain);
      humOsc.start();
      this.noiseSources.push(humOsc as unknown as AudioBufferSourceNode);

      const crackleGain = this.ctx.createGain();
      crackleGain.gain.value = 0;
      const crackleSrc = this.ctx.createBufferSource();
      crackleSrc.buffer = createNoiseBuffer(this.ctx, "white");
      crackleSrc.loop = true;
      crackleSrc.connect(crackleGain);
      crackleSrc.start();
      this.noiseSources.push(crackleSrc);

      const crackleLFO = this.ctx.createOscillator();
      crackleLFO.type = "square";
      crackleLFO.frequency.value = cable.crackleProbability * 30;
      const crackleLFOGain = this.ctx.createGain();
      crackleLFOGain.gain.value = (cable.crackleProbability / 100) * 0.02;
      crackleLFO.connect(crackleLFOGain);
      crackleLFOGain.connect(crackleGain.gain);
      crackleLFO.start();
      this.noiseSources.push(crackleLFO as unknown as AudioBufferSourceNode);

      const mix = this.ctx.createGain();
      chainEnd.connect(mix);
      noiseGain.connect(mix);
      humGain.connect(mix);
      crackleGain.connect(mix);
      this.nodes.push(mix, noiseGain, humGain, crackleGain, crackleLFOGain);
      chainEnd = mix;
    }

    // Amplifier saturation
    if (amplifier.enabled) {
      const preGain = this.ctx.createGain();
      preGain.gain.value = 1 + amplifier.saturation / 100;
      const clip = this.ctx.createWaveShaper();
      clip.curve = makeDistortionCurve(amplifier.saturation);
      const postGain = this.ctx.createGain();
      postGain.gain.value = 0.7;
      const warmth = this.ctx.createBiquadFilter();
      warmth.type = "lowshelf";
      warmth.frequency.value = 250;
      warmth.gain.value = amplifier.warmth / 10;

      chainEnd.connect(preGain);
      preGain.connect(clip);
      clip.connect(postGain);
      postGain.connect(warmth);
      this.nodes.push(preGain, clip, postGain, warmth);
      chainEnd = warmth;
    }

    // Speaker damage (torn cone distortion)
    if (speakerDamage.enabled) {
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = (speakerDamage.tornFreqLow + speakerDamage.tornFreqHigh) / 2;
      bandpass.Q.value = 2;

      const distort = this.ctx.createWaveShaper();
      distort.curve = makeDistortionCurve(speakerDamage.distortionAmount);
      const damageMix = this.ctx.createGain();
      damageMix.gain.value = speakerDamage.distortionAmount / 200;
      const dry = this.ctx.createGain();
      dry.gain.value = 1 - speakerDamage.distortionAmount / 200;

      const sum = this.ctx.createGain();
      chainEnd.connect(dry);
      chainEnd.connect(bandpass);
      bandpass.connect(distort);
      distort.connect(damageMix);
      dry.connect(sum);
      damageMix.connect(sum);
      this.nodes.push(bandpass, distort, damageMix, dry, sum);
      chainEnd = sum;
    }

    // Acoustics / reverb
    if (acoustics.enabled && acoustics.reverbAmount > 0) {
      const convolver = this.ctx.createConvolver();
      convolver.buffer = generateImpulseResponse(this.ctx, acoustics.rt60, acoustics.absorption + 0.1, this.ctx.sampleRate);
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = acoustics.reverbAmount / 100;
      const dry = this.ctx.createGain();
      dry.gain.value = 1 - acoustics.reverbAmount / 200;
      const sum = this.ctx.createGain();
      chainEnd.connect(dry);
      chainEnd.connect(convolver);
      convolver.connect(reverbGain);
      dry.connect(sum);
      reverbGain.connect(sum);
      this.nodes.push(convolver, reverbGain, dry, sum);
      chainEnd = sum;
    }

    // Inconsistency (gain modulation)
    if (inconsistency.enabled) {
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = "sine";
      this.lfo.frequency.value = 0.5 + inconsistency.gainVariance / 50;
      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.value = inconsistency.gainVariance / 100;
      const modulatedGain = this.ctx.createGain();
      modulatedGain.gain.value = 1;
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(modulatedGain.gain);
      this.lfo.start();
      chainEnd.connect(modulatedGain);
      this.nodes.push(modulatedGain, this.lfoGain);
      chainEnd = modulatedGain;
    }

    // Positioning: delay per channel
    if (positioning.enabled || output.leftDelayMs > 0 || output.rightDelayMs > 0) {
      const splitter = this.ctx.createChannelSplitter(2);
      const merger = this.ctx.createChannelMerger(2);
      const leftDelay = this.ctx.createDelay(0.5);
      const rightDelay = this.ctx.createDelay(0.5);
      leftDelay.delayTime.value = (positioning.leftDelayMs + output.leftDelayMs) / 1000;
      rightDelay.delayTime.value = (positioning.rightDelayMs + output.rightDelayMs) / 1000;

      chainEnd.connect(splitter);
      splitter.connect(leftDelay, 0);
      splitter.connect(rightDelay, 1);
      leftDelay.connect(merger, 0, 0);
      rightDelay.connect(merger, 0, 1);
      this.nodes.push(splitter, leftDelay, rightDelay, merger);
      chainEnd = merger;
    }

    // Output management: per-channel gain, polarity, balance
    const outputSplitter = this.ctx.createChannelSplitter(2);
    const outputMerger = this.ctx.createChannelMerger(2);
    const leftGain = this.ctx.createGain();
    const rightGain = this.ctx.createGain();
    leftGain.gain.value = output.leftGain > 0 ? output.leftGain / 10 : Math.pow(10, output.leftGain / 20);
    rightGain.gain.value = output.rightGain > 0 ? output.rightGain / 10 : Math.pow(10, output.rightGain / 20);
    if (!output.leftPolarity) leftGain.gain.value *= -1;
    if (!output.rightPolarity) rightGain.gain.value *= -1;

    const balanceLeft = this.ctx.createGain();
    const balanceRight = this.ctx.createGain();
    balanceLeft.gain.value = output.balance <= 0 ? 1 : 1 - output.balance;
    balanceRight.gain.value = output.balance >= 0 ? 1 : 1 + output.balance;

    chainEnd.connect(outputSplitter);
    outputSplitter.connect(leftGain, 0);
    outputSplitter.connect(rightGain, 1);
    leftGain.connect(balanceLeft);
    rightGain.connect(balanceRight);
    balanceLeft.connect(outputMerger, 0, 0);
    balanceRight.connect(outputMerger, 0, 1);

    this.nodes.push(outputSplitter, leftGain, rightGain, balanceLeft, balanceRight, outputMerger);
    chainEnd = outputMerger;

    // Final connection: chainEnd is already stereo, route directly to output
    chainEnd.connect(this.output);
    this.output.connect(this.analyser);

    // Update metrics based on config
    this.currentMetrics.rt60 = acoustics.enabled ? acoustics.rt60 : 0;
    this.currentMetrics.speakerHealth = speakerDamage.enabled ? speakerDamage.healthPercent : (speakerHealth.enabled ? 100 - speakerHealth.overallDegradation : 100);
  }

  private startMetricsLoop() {
    const loop = () => {
      this.computeMetrics();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private computeMetrics() {
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);

    let sum = 0;
    let peak = 0;
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const a = Math.abs(v);
      sum += a;
      sumSquares += v * v;
      if (a > peak) peak = a;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    const rmsDb = 20 * Math.log10(Math.max(1e-10, rms));
    const peakDb = 20 * Math.log10(Math.max(1e-10, peak));

    const left = new Float32Array(this.leftAnalyser.fftSize);
    const right = new Float32Array(this.rightAnalyser.fftSize);
    this.leftAnalyser.getFloatTimeDomainData(left);
    this.rightAnalyser.getFloatTimeDomainData(right);

    let leftSum = 0, rightSum = 0, leftSq = 0, rightSq = 0, lr = 0;
    const n = Math.min(left.length, right.length);
    for (let i = 0; i < n; i++) {
      leftSum += left[i];
      rightSum += right[i];
      leftSq += left[i] * left[i];
      rightSq += right[i] * right[i];
      lr += left[i] * right[i];
    }
    const leftMean = leftSum / n;
    const rightMean = rightSum / n;
    const num = lr - n * leftMean * rightMean;
    const den = Math.sqrt((leftSq - n * leftMean * leftMean) * (rightSq - n * rightMean * rightMean));
    const correlation = den > 0 ? num / den : 0;

    const leftRms = Math.sqrt(leftSq / n);
    const rightRms = Math.sqrt(rightSq / n);

    // Approximate STI from correlation and SNR
    const snr = Math.max(0, 60 + rmsDb);
    const sti = Math.max(0, Math.min(1, (correlation + 1) / 2 * (snr / 60)));

    // C80 (clarity) approximation: ratio of early vs late energy
    const early = Math.sqrt(sumSquares / 2); // simplified
    const c80 = 10 * Math.log10(Math.max(1e-10, early / Math.max(1e-10, sumSquares - early)));

    // SPL approximation: RMS dB + 94 dB reference
    const spl = rmsDb + 94;

    // LUFS approximation
    const lufs = rmsDb - 1.1;

    // Frequency response quality score (degrades with damage/health loss)
    let freqScore = 100;
    if (this.config.speakerHealth.enabled) {
      freqScore -= (this.config.speakerHealth.lowFreqLoss + this.config.speakerHealth.highFreqLoss) / 2;
    }
    if (this.config.speakerDamage.enabled) {
      freqScore -= this.config.speakerDamage.distortionAmount * 0.5;
    }
    if (this.config.cable.enabled) {
      freqScore -= this.config.cable.noiseLevel * 0.2;
    }

    // THD approximation from distortion amount
    let thd = 0;
    if (this.config.speakerDamage.enabled) thd += this.config.speakerDamage.distortionAmount;
    if (this.config.amplifier.enabled) thd += this.config.amplifier.saturation;
    thd = Math.min(100, thd);

    this.currentMetrics = {
      sti,
      c80,
      spl,
      rt60: this.config.acoustics.enabled ? this.config.acoustics.rt60 : 0,
      lufs,
      frequencyResponse: Math.max(0, freqScore),
      correlation,
      leftLevel: 20 * Math.log10(Math.max(1e-10, leftRms)),
      rightLevel: 20 * Math.log10(Math.max(1e-10, rightRms)),
      thd,
      speakerHealth: this.currentMetrics.speakerHealth,
    };
  }

  getMetrics(): ImperfectionMetrics {
    return this.currentMetrics;
  }

  destroy() {
    this.nodes.forEach((n) => { try { n.disconnect(); } catch { } });
    this.noiseSources.forEach((s) => { try { s.stop(); s.disconnect(); } catch { } });
    if (this.lfo) { try { this.lfo.stop(); this.lfo.disconnect(); } catch { } }
    try { this.input.disconnect(); } catch { }
    try { this.output.disconnect(); } catch { }
    try { this.analyser.disconnect(); } catch { }
  }
}
