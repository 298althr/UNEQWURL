/**
 * librosa Python bridge — calls Python subprocess for musical feature extraction.
 * Extracts BPM, key, chords, sections, MFCC, timbre, HPSS energy ratios.
 */
import { execFileSync } from "child_process";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface AudioFeatures {
  bpm: number;
  bpm_confidence: number;
  musical_key: string;
  key_mode: string;
  key_confidence: number;
  key_alternatives: { key: string; mode: string; confidence: number }[];
  chords: { time: number; duration: number; chord: string; confidence: number }[];
  sections: { start: number; end: number; label: string; confidence: number }[];
  timbre: { brightness: number; warmth: number; punchiness: number; roughness: number };
  harmonic_energy: number;
  percussive_energy: number;
  residual_energy: number;
  mfcc_summary: number[];
  onset_count: number;
  onset_density: number;
}

export function extractFeaturesWithLibrosa(input: string, maxDuration: number = 120): AudioFeatures {
  const tmpWav = join(tmpdir(), `298eq_librosa_${Date.now()}.wav`);

  try {
    execFileSync("ffmpeg", [
      "-y", "-i", input,
      "-ac", "1", "-ar", "22050",
      "-t", String(maxDuration),
      "-f", "wav", tmpWav,
    ], { stdio: "pipe", timeout: 60000 });

    const pyScript = `
import librosa
import numpy as np
import json
import sys
import warnings
warnings.filterwarnings("ignore")

y, sr = librosa.load(r"${tmpWav.replace(/\\/g, "/")}", sr=22050)

# --- BPM ---
tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
tempo = float(np.atleast_1d(tempo)[0])

# --- Key detection ---
chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
chroma_mean = chroma.mean(axis=1)
key_idx = int(chroma_mean.argmax())
keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

major_profile = np.array([1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], dtype=float)
minor_profile = np.array([1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0], dtype=float)

def rotate(arr, n):
    return np.roll(arr, n)

maj_score = np.dot(chroma_mean, rotate(major_profile, key_idx))
min_score = np.dot(chroma_mean, rotate(minor_profile, key_idx))

if maj_score > min_score:
    key_mode = "major"
    key_confidence = float(maj_score / (maj_score + min_score))
else:
    key_mode = "minor"
    key_confidence = float(min_score / (maj_score + min_score))

key_scores = []
for i in range(12):
    ms = np.dot(chroma_mean, rotate(major_profile, i))
    ns = np.dot(chroma_mean, rotate(minor_profile, i))
    key_scores.append((keys[i], "major", float(ms)))
    key_scores.append((keys[i], "minor", float(ns)))
key_scores.sort(key=lambda x: x[2], reverse=True)
key_alts = [{"key": k[0], "mode": k[1], "confidence": k[2]} for k in key_scores[:3]]

# --- Chords (simplified) ---
chord_changes = []
try:
    chords = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)
    frames_per_sec = sr // 512
    for i in range(0, chords.shape[1], frames_per_sec):
        frame = chords[:, i:i+frames_per_sec].mean(axis=1)
        idx = int(frame.argmax())
        maj = frame[idx] + frame[(idx+4) % 12] + frame[(idx+7) % 12]
        minn = frame[idx] + frame[(idx+3) % 12] + frame[(idx+7) % 12]
        if maj > minn:
            chord = keys[idx] + ":maj"
        else:
            chord = keys[idx] + ":min"
        chord_changes.append({
            "time": float(i * 512 / sr),
            "duration": 1.0,
            "chord": chord,
            "confidence": float(max(maj, minn) / 3)
        })
except:
    pass

chord_changes = chord_changes[:20]

# --- Sections ---
sections = []
try:
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    bounds = librosa.segment.agglomerative(mfcc, k=5)
    times = librosa.frames_to_time(bounds, sr=sr)
    labels = ["intro", "verse", "chorus", "bridge", "outro"]
    for i in range(len(times) - 1):
        sections.append({
            "start": float(times[i]),
            "end": float(times[i + 1]),
            "label": labels[min(i, len(labels) - 1)],
            "confidence": 0.7
        })
except:
    pass

# --- Timbre ---
centroid = float(librosa.feature.spectral_centroid(y=y, sr=sr).mean())
flatness = float(librosa.feature.spectral_flatness(y=y).mean())
rolloff = float(librosa.feature.spectral_rolloff(y=y, sr=sr).mean())
rms = float(librosa.feature.rms(y=y).mean())
zero_crossing = float(librosa.feature.zero_crossing_rate(y=y).mean())
brightness = min(centroid / 8000, 1.0)
warmth = 1.0 - brightness
punchiness = min(rms * 5, 1.0)
roughness = min(zero_crossing * flatness * 10, 1.0)

# --- HPSS ---
try:
    H, P = librosa.effects.hpss(y)
    harmonic_energy = float(np.sqrt(np.mean(H**2)))
    percussive_energy = float(np.sqrt(np.mean(P**2)))
    residual_energy = float(np.sqrt(np.mean((y - H - P)**2)))
except:
    harmonic_energy = 0.0
    percussive_energy = 0.0
    residual_energy = 0.0

# --- MFCC summary ---
mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
mfcc_summary = [float(x) for x in mfcc.mean(axis=1)]

# --- Onsets ---
try:
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
    onset_count = int(len(onset_frames))
    onset_density = float(onset_count / (len(y) / sr))
except:
    onset_count = 0
    onset_density = 0.0

result = {
    "bpm": tempo,
    "bpm_confidence": 0.8,
    "musical_key": keys[key_idx],
    "key_mode": key_mode,
    "key_confidence": key_confidence,
    "key_alternatives": key_alts,
    "chords": chord_changes,
    "sections": sections,
    "timbre": {
        "brightness": brightness,
        "warmth": warmth,
        "punchiness": punchiness,
        "roughness": roughness
    },
    "harmonic_energy": harmonic_energy,
    "percussive_energy": percussive_energy,
    "residual_energy": residual_energy,
    "mfcc_summary": mfcc_summary,
    "onset_count": onset_count,
    "onset_density": onset_density
}
print(json.dumps(result))
`;

    const output = execFileSync("python3", ["-c", pyScript], {
      encoding: "utf-8",
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
    });

    return JSON.parse(output.trim());
  } catch (e: any) {
    console.error("librosa extraction failed:", e.message?.slice(0, 200));
    return {
      bpm: 0,
      bpm_confidence: 0,
      musical_key: "C",
      key_mode: "major",
      key_confidence: 0,
      key_alternatives: [],
      chords: [],
      sections: [],
      timbre: { brightness: 0, warmth: 0, punchiness: 0, roughness: 0 },
      harmonic_energy: 0,
      percussive_energy: 0,
      residual_energy: 0,
      mfcc_summary: new Array(13).fill(0),
      onset_count: 0,
      onset_density: 0,
    };
  } finally {
    if (existsSync(tmpWav)) {
      try { unlinkSync(tmpWav); } catch { /* ignore */ }
    }
  }
}
