/**
 * libsonare-powered audio analysis engine.
 * Must call ensureInit() before using any function.
 */
import type { DecodedAudio } from "./decoder";

export interface AnalysisResult {
  lufs_integrated: number;
  lufs_momentary: number;
  lufs_short_term: number | null;
  loudness_range: number;
  rms_db: number;
  peak_db: number;
  true_peak_db: number;
  crest_factor_db: number;
  dynamic_range: number;
  spectral_centroid_hz: number;
  spectral_flatness: number;
  spectral_rolloff_hz: number;
  spectral_bandwidth: number;
  spectral_contrast: number[];
  dc_offset: number;
  clipping_detected: boolean;
  clipping_samples: number;
  stereo_correlation: number | null;
  stereo_width: number | null;
  tuning_deviation: number;
  spectrum_snapshot: { freqs: number[]; mags: number[] };
  sample_rate: number;
  duration_seconds: number;
  fft_size: number;
}

let _initPromise: Promise<void> | null = null;
let _isReady = false;

export async function ensureInit(): Promise<void> {
  if (_isReady) return;
  if (!_initPromise) {
    _initPromise = (async () => {
      const sonare = await new Function("return import('@libraz/libsonare')")();
      const { init } = sonare;
      await init();
      _isReady = true;
    })();
  }
  await _initPromise;
}

export async function analyzeWithLibsonare(audio: DecodedAudio): Promise<AnalysisResult> {
  await ensureInit();

  const sonare = await new Function("return import('@libraz/libsonare')")();
  const {
    lufsInterleaved,
    ebur128LoudnessRange,
    spectralContrast,
    spectralCentroid,
    spectralFlatness,
    spectralRolloff,
    spectralBandwidth,
    estimateTuning,
    meteringRmsDb,
    meteringPeakDb,
    meteringTruePeakDb,
    meteringCrestFactorDb,
    meteringDynamicRange,
    meteringDcOffset,
    meteringDetectClipping,
  } = sonare;

  const { samples, sampleRate, duration } = audio;
  const sr = sampleRate;

  const lufsResult = lufsInterleaved(samples, 1, sr);
  const loudnessRange = ebur128LoudnessRange(samples, sr);

  const rmsDb = meteringRmsDb(samples);
  const peakDb = meteringPeakDb(samples);
  const truePeakDb = meteringTruePeakDb(samples, sr);
  const crestFactorDb = meteringCrestFactorDb(samples);
  const dcOffset = meteringDcOffset(samples);
  let dynamicRange = 0;
  try {
    const drReport = meteringDynamicRange(samples, sr);
    dynamicRange = drReport.dynamicRangeDb;
  } catch {
    dynamicRange = crestFactorDb;
  }

  let clippingDetected = false;
  let clippingSamples = 0;
  try {
    const clipResult = meteringDetectClipping(samples, sr);
    clippingSamples = clipResult.clippedSamples || 0;
    clippingDetected = clippingSamples > 0;
  } catch {
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) >= 0.99) clippingSamples++;
    }
    clippingDetected = clippingSamples > 0;
  }

  const centroidArr = spectralCentroid(samples, sr);
  const centroid = meanFloat32(centroidArr);
  const flatnessArr = spectralFlatness(samples, sr);
  const flatness = meanFloat32(flatnessArr);
  const rolloffArr = spectralRolloff(samples, sr);
  const rolloff = meanFloat32(rolloffArr);
  const bandwidthArr = spectralBandwidth(samples, sr);
  const bandwidth = meanFloat32(bandwidthArr);

  let contrastSummary: number[] = [];
  try {
    const contrast = spectralContrast(samples, sr);
    const nBands = contrast.rows;
    const nFrames = contrast.cols;
    const data = contrast.data as Float32Array;
    for (let b = 0; b < nBands; b++) {
      let sum = 0;
      for (let f = 0; f < nFrames; f++) {
        sum += data[b * nFrames + f];
      }
      contrastSummary.push(sum / nFrames);
    }
  } catch {
    contrastSummary = new Array(7).fill(0);
  }

  let tuningDeviation = 0;
  try {
    tuningDeviation = estimateTuning(samples, sr);
  } catch {
    // Non-tonal content may fail tuning
  }

  const snapshot = buildSpectrumSnapshot(samples, sr);

  return {
    lufs_integrated: lufsResult.integratedLufs,
    lufs_momentary: lufsResult.momentaryLufs,
    lufs_short_term: lufsResult.shortTermLufs,
    loudness_range: loudnessRange,
    rms_db: rmsDb,
    peak_db: peakDb,
    true_peak_db: truePeakDb,
    crest_factor_db: crestFactorDb,
    dynamic_range: dynamicRange,
    spectral_centroid_hz: centroid,
    spectral_flatness: flatness,
    spectral_rolloff_hz: rolloff,
    spectral_bandwidth: bandwidth,
    spectral_contrast: contrastSummary,
    dc_offset: dcOffset,
    clipping_detected: clippingDetected,
    clipping_samples: clippingSamples,
    stereo_correlation: null,
    stereo_width: null,
    tuning_deviation: tuningDeviation,
    spectrum_snapshot: snapshot,
    sample_rate: sr,
    duration_seconds: duration,
    fft_size: 2048,
  };
}

function buildSpectrumSnapshot(samples: Float32Array, sampleRate: number): { freqs: number[]; mags: number[] } {
  const N = 2048;
  const start = Math.floor(samples.length / 2 - N / 2);
  const frame = samples.slice(start, start + N);

  const windowed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    windowed[i] = frame[i] * w;
  }

  const numBins = 128;
  const freqs: number[] = [];
  const mags: number[] = [];
  const minFreq = 20;
  const maxFreq = sampleRate / 2;

  for (let b = 0; b < numBins; b++) {
    const freq = minFreq * Math.pow(maxFreq / minFreq, b / (numBins - 1));
    freqs.push(Math.round(freq));

    const k = (freq * N) / sampleRate;
    const w = (2 * Math.PI * k) / N;
    let re = 0, im = 0;
    for (let i = 0; i < N; i++) {
      re += windowed[i] * Math.cos(w * i);
      im += windowed[i] * Math.sin(w * i);
    }
    const mag = Math.sqrt(re * re + im * im) / N;
    mags.push(20 * Math.log10(mag || 1e-10));
  }

  return { freqs, mags };
}

function meanFloat32(arr: Float32Array): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}
