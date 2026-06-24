/**
 * Web Worker for BPM and Key detection.
 * Runs heavy O(n²) analysis off the main thread to avoid UI freeze.
 */

const KEY_PROFILES = [
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

function detectBpmFromBuffer(channelData, sampleRate) {
  const maxSamples = Math.min(channelData.length, sampleRate * 30);
  const targetRate = 8000;
  const downsampleRatio = Math.floor(sampleRate / targetRate);
  const downsampled = [];
  for (let i = 0; i < maxSamples; i += downsampleRatio) {
    let sum = 0;
    for (let j = 0; j < downsampleRatio && i + j < maxSamples; j++) {
      sum += channelData[i + j];
    }
    downsampled.push(sum / downsampleRatio);
  }

  const dsRate = sampleRate / downsampleRatio;
  const windowSize = Math.floor(dsRate / 100);
  const lowPass = [];
  for (let i = 0; i < downsampled.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -windowSize; j <= windowSize; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < downsampled.length) {
        sum += downsampled[idx] * downsampled[idx];
        count++;
      }
    }
    lowPass.push(sum / count);
  }

  const onsetEnvelope = [];
  for (let i = 1; i < lowPass.length; i++) {
    const diff = lowPass[i] - lowPass[i - 1];
    onsetEnvelope.push(diff > 0 ? diff : 0);
  }

  const minPeriod = Math.floor((60 * dsRate) / 200);
  const maxPeriod = Math.floor((60 * dsRate) / 60);

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
  while (bpm < 60) bpm *= 2;
  while (bpm > 180) bpm /= 2;

  return Math.round(bpm);
}

function detectKeyFromBuffer(channelData, sampleRate) {
  const maxSamples = Math.min(channelData.length, sampleRate * 15);
  const chroma = new Array(12).fill(0);

  // Reduced: 10 windows × 25 MIDI notes = much faster than 50 × 37
  const numWindows = 10;
  const windowSize = Math.floor(maxSamples / numWindows);
  const refFreq = 440;
  const a4Midi = 69;

  for (let w = 0; w < numWindows; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, maxSamples);
    const N = end - start;

    for (let midi = 48; midi <= 72; midi++) { // C3 to C5 (25 notes instead of 37)
      const freq = refFreq * Math.pow(2, (midi - a4Midi) / 12);
      let real = 0;
      let imag = 0;

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

  const chromaSum = chroma.reduce((a, b) => a + b, 0);
  if (chromaSum === 0) return null;
  const normalizedChroma = chroma.map((c) => c / chromaSum);

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

self.onmessage = async (e) => {
  const { url } = e.data;
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = new (self.AudioContext || self.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const bpm = detectBpmFromBuffer(channelData, sampleRate);
    const key = detectKeyFromBuffer(channelData, sampleRate);

    audioCtx.close();
    self.postMessage({ bpm, key });
  } catch (err) {
    self.postMessage({ bpm: null, key: null, error: err.message });
  }
};
