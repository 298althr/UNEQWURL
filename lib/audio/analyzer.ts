/**
 * Audio analyzer — spectral analysis, frequency band energies, dynamics.
 * Takes decoded PCM samples and produces structured analysis data.
 */
import { fft, hannWindow, magnitudeSpectrum, magToDb } from "./fft";
import type { DecodedAudio } from "./decoder";

export interface BandEnergy {
  band: string;
  freqRange: [number, number];
  energyDb: number;      // average energy in dB
  energyLinear: number;  // linear power (sum of squared magnitudes / count)
  relativeEnergy: number; // normalized 0-1 relative to total (linear)
}

export interface AudioAnalysis {
  sampleRate: number;
  duration: number;
  rms: number;            // overall RMS level (linear)
  rmsDb: number;          // RMS in dB
  peakDb: number;         // peak sample in dB
  crestFactor: number;    // peak / RMS ratio
  lufsIntegrated: number; // integrated loudness (LUFS)
  spectralCentroid: number; // brightness centroid in Hz
  spectralTilt: number;   // low/high balance (-1 = dark, +1 = bright)
  bands: {
    low: BandEnergy;      // 20-250 Hz
    eq298: BandEnergy;    // 200-400 Hz
    mid: BandEnergy;      // 250-4000 Hz
    high: BandEnergy;     // 4000-20000 Hz
  };
  avgSpectrum: Float64Array; // averaged one-sided magnitude spectrum
  fftSize: number;
}

const FFT_SIZE = 4096;
const HOP_SIZE = 2048; // 50% overlap

/**
 * Analyze decoded audio samples and return structured analysis.
 */
export function analyzeAudio(audio: DecodedAudio): AudioAnalysis {
  const { samples, sampleRate } = audio;
  const n = samples.length;

  if (n < FFT_SIZE) {
    throw new Error(`Audio too short for analysis: ${n} samples (< ${FFT_SIZE})`);
  }

  // --- Time-domain measurements ---
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    sumSq += s * s;
    const abs = Math.abs(s);
    if (abs > peak) peak = abs;
  }

  const rms = Math.sqrt(sumSq / n);
  const rmsDb = 20 * Math.log10(rms || 1e-10);
  const peakDb = 20 * Math.log10(peak || 1e-10);
  const crestFactor = peak / (rms || 1e-10);

  // LUFS approximation (K-weighted is complex; use simple RMS-based estimate)
  // True LUFS requires K-weighting filter + gating. This is a reasonable approximation.
  const lufsIntegrated = rmsDb - 0.691; // simplified LUFS from RMS

  // --- Frequency-domain analysis ---
  const window = hannWindow(FFT_SIZE);
  const numWindows = Math.floor((n - FFT_SIZE) / HOP_SIZE) + 1;
  const halfFft = FFT_SIZE >> 1;
  const avgMag = new Float64Array(halfFft + 1);

  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);

  for (let w = 0; w < numWindows; w++) {
    const start = w * HOP_SIZE;

    // Apply Hann window
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = samples[start + i] * window[i];
      im[i] = 0;
    }

    fft(re, im);
    const mag = magnitudeSpectrum(re, im);

    for (let i = 0; i <= halfFft; i++) {
      avgMag[i] += mag[i];
    }
  }

  // Average and convert to dB
  for (let i = 0; i <= halfFft; i++) {
    avgMag[i] /= numWindows;
  }

  // --- Band energy computation ---
  const freqToBin = (freq: number) => Math.round((freq * FFT_SIZE) / sampleRate);

  const computeBand = (band: string, lo: number, hi: number): BandEnergy => {
    const loBin = freqToBin(lo);
    const hiBin = Math.min(freqToBin(hi), halfFft);
    let sum = 0;
    let count = 0;
    for (let i = loBin; i <= hiBin; i++) {
      sum += avgMag[i] * avgMag[i];
      count++;
    }
    const energyLinear = count > 0 ? sum / count : 1e-20;
    const energy = Math.sqrt(energyLinear);
    return {
      band,
      freqRange: [lo, hi],
      energyDb: 20 * Math.log10(energy || 1e-20),
      energyLinear,
      relativeEnergy: 0, // filled in after all bands computed
    };
  };

  const bands = {
    low: computeBand("low", 20, 250),
    eq298: computeBand("eq298", 200, 400),
    mid: computeBand("mid", 250, 4000),
    high: computeBand("high", 4000, 20000),
  };

  // Normalize relative energies using LINEAR power (not dB)
  const totalLinear = bands.low.energyLinear + bands.eq298.energyLinear + bands.mid.energyLinear + bands.high.energyLinear;
  const allBands = [bands.low, bands.eq298, bands.mid, bands.high];
  for (const b of allBands) {
    b.relativeEnergy = totalLinear > 0 ? b.energyLinear / totalLinear : 0.25;
  }

  // --- Spectral centroid (brightness) ---
  let weightedSum = 0;
  let magSum = 0;
  for (let i = 0; i <= halfFft; i++) {
    const freq = (i * sampleRate) / FFT_SIZE;
    weightedSum += freq * avgMag[i];
    magSum += avgMag[i];
  }
  const spectralCentroid = magSum > 0 ? weightedSum / magSum : 0;

  // --- Spectral tilt (low vs high balance) using linear power ---
  const lowLin = bands.low.energyLinear + bands.eq298.energyLinear;
  const highLin = bands.high.energyLinear;
  const totalLin = lowLin + highLin;
  // Tilt: ratio of high to total. 0 = all low, 1 = all high, 0.5 = balanced
  // Map to -1..+1: (ratio - 0.5) * 2
  const spectralTilt = totalLin > 0 ? ((highLin / totalLin) - 0.5) * 2 : 0;

  return {
    sampleRate,
    duration: audio.duration,
    rms,
    rmsDb,
    peakDb,
    crestFactor,
    lufsIntegrated,
    spectralCentroid,
    spectralTilt,
    bands,
    avgSpectrum: avgMag,
    fftSize: FFT_SIZE,
  };
}

/**
 * Get the frequency for a given FFT bin index.
 */
export function binToFreq(bin: number, fftSize: number, sampleRate: number): number {
  return (bin * sampleRate) / fftSize;
}
