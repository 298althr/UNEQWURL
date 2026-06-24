/**
 * AudioAnalysis — BPM and key detection utilities.
 *
 * - detectBpmFromBuffer: offline analysis of an AudioBuffer
 * - detectKeyFromBuffer: chroma-based key detection from an AudioBuffer
 * - MicBpmDetector: real-time BPM detection from microphone input
 */

// ─── Offline BPM Detection ──────────────────────────────────

/**
 * Detect BPM from an AudioBuffer using low-frequency energy peak analysis.
 * Algorithm: 
 * 1. Filter to low-frequency content (kick/bass range)
 * 2. Compute energy envelope
 * 3. Find autocorrelation peaks to determine tempo
 */
export function detectBpmFromBuffer(buffer: AudioBuffer): number | null {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);

  // Use first 60 seconds max for analysis
  const maxSamples = Math.min(channelData.length, sampleRate * 60);
  
  // Downsample to ~8kHz for faster processing
  const targetRate = 8000;
  const downsampleRatio = Math.floor(sampleRate / targetRate);
  const downsampled: number[] = [];
  for (let i = 0; i < maxSamples; i += downsampleRatio) {
    let sum = 0;
    for (let j = 0; j < downsampleRatio && i + j < maxSamples; j++) {
      sum += channelData[i + j];
    }
    downsampled.push(sum / downsampleRatio);
  }

  const dsRate = sampleRate / downsampleRatio;

  // Low-pass filter: simple moving average to isolate kick/bass
  const windowSize = Math.floor(dsRate / 100); // ~100Hz cutoff
  const lowPass: number[] = [];
  for (let i = 0; i < downsampled.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -windowSize; j <= windowSize; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < downsampled.length) {
        sum += downsampled[idx] * downsampled[idx]; // energy
        count++;
      }
    }
    lowPass.push(sum / count);
  }

  // Compute energy onset envelope (derivative of low-passed energy)
  const onsetEnvelope: number[] = [];
  for (let i = 1; i < lowPass.length; i++) {
    const diff = lowPass[i] - lowPass[i - 1];
    onsetEnvelope.push(diff > 0 ? diff : 0);
  }

  // Autocorrelation to find the period (tempo)
  // BPM range: 60-200 → period in samples at dsRate
  const minPeriod = Math.floor(60 * dsRate / 200); // 200 BPM
  const maxPeriod = Math.floor(60 * dsRate / 60);  // 60 BPM
  
  let bestPeriod = 0;
  let bestCorrelation = 0;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    let count = 0;
    for (let i = 0; i < onsetEnvelope.length - period; i++) {
      correlation += onsetEnvelope[i] * onsetEnvelope[i + period];
      count++;
    }
    if (count > 0) correlation /= count;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  if (bestPeriod === 0) return null;

  let bpm = (60 * dsRate) / bestPeriod;

  // Normalize to 60-180 range
  while (bpm < 60) bpm *= 2;
  while (bpm > 180) bpm /= 2;

  return Math.round(bpm);
}

// ─── Offline Key Detection ──────────────────────────────────

const KEY_PROFILES = [
  // Major keys
  { name: "C", mode: "major", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { name: "C#", mode: "major", intervals: [1, 3, 5, 6, 8, 10, 0] },
  { name: "D", mode: "major", intervals: [2, 4, 6, 7, 9, 11, 1] },
  { name: "D#", mode: "major", intervals: [3, 5, 7, 8, 10, 0, 2] },
  { name: "E", mode: "major", intervals: [4, 6, 8, 9, 11, 1, 3] },
  { name: "F", mode: "major", intervals: [5, 7, 9, 10, 0, 2, 4] },
  { name: "F#", mode: "major", intervals: [6, 8, 10, 11, 1, 3, 5] },
  { name: "G", mode: "major", intervals: [7, 9, 11, 0, 2, 4, 6] },
  { name: "G#", mode: "major", intervals: [8, 10, 0, 1, 3, 5, 7] },
  { name: "A", mode: "major", intervals: [9, 11, 1, 2, 4, 6, 8] },
  { name: "A#", mode: "major", intervals: [10, 0, 2, 3, 5, 7, 9] },
  { name: "B", mode: "major", intervals: [11, 1, 3, 4, 6, 8, 10] },
  // Minor keys
  { name: "C", mode: "minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: "C#", mode: "minor", intervals: [1, 3, 4, 6, 8, 9, 11] },
  { name: "D", mode: "minor", intervals: [2, 4, 5, 7, 9, 10, 0] },
  { name: "D#", mode: "minor", intervals: [3, 5, 6, 8, 10, 11, 1] },
  { name: "E", mode: "minor", intervals: [4, 6, 7, 9, 11, 0, 2] },
  { name: "F", mode: "minor", intervals: [5, 7, 8, 10, 0, 1, 3] },
  { name: "F#", mode: "minor", intervals: [6, 8, 9, 11, 1, 2, 4] },
  { name: "G", mode: "minor", intervals: [7, 9, 10, 0, 2, 3, 5] },
  { name: "G#", mode: "minor", intervals: [8, 10, 11, 1, 3, 4, 6] },
  { name: "A", mode: "minor", intervals: [9, 11, 0, 2, 4, 5, 7] },
  { name: "A#", mode: "minor", intervals: [10, 0, 1, 3, 5, 6, 8] },
  { name: "B", mode: "minor", intervals: [11, 1, 2, 4, 6, 7, 9] },
];

/**
 * Detect musical key from an AudioBuffer using chroma vector analysis.
 * Uses a simplified Krumhansl-Schmuckler key-finding algorithm.
 */
export function detectKeyFromBuffer(buffer: AudioBuffer): { key: string; mode: string } | null {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);

  // Use first 30 seconds for key detection
  const maxSamples = Math.min(channelData.length, sampleRate * 30);

  // Create an OfflineAudioContext for FFT analysis
  const fftSize = 4096;
  const chroma = new Array(12).fill(0);

  // Simple DFT-based chroma computation
  // We sample several windows across the audio
  const numWindows = 50;
  const windowSize = Math.floor(maxSamples / numWindows);
  
  for (let w = 0; w < numWindows; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, maxSamples);
    
    // Compute energy in each pitch class using Goertzel-like algorithm
    // Reference frequency: A4 = 440Hz
    const refFreq = 440;
    const a4Midi = 69;
    
    for (let midi = 48; midi <= 84; midi++) { // C3 to C6
      const freq = refFreq * Math.pow(2, (midi - a4Midi) / 12);
      let real = 0;
      let imag = 0;
      
      const N = end - start;
      for (let i = start; i < end; i++) {
        const t = (i - start) / sampleRate;
        const angle = 2 * Math.PI * freq * t;
        real += channelData[i] * Math.cos(angle);
        imag += channelData[i] * Math.sin(angle);
      }
      
      const magnitude = Math.sqrt(real * real + imag * imag) / N;
      const pitchClass = midi % 12;
      chroma[pitchClass] += magnitude;
    }
  }

  // Normalize chroma
  const chromaSum = chroma.reduce((a, b) => a + b, 0);
  if (chromaSum === 0) return null;
  const normalizedChroma = chroma.map((c) => c / chromaSum);

  // Match against key profiles
  let bestKey = null;
  let bestScore = -Infinity;

  for (const profile of KEY_PROFILES) {
    let score = 0;
    for (let i = 0; i < 12; i++) {
      if (profile.intervals.includes(i)) {
        score += normalizedChroma[i];
      } else {
        score -= normalizedChroma[i] * 0.5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = profile;
    }
  }

  if (!bestKey) return null;
  return { key: bestKey.name, mode: bestKey.mode };
}

// ─── Mic-based BPM Detection ────────────────────────────────

/**
 * MicBpmDetector — real-time BPM detection from microphone input.
 *
 * Algorithm:
 * 1. Capture time-domain audio from mic via AnalyserNode
 * 2. Apply a low-pass filter (extract kick/bass energy < 150Hz)
 * 3. Compute onset envelope (positive derivative of energy)
 * 4. Autocorrelate the onset envelope to find the tempo period/**
 * Mic BPM detection using the well-tested realtime-bpm-analyzer library
 * (https://github.com/dlepaux/realtime-bpm-analyzer)
 * Zero-dependency, AudioWorklet-native, supports microphone, files, and streams.
 */
export class MicBpmDetector {
  private ctx: AudioContext;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private bpmAnalyzer: any = null; // BpmAnalyzer instance from realtime-bpm-analyzer
  private listeners: ((bpm: number | null) => void)[] = [];
  private lastReportedBpm: number | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  async start(): Promise<boolean> {
    try {
      const { createRealtimeBpmAnalyzer } = await import("realtime-bpm-analyzer");

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });

      this.bpmAnalyzer = await createRealtimeBpmAnalyzer(this.ctx, {
        continuousAnalysis: true,
        stabilizationTime: 5000,   // 5s to stabilize (library default is 20s, we make it faster)
        muteTimeInIndexes: 10000,  // default
        debug: false,
      });

      this.sourceNode = this.ctx.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.bpmAnalyzer.node);
      // Do NOT connect analyzer to destination — avoid feedback loop

      // Listen for continuous BPM updates
      this.bpmAnalyzer.on("bpm", (data: any) => {
        const candidate = data.bpm?.[0];
        if (candidate?.tempo) {
          this.lastReportedBpm = Math.round(candidate.tempo);
          this.listeners.forEach((fn) => fn(this.lastReportedBpm));
        }
      });

      // Also listen for stable BPM (higher confidence)
      this.bpmAnalyzer.on("bpmStable", (data: any) => {
        const candidate = data.bpm?.[0];
        if (candidate?.tempo) {
          this.lastReportedBpm = Math.round(candidate.tempo);
          this.listeners.forEach((fn) => fn(this.lastReportedBpm));
        }
      });

      return true;
    } catch (err: any) {
      console.error("[MicBpmDetector] start error:", err);
      return false;
    }
  }

  stop(): void {
    if (this.bpmAnalyzer) {
      try { this.bpmAnalyzer.stop(); } catch {}
      try { this.bpmAnalyzer.disconnect(); } catch {}
      this.bpmAnalyzer = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.lastReportedBpm = null;
  }

  onBpmDetected(callback: (bpm: number | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }
}

// ─── Full Analysis Helper ───────────────────────────────────

export interface AudioAnalysisResult {
  bpm: number | null;
  key: { key: string; mode: string } | null;
}

/**
 * Analyze an audio file URL to detect BPM and key.
 * Uses a Web Worker to avoid blocking the main thread.
 * Times out after 15 seconds.
 */
export async function analyzeAudioFile(
  url: string,
  ctx?: AudioContext,
): Promise<AudioAnalysisResult> {
  return new Promise((resolve) => {
    let resolved = false;
    const timeoutMs = 15000;
    const workerUrl = "/workers/audio-analysis-worker.js";

    let worker: Worker | null = null;
    try {
      worker = new Worker(workerUrl);
    } catch {
      resolve({ bpm: null, key: null });
      return;
    }

    const cleanup = () => {
      if (worker) {
        try { worker.terminate(); } catch {}
        worker = null;
      }
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({ bpm: null, key: null });
      }
    }, timeoutMs);

    worker.onmessage = (e: MessageEvent) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        cleanup();
        resolve({ bpm: e.data.bpm ?? null, key: e.data.key ?? null });
      }
    };

    worker.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        cleanup();
        resolve({ bpm: null, key: null });
      }
    };

    worker.postMessage({ url });
  });
}
