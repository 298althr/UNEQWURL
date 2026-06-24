import { WEQ8Runtime } from "weq8";
import { EQ_BANDS, type EQBand } from "./types";
import type { EQSettings } from "./types";

const EQ_FILTER_BANDS: Exclude<EQBand, "gain">[] = ["low", "mid", "high", "eq298"];

const FILTER_MAP: Record<
  Exclude<EQBand, "gain">,
  {
    type: "lowshelf12" | "peaking12" | "highshelf12";
    freq: number;
    q?: number;
  }
> = {
  low: { type: "lowshelf12", freq: 100 },
  mid: { type: "peaking12", freq: 1000, q: 0.7 },
  high: { type: "highshelf12", freq: 8000 },
  // 298EQ — peaking @ 298 Hz, Q 1.4
  eq298: { type: "peaking12", freq: 298, q: 1.4 },
};

import type { AdvancedFXChain } from "./effects/AdvancedFXChain";

// --- Phase 3: Console settings ---
export interface CompressorSettings {
  threshold: number;   // dB, -60 to 0
  ratio: number;       // 1 to 20
  attack: number;      // seconds, 0 to 1
  release: number;     // seconds, 0 to 1
  knee: number;        // dB, 0 to 40
  enabled: boolean;
}

export interface LimiterSettings {
  ceiling: number;     // dB, -12 to 0
  enabled: boolean;
}

export interface ConsoleSettings {
  gain: number;        // dB, -12 to 12
  pan: number;         // -1 (left) to 1 (right)
  width: number;       // 0 (mono) to 2 (wide), 1 = normal
  compressor: CompressorSettings;
  limiter: LimiterSettings;
}

export function getDefaultConsoleSettings(): ConsoleSettings {
  return {
    gain: 0,
    pan: 0,
    width: 1,
    compressor: {
      threshold: -24,
      ratio: 3,
      attack: 0.003,
      release: 0.25,
      knee: 30,
      enabled: true,
    },
    limiter: {
      ceiling: -1,
      enabled: true,
    },
  };
}

export type AudioChain = {
  ctx: AudioContext;
  runtime: WEQ8Runtime;
  compressor: DynamicsCompressorNode;
  panner: StereoPannerNode;
  limiter: DynamicsCompressorNode;
  channelGain: GainNode;
  makeupGain: GainNode;
  source: MediaElementAudioSourceNode;
  audio: HTMLAudioElement;
  advancedFX?: AdvancedFXChain;
  widthSplitter: ChannelSplitterNode;
  widthMerger: ChannelMergerNode;
  widthMidGain: GainNode; // mid gain (1 = normal)
  widthSideGain: GainNode; // side gain (0 = mono, 1 = normal, 2 = wide)
};

const chains = new WeakMap<HTMLAudioElement, AudioChain>();

function configureRuntime(runtime: WEQ8Runtime) {
  EQ_FILTER_BANDS.forEach((band, i) => {
    const f = FILTER_MAP[band];
    runtime.setFilterType(i, f.type);
    runtime.setFilterFrequency(i, f.freq);
    if (f.q != null) runtime.setFilterQ(i, f.q);
    runtime.setFilterGain(i, 0);
  });
  for (let i = EQ_FILTER_BANDS.length; i < 8; i++) {
    runtime.setFilterType(i, "noop");
  }
}

export function attachAudioChain(audio: HTMLAudioElement, advancedFX?: AdvancedFXChain, existingCtx?: AudioContext): AudioChain {
  const cached = chains.get(audio);
  if (cached && cached.ctx.state !== "closed") {
    return cached;
  }

  const ctx = existingCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
  const runtime = new WEQ8Runtime(ctx);
  configureRuntime(runtime);

  // Compressor (channel strip dynamics)
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, ctx.currentTime);
  compressor.knee.setValueAtTime(30, ctx.currentTime);
  compressor.ratio.setValueAtTime(3, ctx.currentTime);
  compressor.attack.setValueAtTime(0.003, ctx.currentTime);
  compressor.release.setValueAtTime(0.25, ctx.currentTime);

  // Stereo panner (Phase 3)
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(0, ctx.currentTime);

  // Limiter (high-ratio compressor acting as brick-wall limiter)
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-1, ctx.currentTime);
  limiter.knee.setValueAtTime(0, ctx.currentTime);
  limiter.ratio.setValueAtTime(20, ctx.currentTime);
  limiter.attack.setValueAtTime(0.001, ctx.currentTime);
  limiter.release.setValueAtTime(0.05, ctx.currentTime);

  // Channel gain (pre-makeup, user-controlled)
  const channelGain = ctx.createGain();
  channelGain.gain.setValueAtTime(1.0, ctx.currentTime);

  // Stereo width processor (mid/side processing)
  // Split stereo into L/R, then create mid (L+R)/2 and side (L-R)/2
  // Width control scales the side channel
  const widthSplitter = ctx.createChannelSplitter(2);
  const widthMerger = ctx.createChannelMerger(2);
  const widthMidGain = ctx.createGain();   // mid gain
  const widthSideGain = ctx.createGain();  // side gain
  widthMidGain.gain.setValueAtTime(1.0, ctx.currentTime);
  widthSideGain.gain.setValueAtTime(1.0, ctx.currentTime); // 1 = normal stereo

  // We need a matrix to extract mid/side from L/R
  // mid = (L+R)/2, side = (L-R)/2
  // Use a simple approach: connect L and R to mid gain, and L and R (with phase inversion on R) to side gain
  // Since Web Audio doesn't have a phase-invert option natively, use a gain of -1 for R in the side path
  const midInverter = ctx.createGain();
  midInverter.gain.setValueAtTime(0.5, ctx.currentTime);
  const sideInverterL = ctx.createGain();
  sideInverterL.gain.setValueAtTime(0.5, ctx.currentTime);
  const sideInverterR = ctx.createGain();
  sideInverterR.gain.setValueAtTime(-0.5, ctx.currentTime); // invert R for side

  // Makeup gain node
  const makeupGain = ctx.createGain();
  makeupGain.gain.setValueAtTime(1.0, ctx.currentTime);

  const source = ctx.createMediaElementSource(audio);

  // Routing: Source → [AdvancedFX] → WEQ8 → Compressor → Panner → Width → Limiter → ChannelGain → MakeupGain → Destination
  if (advancedFX) {
    source.connect(advancedFX.input);
    advancedFX.connect(runtime.input);
  } else {
    source.connect(runtime.input);
  }
  runtime.connect(compressor);
  compressor.connect(panner);

  // Width processing: panner → splitter → mid/side extraction → merger
  panner.connect(widthSplitter);
  // Mid: (L + R) / 2
  widthSplitter.connect(midInverter, 0);
  widthSplitter.connect(midInverter, 1);
  midInverter.connect(widthMidGain);
  // Side: (L - R) / 2
  widthSplitter.connect(sideInverterL, 0);
  widthSplitter.connect(sideInverterR, 1);
  sideInverterL.connect(widthSideGain);
  sideInverterR.connect(widthSideGain);

  // Reconstruct: L = mid + side, R = mid - side
  const reconL = ctx.createGain();
  const reconR = ctx.createGain();
  const reconRInvert = ctx.createGain();
  reconRInvert.gain.setValueAtTime(-1, ctx.currentTime);

  widthMidGain.connect(reconL);
  widthSideGain.connect(reconL);
  widthMidGain.connect(reconR);
  widthSideGain.connect(reconRInvert);
  reconRInvert.connect(reconR);

  reconL.connect(widthMerger, 0, 0);
  reconR.connect(widthMerger, 0, 1);

  widthMerger.connect(limiter);
  limiter.connect(channelGain);
  channelGain.connect(makeupGain);
  makeupGain.connect(ctx.destination);

  const chain: AudioChain = { ctx, runtime, compressor, panner, limiter, channelGain, makeupGain, source, audio, advancedFX, widthSplitter, widthMerger, widthMidGain, widthSideGain };
  chains.set(audio, chain);
  return chain;
}

export function getAudioChain(audio: HTMLAudioElement): AudioChain | undefined {
  const chain = chains.get(audio);
  if (chain && chain.ctx.state !== "closed") return chain;
  return undefined;
}

export function applyBandGain(chain: AudioChain, band: Exclude<EQBand, "gain">, gain: number) {
  const idx = EQ_FILTER_BANDS.indexOf(band);
  chain.runtime.setFilterGain(idx, gain);
}

function dbToLinear(db: number) {
  return Math.pow(10, db / 20);
}

export function applyAllBandGains(chain: AudioChain, settings: EQSettings, isBypassed: boolean = false) {
  const { ctx } = chain;

  if (!chain || !chain.runtime) {
    console.warn("[applyAllBandGains] chain or runtime missing");
    return;
  }

  if (ctx.state === "closed") {
    console.warn("[applyAllBandGains] AudioContext is closed, skipping");
    return;
  }

  if (isBypassed) {
    // A/B original mode: Set all EQ filter gains to 0, neutral compressor, unity makeup gain
    EQ_FILTER_BANDS.forEach((band, i) => {
      chain.runtime.setFilterGain(i, 0);
    });
    chain.compressor.threshold.setValueAtTime(0, ctx.currentTime);
    chain.compressor.ratio.setValueAtTime(1.0, ctx.currentTime);
    chain.makeupGain.gain.setValueAtTime(1.0, ctx.currentTime);
    console.log("[applyAllBandGains] Bypassed (Console Off)");
  } else {
    // Apply Low, Mid, High, 298EQ via WEQ8 filters
    for (const band of EQ_FILTER_BANDS) {
      applyBandGain(chain, band, settings[band]);
    }

    // Apply user Gain as master output volume
    const userGain = dbToLinear(settings.gain);

    // Dynamic compressor intensity based on 298EQ slider
    const eq298Val = settings.eq298; // Range -12 to 12
    const normalizedIntensity = Math.max(0, (eq298Val + 12) / 24); // 0.0 -> 1.0

    const thresholdVal = -12 - (normalizedIntensity * 16); // -12dB down to -28dB
    const ratioVal = 1.5 + (normalizedIntensity * 3.5); // 1.5 to 5.0
    const makeupVal = (1.0 + (normalizedIntensity * 0.45)) * userGain;

    chain.compressor.threshold.setValueAtTime(thresholdVal, ctx.currentTime);
    chain.compressor.ratio.setValueAtTime(ratioVal, ctx.currentTime);
    chain.makeupGain.gain.setValueAtTime(makeupVal, ctx.currentTime);

    console.log("[applyAllBandGains] Applied", {
      low: settings.low,
      mid: settings.mid,
      high: settings.high,
      gain: settings.gain,
      eq298: settings.eq298,
      threshold: thresholdVal,
      ratio: ratioVal,
      makeup: makeupVal,
      ctxState: ctx.state,
    });
  }
}

export async function resumeAudioChain(chain: AudioChain) {
  if (chain.ctx.state === "suspended") {
    await chain.ctx.resume();
  }
}

/**
 * Apply Phase 3 console settings (pan, width, limiter, channel gain, compressor) to the audio chain.
 */
export function applyConsoleSettings(chain: AudioChain, console: ConsoleSettings) {
  const { ctx } = chain;
  const t = ctx.currentTime;

  // Channel gain (dB to linear)
  const gainLinear = Math.pow(10, console.gain / 20);
  chain.channelGain.gain.setTargetAtTime(gainLinear, t, 0.01);

  // Pan
  chain.panner.pan.setTargetAtTime(console.pan, t, 0.01);

  // Stereo width: scale the side channel
  // width=0 → sideGain=0 (mono), width=1 → sideGain=1 (normal), width=2 → sideGain=2 (wide)
  chain.widthSideGain.gain.setTargetAtTime(console.width, t, 0.01);

  // Compressor
  if (console.compressor.enabled) {
    chain.compressor.threshold.setTargetAtTime(console.compressor.threshold, t, 0.01);
    chain.compressor.ratio.setTargetAtTime(console.compressor.ratio, t, 0.01);
    chain.compressor.attack.setTargetAtTime(console.compressor.attack, t, 0.01);
    chain.compressor.release.setTargetAtTime(console.compressor.release, t, 0.01);
    chain.compressor.knee.setTargetAtTime(console.compressor.knee, t, 0.01);
  } else {
    // Bypass: ratio 1 = no compression
    chain.compressor.ratio.setTargetAtTime(1, t, 0.01);
    chain.compressor.threshold.setTargetAtTime(0, t, 0.01);
  }

  // Limiter
  if (console.limiter.enabled) {
    chain.limiter.threshold.setTargetAtTime(console.limiter.ceiling, t, 0.01);
    chain.limiter.ratio.setTargetAtTime(20, t, 0.01);
  } else {
    chain.limiter.ratio.setTargetAtTime(1, t, 0.01);
    chain.limiter.threshold.setTargetAtTime(0, t, 0.01);
  }
}

/**
 * Get real-time gain reduction from the compressor (in dB).
 */
export function getCompressorGR(chain: AudioChain): number {
  return chain.compressor.reduction;
}

/**
 * Get real-time gain reduction from the limiter (in dB).
 */
export function getLimiterGR(chain: AudioChain): number {
  return chain.limiter.reduction;
}

export function destroyAudioChain(audio: HTMLAudioElement) {
  const chain = chains.get(audio);
  if (!chain) return;
  try {
    chain.source.disconnect();
    chain.compressor.disconnect();
    chain.panner.disconnect();
    chain.limiter.disconnect();
    chain.channelGain.disconnect();
    chain.makeupGain.disconnect();
    chain.widthSplitter.disconnect();
    chain.widthMerger.disconnect();
    chain.widthMidGain.disconnect();
    chain.widthSideGain.disconnect();
    void chain.ctx.close();
  } catch (e) {
    // already torn down
  }
  chains.delete(audio);
}
