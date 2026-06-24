/* ============================================================
   STAGED LEARNING — Knowledge graph for the EQ Room
   Each stage unlocks zones progressively, with hints from
   the console guide docs and a quiz to proceed.
   ============================================================ */

export type ZoneId =
  | "A" | "B" | "C" | "D" | "D2" | "D3" | "D4"
  | "E" | "F" | "G" | "H" | "I";

export type StageStatus = "completed" | "pending" | "locked";

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface LearningStage {
  id: number;
  name: string;
  tagline: string;
  zones: ZoneId[];
  hints: string[];
  quiz: QuizQuestion[];
}

export interface StageProgress {
  stageId: number;
  status: StageStatus;
  skippedAt?: string;
  completedAt?: string;
}

export const LEARNING_STAGES: LearningStage[] = [
  {
    id: 1,
    name: "Setup & Listening",
    tagline: "Choose your output device, load a track, and hear the difference",
    zones: ["A", "B", "C"],
    hints: [
      "Select your headphones or speakers in Zone A. The system warns if bass frequencies may be inaudible on small drivers.",
      "Press Play to start the track. Use the waveform to seek to any position. The player auto-detects BPM and musical key.",
      "Toggle A/B Compare to switch between Original (bypass) and Enhanced (298EQ on). Listen for differences in clarity, warmth, and presence.",
      "The signal chain flows: Source → Advanced FX → WEQ8 EQ → Compressor → Panner → Width → Limiter → Gain → Output. A/B bypasses all processing.",
    ],
    quiz: [
      {
        q: "What does the A/B Compare toggle do?",
        options: [
          "Switches between two different songs",
          "Toggles between Original (bypass) and Enhanced (298EQ processed) audio",
          "Changes the volume level",
          "Switches between headphones and speakers",
        ],
        answer: 1,
        explanation: "A/B Compare bypasses all EQ, compression, and FX processing so you can hear the original unprocessed audio vs the enhanced signal.",
      },
      {
        q: "Why does the system warn about bass frequencies on small drivers?",
        options: [
          "Small drivers can damage your hearing",
          "Small drivers cannot reproduce low frequencies accurately",
          "Small drivers use too much power",
          "It's a bug — ignore it",
        ],
        answer: 1,
        explanation: "Earbuds, laptop speakers, and phone speakers have small drivers that physically cannot move enough air to reproduce sub-bass frequencies.",
      },
    ],
  },
  {
    id: 2,
    name: "Visual Analysis",
    tagline: "See what you hear — spectrum analyzer and VU meter",
    zones: ["D"],
    hints: [
      "The Spectrum Analyzer shows a live FFT (Fast Fourier Transform) of the audio — frequency on the X axis (logarithmic, 20Hz–20kHz), amplitude on the Y axis.",
      "The VU Meter displays Peak dBFS (absolute highest sample) and RMS dBFS (average power over time). The clip indicator lights red when samples hit 0 dBFS.",
      "Crest Factor = Peak − RMS. High crest factor means punchy transients (drums). Low crest factor means compressed/dense sound (limited master).",
      "Frequency bands: Sub-bass (20–60Hz), Bass (60–250Hz), Low-mids (250–500Hz), Mids (500Hz–2kHz), Presence (2–5kHz), Brightness (5–10kHz), Air (10–20kHz).",
    ],
    quiz: [
      {
        q: "What does RMS dBFS represent?",
        options: [
          "The absolute highest sample value",
          "The average power of the signal over time",
          "The perceived loudness in LUFS",
          "The frequency response curve",
        ],
        answer: 1,
        explanation: "RMS (Root Mean Square) is the average power over a time window — it correlates with how loud the signal feels, unlike peak which is just the highest instantaneous value.",
      },
      {
        q: "If you see energy buildup around 250–500 Hz on the spectrum, what might the issue be?",
        options: [
          "Too much treble / harshness",
          "Boxy, congested low-mids — muddy mix",
          "Sub-bass rumble",
          "Sibilance at 8kHz",
        ],
        answer: 1,
        explanation: "The 250–500 Hz range is where 'boxiness' and 'muddiness' live. Cutting 3–6 dB here often clears up a congested mix.",
      },
    ],
  },
  {
    id: 3,
    name: "Console Controls",
    tagline: "Gain, pan, width, compression, and loudness metering",
    zones: ["D2"],
    hints: [
      "Console Strip: Gain adjusts channel level, Pan positions the signal left/right using a StereoPannerNode, Width controls stereo spread via Mid/Side processing.",
      "Compressor parameters: Threshold (level above which compression begins), Ratio (how much signal above threshold is reduced), Attack (how fast it reacts), Release (how fast gain returns), Knee (softness of threshold transition).",
      "The Limiter is a compressor with ratio 20:1 acting as a brick-wall ceiling. The Gain Reduction (GR) meter shows how much it's working.",
      "LUFS (Loudness Units Full Scale) is a K-weighted perceived loudness measure. Streaming platforms target -14 LUFS. The LUFS meter shows your integrated loudness vs the target.",
    ],
    quiz: [
      {
        q: "What does the compressor threshold control?",
        options: [
          "How much the signal is reduced",
          "The level above which compression begins",
          "How fast the compressor reacts",
          "The output volume after compression",
        ],
        answer: 1,
        explanation: "Threshold is the dB level above which the compressor starts reducing gain. Signals below the threshold pass through unaffected.",
      },
      {
        q: "What is the target LUFS for streaming platforms?",
        options: ["-24 LUFS", "-14 LUFS", "0 LUFS", "-6 LUFS"],
        answer: 1,
        explanation: "Most streaming platforms (Spotify, Apple Music, YouTube) normalize to approximately -14 LUFS integrated. Mixing to this target avoids platform re-normalization.",
      },
      {
        q: "What does the Width control do?",
        options: [
          "Adjusts the stereo spread using Mid/Side processing",
          "Changes the frequency bandwidth",
          "Controls the compressor sidechain",
          "Sets the EQ Q factor",
        ],
        answer: 0,
        explanation: "Width uses Mid/Side (M/S) processing — it adjusts the level of the side (stereo difference) signal relative to the mid (mono sum), making the stereo field wider or narrower.",
      },
    ],
  },
  {
    id: 4,
    name: "EQ Adjustment",
    tagline: "Shape frequency balance with the 5-band EQ and presets",
    zones: ["F"],
    hints: [
      "The 5-band EQ: Low (100Hz shelf), Mid (1kHz peak), High (8kHz shelf), 298EQ (298Hz peaking Q=1.4), Gain (makeup gain ±12dB).",
      "298Hz is the signature band — it addresses the 'boxy' low-mid region that plagues small speakers and poor recordings.",
      "EQ Presets save and recall complete EQ + FX configurations. The Macro Fader drives all Advanced FX parameters with a single genre-aware knob.",
      "The Quality Score (0–100) is computed from EQ deviation vs the genre benchmark. Aim for 70+ by matching the benchmark curve.",
      "Troubleshooting: Muddy mix → cut 250–500Hz. Harsh → cut 2–5kHz. Dull → boost 8–10kHz. Boomy → cut 60–100Hz. Nasal → cut 500Hz–1kHz.",
    ],
    quiz: [
      {
        q: "Which EQ band would you cut to fix a 'muddy' mix?",
        options: [
          "High (8kHz)",
          "298EQ (298Hz) or Low (100Hz)",
          "Mid (1kHz)",
          "Gain",
        ],
        answer: 1,
        explanation: "Muddiness lives in the low-mids. The 298Hz band targets this directly, and cutting Low (100Hz) can reduce sub-bass buildup that contributes to mud.",
      },
      {
        q: "What does the Macro Fader do?",
        options: [
          "Controls only the reverb amount",
          "Drives all Advanced FX parameters with a single genre-aware knob",
          "Adjusts the master volume",
          "Sets the compressor ratio",
        ],
        answer: 1,
        explanation: "The Macro Fader maps a 0–100 value to all 9 Advanced FX parameters simultaneously, with curves tailored to the selected sound class (Music, Podcast, Live, Stream).",
      },
      {
        q: "What frequency does the 298EQ band target?",
        options: ["100 Hz", "298 Hz", "1 kHz", "8 kHz"],
        answer: 1,
        explanation: "298Hz with Q=1.4 — the signature band that addresses boxy low-mid coloration common in small-speaker playback and untreated recordings.",
      },
    ],
  },
  {
    id: 5,
    name: "Reference & Live Mode",
    tagline: "Match genre benchmarks and mix live audio from microphone",
    zones: ["D3", "D4"],
    hints: [
      "Reference Match fetches the genre benchmark EQ curve and shows deviations. Click 'Apply Corrections' to auto-adjust your EQ toward the benchmark.",
      "The Reference Panel shows a score ring (0–100), genre, reference track name, and deviation bars per frequency band with a legend.",
      "Live Mode enables microphone input via getUserMedia. The input level meter shows your mic signal. Clip and DC offset warnings protect your signal chain.",
      "Scene Presets apply a complete console + EQ + FX configuration instantly. Click a scene to apply it. Click the same scene again to toggle it off and return to flat.",
      "Context priorities differ: Music → Frequency Balance first. Podcast → Intelligibility first. Live → SPL/Dynamics first. Stream → Consistency/LUFS first.",
    ],
    quiz: [
      {
        q: "What does Reference Match do?",
        options: [
          "Matches your EQ to another student's mix",
          "Compares your mix to a genre benchmark curve and offers corrections",
          "Automatically masters your track",
          "Switches between two reference songs",
        ],
        answer: 1,
        explanation: "Reference Match fetches genre-specific benchmark EQ curves and shows how your mix deviates. 'Apply Corrections' adjusts your EQ bands toward the benchmark.",
      },
      {
        q: "What happens when you click an active scene preset again?",
        options: [
          "Nothing — it stays active",
          "It cycles to the next scene",
          "It deactivates and restores flat/default settings",
          "It saves the current settings as a new scene",
        ],
        answer: 2,
        explanation: "Scene presets toggle: clicking the same active scene again deactivates it, restoring default console settings and flat EQ (all bands to 0).",
      },
    ],
  },
  {
    id: 6,
    name: "Learning Tools",
    tagline: "Train your ears with frequency sweep, noise injection, and clipping demo",
    zones: ["E"],
    hints: [
      "Frequency Sweep plays a sine wave from 20Hz to 20kHz through the audio chain. Use it to identify resonances, dead spots, and frequency awareness.",
      "Noise Injection adds controlled noise types: Hiss (high-frequency broadband), Hum (50/60Hz electrical interference), Rumble (sub-bass vibration). Adjust the slider to set level.",
      "Clipping Demo applies a WaveShaperNode to demonstrate soft and hard clipping. Watch the VU meter peak indicator light up when clipping occurs.",
      "The 6 Dimensions of Sound Quality: Frequency Balance, Dynamic Range, Noise Floor, Distortion, Spatial Quality, Time Response. Each has a diagnostic question and measurement tool.",
    ],
    quiz: [
      {
        q: "What does the Frequency Sweep help you identify?",
        options: [
          "BPM and musical key",
          "Resonances, dead spots, and build frequency awareness",
          "Compression artifacts",
          "Stereo width issues",
        ],
        answer: 1,
        explanation: "A sine sweep from 20Hz to 20kHz reveals resonant peaks (room modes, speaker coloration), dead spots (frequency dips), and trains your ear to recognize specific frequencies.",
      },
      {
        q: "What type of noise is a 50/60 Hz electrical interference?",
        options: ["Hiss", "Hum", "Rumble", "White noise"],
        answer: 1,
        explanation: "Hum is caused by electrical ground loops and power mains interference at 50Hz (Europe) or 60Hz (US). It sounds like a low drone.",
      },
      {
        q: "Which dimension of sound quality does the Clipping Demo help you understand?",
        options: [
          "Frequency Balance",
          "Dynamic Range",
          "Distortion",
          "Spatial Quality",
        ],
        answer: 2,
        explanation: "Clipping is a form of distortion — the signal waveform is literally clipped, creating harmonics that weren't in the original. The demo shows both soft and hard clipping.",
      },
    ],
  },
  {
    id: 7,
    name: "Practice & Ear Training",
    tagline: "Test your skills — fix the mix by ear and match console settings",
    zones: ["G"],
    hints: [
      "Ear Training 'Fix the Mix': A random EQ problem is applied to the audio. You must identify and correct it by ear alone — no visual aids.",
      "The live score updates as you adjust. The task breakdown shows which bands you got right. Submit when you think you've matched the original.",
      "Advanced Training offers Console Matching and EQ Matching drills. Match target console settings (gain, pan, width, compression) and EQ curves by ear.",
      "Ear training develops the 'engineer's mindset': diagnose by ear first, then verify with tools. Daily practice of 10–15 minutes builds frequency recognition.",
    ],
    quiz: [
      {
        q: "In 'Fix the Mix', how are you expected to identify the EQ problem?",
        options: [
          "By looking at the spectrum analyzer",
          "By ear alone, without visual aids",
          "By reading the preset name",
          "By checking the quality score",
        ],
        answer: 1,
        explanation: "Fix the Mix hides visual feedback and forces you to use your ears — the most important skill for an audio engineer. You must diagnose and correct the problem by listening.",
      },
      {
        q: "What does Advanced Training's Console Matching drill test?",
        options: [
          "Your ability to identify BPM",
          "Matching target console settings (gain, pan, width, compression) by ear",
          "Typing speed in the EQ values",
          "Memorizing frequency charts",
        ],
        answer: 1,
        explanation: "Console Matching plays a target sound, then you adjust gain, pan, width, and compression until you match it. It develops practical console skills.",
      },
    ],
  },
  {
    id: 8,
    name: "Studio Tools & Completion",
    tagline: "Advanced production tools and saving your session",
    zones: ["H", "I"],
    hints: [
      "Studio Tools include 6 tabs: Pitch Shift (change pitch without affecting tempo), Time Stretch (change tempo without affecting pitch), HPSS (Harmonic/Percussive Source Separation), Denoise, Project Save/Load.",
      "HPSS separates audio into harmonic (tonal, sustained) and percussive (transient, rhythmic) components — useful for remixing or isolating vocals/drums.",
      "Save & Complete Session records your EQ settings, A/B comparison data, and session analytics. Submit sends your work to your instructor for review.",
      "The Session Results panel shows your average 298EQ value, A/B toggle count, and all final settings — a summary of your mixing decisions.",
      "Troubleshooting methodology: Source → Processing → Amplification → Output. Test at each stage to isolate the problem.",
    ],
    quiz: [
      {
        q: "What does HPSS (Harmonic/Percussive Source Separation) do?",
        options: [
          "Removes all noise from a recording",
          "Separates audio into harmonic (tonal) and percussive (transient) components",
          "Changes the pitch of the audio",
          "Compresses the dynamic range",
        ],
        answer: 1,
        explanation: "HPSS uses spectral analysis to split audio into two stems: harmonic content (vocals, bass, sustained instruments) and percussive content (drums, transients). Useful for remixing and isolation.",
      },
      {
        q: "What data is saved when you 'Save & Complete Session'?",
        options: [
          "Only the song title",
          "EQ settings, A/B comparison data, and session analytics",
          "Just the timestamp",
          "The audio file itself",
        ],
        answer: 1,
        explanation: "The session save records your final EQ settings, A/B toggle count, average 298EQ value, console settings, and FX configuration — everything needed to review or reproduce your mix.",
      },
    ],
  },
];

export const TOTAL_STAGES = LEARNING_STAGES.length;

export function getStage(stageId: number): LearningStage | undefined {
  return LEARNING_STAGES.find((s) => s.id === stageId);
}

export function getZonesUpToStage(stageId: number): Set<ZoneId> {
  const zones = new Set<ZoneId>();
  for (const stage of LEARNING_STAGES) {
    if (stage.id > stageId) break;
    for (const z of stage.zones) zones.add(z);
  }
  return zones;
}

export function getStageForZone(zone: ZoneId): number {
  for (const stage of LEARNING_STAGES) {
    if (stage.zones.includes(zone)) return stage.id;
  }
  return 1;
}

const STORAGE_KEY = "298eq-stage-progress-v2";
const LEGACY_STORAGE_KEY = "298eq-stage-progress";

/* ── LocalStorage helpers (fallback for unauthenticated users) ── */

function loadLocalProgress(): Record<number, StageStatus> {
  if (typeof window === "undefined") return {};
  try {
    // Try new format first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, StageStatus>;
      const map: Record<number, StageStatus> = {};
      for (const [k, v] of Object.entries(parsed)) {
        map[Number(k)] = v;
      }
      return map;
    }
    // Migrate legacy single-integer format
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const stage = Math.max(1, Math.min(TOTAL_STAGES, parseInt(legacy, 10)));
      const map: Record<number, StageStatus> = {};
      for (let i = 1; i < stage; i++) map[i] = "completed";
      if (stage <= TOTAL_STAGES) map[stage] = "pending";
      saveLocalProgress(map);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return map;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function saveLocalProgress(map: Record<number, StageStatus>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/* ── Derive current stage from status map ── */

export function getCurrentStageFromMap(map: Record<number, StageStatus>): number {
  for (let i = TOTAL_STAGES; i >= 1; i--) {
    const status = map[i];
    if (status === "completed" || status === "pending") return i + 1;
  }
  return 1;
}

export function getZonesFromMap(map: Record<number, StageStatus>): Set<ZoneId> {
  const current = getCurrentStageFromMap(map);
  return getZonesUpToStage(current);
}

/* ── Database sync (authenticated users) ── */

const DB_FETCH_TIMEOUT = 5000; // 5s — don't block UI on slow DB

export async function fetchStageProgressFromDB(): Promise<Record<number, StageStatus> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DB_FETCH_TIMEOUT);
    const res = await fetch("/api/stage-progress", {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const rows: { stage_id: number; status: StageStatus }[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const map: Record<number, StageStatus> = {};
    for (const row of rows) {
      map[row.stage_id] = row.status;
    }
    return map;
  } catch {
    return null;
  }
}

export async function saveStageProgressToDB(stageId: number, status: StageStatus): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DB_FETCH_TIMEOUT);
    const res = await fetch("/api/stage-progress", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, status }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/* Batch sync — push entire localStorage map to DB in one request */
export async function batchSyncStageProgressToDB(map: Record<number, StageStatus>): Promise<boolean> {
  try {
    const stages = Object.entries(map).map(([k, v]) => ({ stageId: Number(k), status: v }));
    if (stages.length === 0) return true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DB_FETCH_TIMEOUT);
    const res = await fetch("/api/stage-progress", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Unified load / save ── */

export function loadStageProgress(): number {
  const map = loadLocalProgress();
  return getCurrentStageFromMap(map);
}

export function loadStageStatusMap(): Record<number, StageStatus> {
  return loadLocalProgress();
}

export async function loadStageProgressAsync(): Promise<{ stage: number; map: Record<number, StageStatus> }> {
  // Load localStorage immediately (instant, no network)
  const localMap = loadLocalProgress();

  // Try DB in parallel — don't block UI
  const dbMap = await fetchStageProgressFromDB();
  if (dbMap && Object.keys(dbMap).length > 0) {
    // Merge: DB wins for any stage it has a record for, localStorage fills gaps
    const merged = { ...localMap, ...dbMap };
    saveLocalProgress(merged);
    return { stage: getCurrentStageFromMap(merged), map: merged };
  }
  // Fall back to localStorage (already loaded)
  return { stage: getCurrentStageFromMap(localMap), map: localMap };
}

export function saveStageProgress(stageId: number, status: StageStatus = "completed"): void {
  const map = loadLocalProgress();
  const prevStatus = map[stageId] || "locked";

  // Client-side state machine: don't downgrade completed → pending
  if (prevStatus === "completed" && status !== "completed") {
    console.warn(`[stages] Refusing to downgrade stage ${stageId}: ${prevStatus} → ${status}`);
    return;
  }

  map[stageId] = status;
  // If completing a stage, also mark any prior locked stages as pending so the user can return
  for (let i = 1; i < stageId; i++) {
    if (!map[i]) map[i] = "pending";
  }
  saveLocalProgress(map);
  // Fire-and-forget DB sync (don't block UI on network)
  saveStageProgressToDB(stageId, status).catch(() => {});
}

export function resetStageProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  // Fire-and-forget DB reset (set all stages back to locked)
  // We don't delete rows — we set them to 'locked' so we keep audit history
  for (let i = 1; i <= TOTAL_STAGES; i++) {
    saveStageProgressToDB(i, "locked" as StageStatus).catch(() => {});
  }
}
