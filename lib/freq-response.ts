import type { EQSettings } from "./types";

const FS = 44100;

function peakingResponse(f: number, fc: number, Q: number, gainDb: number): number {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * fc) / FS;
  const w = (2 * Math.PI * f) / FS;
  const alpha = Math.sin(w0) / (2 * Q);

  const b0 = 1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha / A;

  const cw = Math.cos(w);
  const c2w = Math.cos(2 * w);

  const num = b0 * b0 + b1 * b1 + b2 * b2 + 2 * b0 * b1 * cw + 2 * b0 * b2 * c2w + 2 * b1 * b2 * cw;
  const den = a0 * a0 + a1 * a1 + a2 * a2 + 2 * a0 * a1 * cw + 2 * a0 * a2 * c2w + 2 * a1 * a2 * cw;

  const mag = Math.sqrt(num / den);
  return 20 * Math.log10(mag);
}

function lowShelfResponse(f: number, fc: number, gainDb: number): number {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * fc) / FS;
  const w = (2 * Math.PI * f) / FS;
  const S = 1;
  const alpha = (Math.sin(w0) / 2) * Math.sqrt((A * A + 1 / (A * A)) * (1 / S - 1) + 2);

  const b0 = A * ((A + 1) - (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha);
  const b1 = 2 * A * ((A - 1) - (A + 1) * Math.cos(w0));
  const b2 = A * ((A + 1) - (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha);
  const a0 = (A + 1) + (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha;
  const a1 = -2 * ((A - 1) + (A + 1) * Math.cos(w0));
  const a2 = (A + 1) + (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha;

  const cw = Math.cos(w);
  const c2w = Math.cos(2 * w);

  const num = b0 * b0 + b1 * b1 + b2 * b2 + 2 * b0 * b1 * cw + 2 * b0 * b2 * c2w + 2 * b1 * b2 * cw;
  const den = a0 * a0 + a1 * a1 + a2 * a2 + 2 * a0 * a1 * cw + 2 * a0 * a2 * c2w + 2 * a1 * a2 * cw;

  const mag = Math.sqrt(num / den);
  return 20 * Math.log10(mag);
}

function highShelfResponse(f: number, fc: number, gainDb: number): number {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * fc) / FS;
  const w = (2 * Math.PI * f) / FS;
  const S = 1;
  const alpha = (Math.sin(w0) / 2) * Math.sqrt((A * A + 1 / (A * A)) * (1 / S - 1) + 2);

  const b0 = A * ((A + 1) + (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha);
  const b1 = -2 * A * ((A - 1) + (A + 1) * Math.cos(w0));
  const b2 = A * ((A + 1) + (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha);
  const a0 = (A + 1) - (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha;
  const a1 = 2 * ((A - 1) - (A + 1) * Math.cos(w0));
  const a2 = (A + 1) - (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha;

  const cw = Math.cos(w);
  const c2w = Math.cos(2 * w);

  const num = b0 * b0 + b1 * b1 + b2 * b2 + 2 * b0 * b1 * cw + 2 * b0 * b2 * c2w + 2 * b1 * b2 * cw;
  const den = a0 * a0 + a1 * a1 + a2 * a2 + 2 * a0 * a1 * cw + 2 * a0 * a2 * c2w + 2 * a1 * a2 * cw;

  const mag = Math.sqrt(num / den);
  return 20 * Math.log10(mag);
}

export interface FreqPoint {
  freq: number;
  db: number;
}

/**
 * Compute the combined frequency response of all 298EQ filters.
 * Returns an array of {freq, db} points from 20 Hz to 20 kHz.
 */
export function computeFreqResponse(settings: EQSettings, numPoints: number = 200): FreqPoint[] {
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);
  const step = (maxLog - minLog) / (numPoints - 1);

  const points: FreqPoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const logFreq = minLog + step * i;
    const freq = Math.pow(10, logFreq);

    const lowDb = lowShelfResponse(freq, 100, settings.low);
    const midDb = peakingResponse(freq, 1000, 0.7, settings.mid);
    const highDb = highShelfResponse(freq, 8000, settings.high);
    const eq298Db = peakingResponse(freq, 298, 1.4, settings.eq298);
    const gainDb = settings.gain; // master gain is a flat offset

    const totalDb = lowDb + midDb + highDb + eq298Db + gainDb;
    points.push({ freq, db: totalDb });
  }

  return points;
}
