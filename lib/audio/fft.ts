/**
 * Radix-2 FFT implementation for audio spectral analysis.
 * No external dependencies — pure TypeScript.
 */

export type Complex = { re: number; im: number };

/**
 * In-place radix-2 Cooley-Tukey FFT.
 * Input length must be a power of 2.
 */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n <= 1) return;

  // Bit reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }

  // Cooley-Tukey
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < halfLen; k++) {
        const tRe = curRe * re[i + k + halfLen] - curIm * im[i + k + halfLen];
        const tIm = curRe * im[i + k + halfLen] + curIm * re[i + k + halfLen];
        re[i + k + halfLen] = re[i + k] - tRe;
        im[i + k + halfLen] = im[i + k] - tIm;
        re[i + k] += tRe;
        im[i + k] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/**
 * Hann window function — reduces spectral leakage.
 */
export function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}

/**
 * Compute magnitude spectrum from real/imag FFT output.
 * Returns array of magnitudes (length = n/2 + 1 for one-sided spectrum).
 */
export function magnitudeSpectrum(re: Float64Array, im: Float64Array): Float64Array {
  const n = re.length;
  const half = n >> 1;
  const mag = new Float64Array(half + 1);
  for (let i = 0; i <= half; i++) {
    mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return mag;
}

/**
 * Convert magnitude to dB.
 */
export function magToDb(mag: number): number {
  return mag > 1e-12 ? 20 * Math.log10(mag) : -240;
}
