/**
 * librosa Python bridge — calls Python subprocess for musical feature extraction.
 * Extracts BPM, key, chords, sections, MFCC, timbre, HPSS energy ratios.
 */
import { execFileSync } from "child_process";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function findPython(): string | null {
  for (const cmd of ["python3", "python"]) {
    try {
      execFileSync(cmd, ["--version"], { stdio: "pipe", timeout: 5000 });
      return cmd;
    } catch {
      // try next
    }
  }
  return null;
}

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
  const python = findPython();
  if (!python) {
    console.error("[librosa] python3/python not found — cannot extract features");
    return getDefaultFeatures();
  }

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

filepath = sys.argv[1]
y, sr = librosa.load(filepath, sr=22050, duration=120)

# --- BPM ---
try:
    beat_result = librosa.beat.beat_track(y=y, sr=sr)
    # librosa 0.10+ returns (tempo, beats); older versions vary
    if isinstance(beat_result, tuple):
        tempo = float(np.atleast_1d(beat_result[0])[0])
    else:
        tempo = float(np.atleast_1d(beat_result)[0])
except Exception as e:
    tempo = 0.0

# --- Key detection (Krumhansl-Schmuckler style) ---
keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

try:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1)

    best_score = -np.inf
    best_key_idx = 0
    best_mode = "major"
    key_scores = []

    for i in range(12):
        rotated = np.roll(chroma_mean, -i)
        maj_score = float(np.corrcoef(rotated, major_profile)[0, 1])
        min_score = float(np.corrcoef(rotated, minor_profile)[0, 1])
        if np.isnan(maj_score): maj_score = 0.0
        if np.isnan(min_score): min_score = 0.0
        key_scores.append((keys[i], "major", maj_score))
        key_scores.append((keys[i], "minor", min_score))
        if maj_score > best_score:
            best_score = maj_score
            best_key_idx = i
            best_mode = "major"
        if min_score > best_score:
            best_score = min_score
            best_key_idx = i
            best_mode = "minor"

    key_scores.sort(key=lambda x: x[2], reverse=True)
    key_alts = [{"key": k[0], "mode": k[1], "confidence": round(k[2], 4)} for k in key_scores[:3]]

    key_idx = best_key_idx
    key_mode = best_mode
    # Normalize confidence to [0, 1] roughly (corrcoef can be negative)
    key_confidence = max(0.0, min(1.0, (best_score + 1) / 2))
except Exception as e:
    key_idx = 0
    key_mode = "major"
    key_confidence = 0.0
    key_alts = []

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

    const output = execFileSync(python, ["-c", pyScript, tmpWav], {
      encoding: "utf-8",
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
    });

    return JSON.parse(output.trim());
  } catch (e: any) {
    const stderr = e.stderr ? String(e.stderr).slice(0, 500) : "";
    console.error("[librosa] extraction failed:", e.message?.slice(0, 200), stderr);
    return getDefaultFeatures();
  } finally {
    if (existsSync(tmpWav)) {
      try { unlinkSync(tmpWav); } catch { /* ignore */ }
    }
  }
}

function getDefaultFeatures(): AudioFeatures {
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
}
