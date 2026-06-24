"use client";

import "../app/room/eqroom.css";
import { useEffect, useRef, useState, useCallback } from "react";
import { SkipBack, Play, Pause, Square, Send, Loader2, Cloud, Download } from "lucide-react";
import EQSlider from "./EQSlider";
import MacroFader from "./MacroFader";
import ConfirmationModal from "@/components/ConfirmationModal";
import Toast from "@/components/Toast";
import type { EQBand, EQSettings, SoundClass, AdvancedFXConfig } from "@/lib/types";
import { AdvancedFXChain, getDefaultFXConfig } from "@/lib/effects/AdvancedFXChain";
import { MACRO_LABELS } from "@/lib/effects/MacroController";
import AdvancedFXPanel from "@/components/AdvancedFXPanel";
import SessionResults from "@/components/SessionResults";
import VUMeter from "@/components/VUMeter";
import EQPresets from "@/components/EQPresets";
import WaveformDisplay from "@/components/WaveformDisplay";
import LessonModeOverlay from "@/components/LessonModeOverlay";
import FrequencySweep from "@/components/FrequencySweep";
import NoiseInjection from "@/components/NoiseInjection";
import ClippingDemo from "@/components/ClippingDemo";
import HeadphoneProfile from "@/components/HeadphoneProfile";
import EarTrainingQuiz from "@/components/EarTrainingQuiz";
import AdvancedTraining from "@/components/AdvancedTraining";
import StudioToolsPanel from "@/components/StudioToolsPanel";
import { GraduationCap, Brain, Headphones, Music, ToggleLeft, BarChart3, FlaskConical, SlidersHorizontal, Trophy, Settings2, CheckCircle2, X, Gauge, AlertTriangle, Target, Activity, Volume2, Radio, BookOpen, Lock } from "lucide-react";
import { createPortal } from "react-dom";
import { computeScore } from "@/lib/scoring";
import { computeIndicators, type LearningIndicators as IndicatorsData } from "@/lib/indicators";
import LearningIndicators from "./LearningIndicators";
import StageGate from "./StageGate";
import { loadStageProgressAsync, getZonesUpToStage, getStageForZone, TOTAL_STAGES, type ZoneId, type StageStatus } from "@/lib/staged-learning";
import {
  applyAllBandGains,
  attachAudioChain,
  resumeAudioChain,
  destroyAudioChain,
  applyConsoleSettings,
  getCompressorGR,
  getLimiterGR,
  getDefaultConsoleSettings,
  type AudioChain,
  type ConsoleSettings,
} from "@/lib/audio-chain";
import ConsoleStrip from "@/components/ConsoleStrip";
import CompressorControls from "@/components/CompressorControls";
import LUFSMeter from "@/components/LUFSMeter";
import ReferencePanel from "@/components/ReferencePanel";
import LiveModePanel from "@/components/LiveModePanel";
import { LiveInputProcessor } from "@/lib/live-audio";
import type { ScenePreset } from "@/lib/scene-presets";
import { analyzeAudioFile, MicBpmDetector } from "@/lib/audio-analysis";

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  music: "https://images.unsplash.com/photo-1670978046-7cd3fab1f21d?w=120",
  podcast: "https://images.unsplash.com/photo-1581368135153-a5068a45f9a9?w=120",
  live: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120",
  stream: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120",
};

type Props = {
  songId: string;
  songTitle: string;
  songArtist: string | null;
  songAlbum: string | null;
  songGenre: string | null;
  songCoverImage?: string | null;
  songBpm?: number | null;
  songKey?: string | null;
  songUrl: string;
  uploadType?: SoundClass;
  onSessionSaved?: () => void;
  youtubeUrl?: string | null;
};

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function EQRoom({ songId, songTitle, songArtist, songAlbum, songGenre, songCoverImage, songBpm, songKey, songUrl, uploadType = "music", onSessionSaved, youtubeUrl = null }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chainRef = useRef<AudioChain | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vuAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const advancedFXRef = useRef<AdvancedFXChain | null>(null);

  const [settings, setSettings] = useState<EQSettings>({
    low: 0,
    mid: 0,
    high: 0,
    gain: 0,
    eq298: 0,
  });
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const [isEnhanced, setIsEnhanced] = useState(false);
  const isEnhancedRef = useRef(isEnhanced);
  useEffect(() => { isEnhancedRef.current = isEnhanced; }, [isEnhanced]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [spectrumStatus, setSpectrumStatus] = useState<"off" | "ready" | "active">("off");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [advancedFX, setAdvancedFX] = useState<AdvancedFXConfig>(() => getDefaultFXConfig(uploadType));
  const advancedFXRefState = useRef(advancedFX);
  useEffect(() => { advancedFXRefState.current = advancedFX; }, [advancedFX]);

  // Analytics tracking refs
  const sessionStartRef = useRef<string>(new Date().toISOString());
  const abTogglesCountRef = useRef<number>(0);
  const eq298ValuesHistoryRef = useRef<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Live stream download state
  const [isDownloadingStream, setIsDownloadingStream] = useState(false);
  const [streamDownloaded, setStreamDownloaded] = useState(false);

  // Peak values for spectrum bars (decay slowly)
  const peakValuesRef = useRef<number[]>([]);

  // Preset interpolation ref
  const presetAnimRef = useRef<number | null>(null);

  // Lesson mode state
  const [lessonMode, setLessonMode] = useState(false);

  // Staged learning state
  const [currentStage, setCurrentStage] = useState(1);
  const [stageReady, setStageReady] = useState(false);
  const [stageStatusMap, setStageStatusMap] = useState<Record<number, StageStatus>>({});
  useEffect(() => {
    loadStageProgressAsync().then(({ stage, map }) => {
      setCurrentStage(stage);
      setStageStatusMap(map);
      setStageReady(true);
    });
  }, []);
  const visibleZones = getZonesUpToStage(currentStage);

  // EQ modal state — Basic and Advanced EQ each open their own modal
  const [showBasicEQ, setShowBasicEQ] = useState(false);
  const [showAdvancedEQModal, setShowAdvancedEQModal] = useState(false);

  // Track whether user has adjusted any EQ slider (for lesson gating)
  const [hasAdjustedEQ, setHasAdjustedEQ] = useState(false);

  // Live quality score (0-100, only meaningful if song has benchmark)
  const [qualityScore, setQualityScore] = useState<number | null>(null);

  // Learning indicators state
  const [indicators, setIndicators] = useState<IndicatorsData | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<{ settings: EQSettings; weights: EQSettings } | null>(null);
  const prevScoreRef = useRef<number | null>(null);
  const sessionStartRef2 = useRef<number>(Date.now());

  // Phase 3: Console settings
  const [consoleSettings, setConsoleSettings] = useState<ConsoleSettings>(() => getDefaultConsoleSettings());
  const consoleSettingsRef = useRef(consoleSettings);
  useEffect(() => { consoleSettingsRef.current = consoleSettings; }, [consoleSettings]);
  const [compressorGR, setCompressorGR] = useState(0);
  const [limiterGR, setLimiterGR] = useState(0);

  // Phase 4: Live mode
  const [isLiveMode, setIsLiveMode] = useState(false);
  const liveProcessorRef = useRef<LiveInputProcessor | null>(null);

  // BPM / Key display
  const [bpm, setBpm] = useState<number | null>(songBpm ?? null);
  const [musicalKey, setMusicalKey] = useState<string | null>(songKey ?? null);
  const [bpmDetecting, setBpmDetecting] = useState(false);
  const [micBpm, setMicBpm] = useState<number | null>(null);
  const [micBpmActive, setMicBpmActive] = useState(false);
  const micBpmDetectorRef = useRef<MicBpmDetector | null>(null);

  // Active scene preset (for toggle behavior)
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  // Device profile for Low-slider warning
  const [deviceProfile, setDeviceProfile] = useState<string | null>(null);

  // Fluid HSL blending: orange → blue → red → purple
  const getSpectrumColor = useCallback((t: number) => {
    const colors = [
      { h: 27, s: 93, l: 60 },    // orange
      { h: 200, s: 100, l: 50 },  // blue
      { h: 340, s: 100, l: 50 },  // red
      { h: 262, s: 100, l: 50 },  // purple
    ];
    const scaled = t * 3;
    const idx = Math.min(Math.floor(scaled), 2);
    const frac = scaled - idx;
    const c1 = colors[idx];
    const c2 = colors[idx + 1];
    const h = Math.round(c1.h + (c2.h - c1.h) * frac);
    const s = Math.round(c1.s + (c2.s - c1.s) * frac);
    const l = Math.round(c1.l + (c2.l - c1.l) * frac);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }, []);

  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) {
      animFrameRef.current = requestAnimationFrame(drawSpectrum);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to display size for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }

    const bufferLength = analyser.frequencyBinCount; // 128 for fftSize=256
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const width = rect.width;
    const height = rect.height;
    const labelZone = 14; // px reserved at bottom for zone labels
    const drawHeight = height - labelZone;
    // 20 fluid spectrum bars
    const barCount = 20;
    const barWidth = (width / barCount) * 0.78;
    const barGap = (width / barCount) * 0.22;

    ctx.clearRect(0, 0, width, height);

    // Initialize peak array if needed
    if (peakValuesRef.current.length !== barCount) {
      peakValuesRef.current = new Array(barCount).fill(0);
    }

    for (let i = 0; i < barCount; i++) {
      const binIndex = Math.floor(i * (bufferLength / barCount));
      const value = dataArray[binIndex] || 0;

      // Logarithmic scaling for taller, more dynamic bars
      const normalized = value / 255;
      const barHeight = Math.max(2, Math.pow(normalized, 0.6) * drawHeight * 0.95);
      const x = i * (barWidth + barGap) + barGap / 2;
      const y = drawHeight - barHeight;

      // Brand-color spectrum mapped across frequency range
      const t = i / (barCount - 1);
      const baseColor = getSpectrumColor(t);
      const gradient = ctx.createLinearGradient(0, drawHeight, 0, 0);
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(0.6, baseColor);
      gradient.addColorStop(1, baseColor.startsWith("hsl")
        ? baseColor.replace(")", ", 0.75)")
        : baseColor.replace("rgb", "rgba").replace(")", ", 0.75)"));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [Math.min(3, barWidth / 2), Math.min(3, barWidth / 2), 0, 0]);
      ctx.fill();

      // Peak hold with decay
      if (barHeight > peakValuesRef.current[i]) {
        peakValuesRef.current[i] = barHeight;
      } else {
        peakValuesRef.current[i] *= 0.965; // gentle decay
      }
      const peakY = drawHeight - peakValuesRef.current[i];

      // Peak glow line matching bar color
      const peakColor = baseColor.startsWith("hsl")
        ? baseColor.replace(")", ", 0.7)")
        : baseColor.replace("rgb", "rgba").replace(")", ", 0.7)");
      ctx.fillStyle = peakColor;
      ctx.fillRect(x, peakY, barWidth, 2);

      // Peak dot (use bar color for visibility in both modes)
      const dotRadius = Math.min(3, barWidth / 3);
      ctx.beginPath();
      ctx.arc(x + barWidth / 2, peakY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = baseColor;
      ctx.fill();
    }

    // Frequency zone labels along the bottom
    const ZONE_LABELS = [
      { label: "Sub", startBar: 0, endBar: 1 },
      { label: "Bass", startBar: 2, endBar: 4 },
      { label: "Low-Mid", startBar: 5, endBar: 8 },
      { label: "Mid", startBar: 9, endBar: 13 },
      { label: "Presence", startBar: 14, endBar: 17 },
      { label: "Air", startBar: 18, endBar: 19 },
    ];
    ctx.font = `${Math.min(9, barWidth * 1.1)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    for (const zone of ZONE_LABELS) {
      const xStart = zone.startBar * (barWidth + barGap) + barGap / 2;
      const xEnd = zone.endBar * (barWidth + barGap) + barGap / 2 + barWidth;
      const xMid = (xStart + xEnd) / 2;
      ctx.fillText(zone.label, xMid, height - 3);
    }

    animFrameRef.current = requestAnimationFrame(drawSpectrum);
  }, [getSpectrumColor]);

  const resumeContext = useCallback(async () => {
    if (chainRef.current) {
      await resumeAudioChain(chainRef.current);
    }
  }, []);

  const handleMicBpmToggle = useCallback(async () => {
    if (micBpmActive) {
      // Stop mic BPM detection
      if (micBpmDetectorRef.current) {
        micBpmDetectorRef.current.destroy();
        micBpmDetectorRef.current = null;
      }
      setMicBpmActive(false);
      setMicBpm(null);
      return;
    }

    // Start mic BPM detection — use standalone AudioContext (not tied to song chain)
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    const detector = new MicBpmDetector(ctx);
    detector.onBpmDetected((detectedBpm) => {
      setMicBpm(detectedBpm);
    });
    const ok = await detector.start();
    if (ok) {
      micBpmDetectorRef.current = detector;
      setMicBpmActive(true);
    } else {
      detector.destroy();
      setToast({ message: "Could not access microphone for BPM detection", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  }, [micBpmActive]);

  const handleSliderChange = useCallback(async (band: EQBand, value: number) => {
    await resumeContext();
    setHasAdjustedEQ(true);
    setSettings((prev) => {
      const updated = { ...prev, [band]: value };
      if (chainRef.current) {
        applyAllBandGains(chainRef.current, updated, !isEnhancedRef.current);
      } else {
        console.warn("[Slider] chainRef.current is null — gains not applied");
      }
      return updated;
    });
    if (band === "eq298") {
      eq298ValuesHistoryRef.current.push(value);
      // Cap history to prevent unbounded memory growth (max ~10 min of slider adjustments)
      if (eq298ValuesHistoryRef.current.length > 600) {
        eq298ValuesHistoryRef.current.shift();
      }
    }
  }, [resumeContext]);

  const toggleAB = useCallback(async (enhanced: boolean) => {
    await resumeContext();
    setIsEnhanced((prev) => {
      if (prev === enhanced) return prev;
      abTogglesCountRef.current += 1;
      if (chainRef.current) {
        applyAllBandGains(chainRef.current, settingsRef.current, !enhanced);
        console.log("[Console] switched to", enhanced ? "On" : "Off");
      }
      return enhanced;
    });
  }, [resumeContext]);

  const togglePlay = useCallback(async () => {
    await resumeContext();
    const audio = audioRef.current;
    if (!audio) return;
    if (!ready) {
      console.warn("[Play] Chain not ready yet — deferring playback until init completes");
      setToast({ message: "Audio engine is still initializing. Please wait...", type: "info" });
      return;
    }
    if (audio.paused) {
      audio.play().catch((err) => {
        const isLiveStream = songId.startsWith("live-");
        console.error("[Playback] play() failed:", err);
        if (isLiveStream) {
          setError("Playback failed. The YouTube stream may have expired. Try re-streaming from the dashboard.");
        } else {
          setError("Playback failed. Check CORS settings for B2 audio.");
        }
      });
    } else {
      audio.pause();
    }
  }, [resumeContext, ready]);

  // Sync gradient animation with audio state (CSS handles visual)
  useEffect(() => {
    // No-op: gradient is pure CSS, no JS sync needed
  }, [isPlaying]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const rewindToStart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const handleIntensityChange = useCallback((effectKey: string, value: number) => {
    console.log("[FX Intensity]", effectKey, "=", value, "advancedFXRef=", advancedFXRef.current ? "present" : "missing");
    setAdvancedFX((prev) => {
      const next = { ...prev, intensities: { ...prev.intensities, [effectKey]: value } };
      if (advancedFXRef.current) {
        advancedFXRef.current.setEffectIntensity(effectKey, value);
      } else {
        console.warn("[FX Intensity] advancedFXRef.current is null");
      }
      return next;
    });
  }, []);

  const handleMacroChange = useCallback((value: number) => {
    console.log("[Macro]", value, "advancedFXRef=", advancedFXRef.current ? "present" : "missing");
    setAdvancedFX((prev) => {
      const next = { ...prev, macroValue: value };
      if (advancedFXRef.current) {
        advancedFXRef.current.setMacro(value);
      } else {
        console.warn("[Macro] advancedFXRef.current is null");
      }
      return next;
    });
  }, []);

  // Resume AudioContext on first play and update spectrum status
  useEffect(() => {
    const chain = chainRef.current;
    if (isPlaying && chain && chain.ctx.state === "suspended") {
      chain.ctx.resume().then(() => console.log("[AudioContext] Resumed from suspended"));
    }
    setSpectrumStatus(isPlaying ? "active" : "ready");
  }, [isPlaying]);

  // Compute live quality score + learning indicators when settings change
  useEffect(() => {
    // Only compute for songs (not user uploads) that have benchmarks
    if (!songId || songId.startsWith("live-")) {
      setQualityScore(null);
      setBenchmarkData(null);
      setIndicators(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Fetch benchmark if we don't have it yet
        let bm = benchmarkData;
        if (!bm) {
          const res = await fetch(`/api/songs/${songId}/benchmark`);
          if (!res.ok) { setQualityScore(null); setIndicators(null); return; }
          const data = await res.json() as { benchmark_ready: boolean; benchmark_settings: EQSettings; benchmark_weights: EQSettings };
          if (cancelled || !data.benchmark_ready) { setQualityScore(null); setIndicators(null); return; }
          bm = { settings: data.benchmark_settings, weights: data.benchmark_weights };
          if (!cancelled) setBenchmarkData(bm);
        }

        const { score } = computeScore(settingsRef.current, bm.settings, bm.weights);
        if (!cancelled) {
          setQualityScore(score);
          // Compute full indicators
          const inds = computeIndicators({
            settings: settingsRef.current,
            benchmark: bm,
            previousScore: prevScoreRef.current,
            abToggles: abTogglesCountRef.current,
            timeSpent: (Date.now() - sessionStartRef2.current) / 1000,
            isEnhanced: isEnhancedRef.current,
            genre: songGenre || undefined,
          });
          prevScoreRef.current = score;
          setIndicators(inds);
        }
      } catch {
        if (!cancelled) { setQualityScore(null); setIndicators(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [settings, songId, benchmarkData]);

  // Read device profile from localStorage for Low-slider warning
  useEffect(() => {
    try {
      const saved = localStorage.getItem("298eq-output-device") || localStorage.getItem("298eq-headphone-profile");
      if (saved) setDeviceProfile(saved);
    } catch { /* ignore */ }
  }, []);

  // Reset trackers when loading a new song
  useEffect(() => {
    sessionStartRef.current = new Date().toISOString();
    abTogglesCountRef.current = 0;
    eq298ValuesHistoryRef.current = [0];
    setSettings({ low: 0, mid: 0, high: 0, gain: 0, eq298: 0 });
    setIsEnhanced(false);
    setSaveStatus(null);
    setIsPlaying(false);
    setAudioLoaded(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setAdvancedFX(getDefaultFXConfig(uploadType));
    setConsoleSettings(getDefaultConsoleSettings());
    setActiveSceneId(null);
    setBpm(songBpm ? Math.round(songBpm) : null);
    setMusicalKey(songKey ?? null);
    setMicBpm(null);
  }, [songId, uploadType, songBpm, songKey]);

  // Auto-detect BPM and key when song loads (if not already provided from DB)
  useEffect(() => {
    if (songBpm && songKey) return; // Already have metadata
    if (!songUrl || songId.startsWith("live-")) return;
    if (bpmDetecting) return;

    let cancelled = false;
    setBpmDetecting(true);

    analyzeAudioFile(songUrl)
      .then((result) => {
        if (cancelled) return;
        if (result.bpm) setBpm(Math.round(result.bpm));
        if (result.key) setMusicalKey(`${result.key.key} ${result.key.mode}`);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBpmDetecting(false);
      });

    return () => { cancelled = true; };
  }, [songUrl, songId, songBpm, songKey, bpmDetecting]);

  // Phase 3: Poll compressor/limiter gain reduction while playing
  useEffect(() => {
    if (!isPlaying || !chainRef.current) return;
    const interval = setInterval(() => {
      if (chainRef.current) {
        setCompressorGR(getCompressorGR(chainRef.current));
        setLimiterGR(getLimiterGR(chainRef.current));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Phase 3: Apply console settings whenever they change
  useEffect(() => {
    if (chainRef.current) {
      applyConsoleSettings(chainRef.current, consoleSettings);
    }
  }, [consoleSettings]);

  // Initialize / teardown audio chain + visualizer when songUrl changes
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.crossOrigin = "anonymous";
    audio.src = songUrl;
    audio.style.display = "none";
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoadedData = () => setAudioLoaded(true);
    const onPlay = () => {
      // Prevent audio from starting natively before the Web Audio chain is ready.
      // createMediaElementSource must exist BEFORE play() for browsers to route
      // audio through the graph. If play() fires first, the sound bypasses EQ/FX.
      if (!chainRef.current) {
        audio.pause();
        console.warn("[onPlay] Blocked native playback — chain not ready yet");
        setToast({ message: "Audio engine initializing... please wait a moment.", type: "info" });
        return;
      }
      setIsPlaying(true);
      resumeContext();
    };
    const onPause = () => setIsPlaying(false);
    const onError = () => setError("Audio failed to load. Check the file exists and CORS is configured for external sources.");
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);

    audio.addEventListener("loadeddata", onLoadedData);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);

    // Append to DOM so mobile browsers allow playback
    document.body.appendChild(audio);


    // Async setup for worklet registration
    (async () => {
      try {
        // Create single shared AudioContext for both advanced FX and main chain
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Create Advanced FX chain based on upload type
        const advancedFX = new AdvancedFXChain(ctx, uploadType);
        advancedFXRef.current = advancedFX;

        // Register AudioWorklet modules before connecting (Phase 3)
        await advancedFX.init();

        let chain: AudioChain;
        try {
          chain = attachAudioChain(audio, advancedFX, ctx);
        } catch (attachErr: any) {
          console.error("[AudioChain] attachAudioChain failed:", attachErr);
          setError("Audio engine could not attach to this track. If the audio is hosted externally, ensure CORS headers are configured.");
          setReady(false);
          return;
        }
        chainRef.current = chain;

        // Verify WEQ8 filters are actually configured before proceeding
        try {
          const spec = chain.runtime.spec;
          const activeFilters = spec.filter((f: any) => f.type !== "noop");
          console.log("[WEQ8] Filters configured:", activeFilters.length, "active bands", activeFilters.map((f: any, i: number) => ({ idx: i, type: f.type, freq: f.frequency, gain: f.gain, q: f.Q })));
          if (activeFilters.length === 0) {
            console.warn("[WEQ8] No active filters found — EQ will not work");
          }
        } catch (specErr) {
          console.warn("[WEQ8] Could not read filter spec:", specErr);
        }

        applyAllBandGains(chain, settings, !isEnhanced);

        // Create native AnalyserNode — parallel tap from makeupGain
        const analyser = chain.ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;
        chain.makeupGain.connect(analyser);
        analyserRef.current = analyser;
        setSpectrumStatus("ready");
        console.log("[Spectrum] Native AnalyserNode created, tapped from makeupGain");

        // Create VU meter analyser — larger fftSize for time-domain accuracy
        const vuAnalyser = chain.ctx.createAnalyser();
        vuAnalyser.fftSize = 2048;
        vuAnalyser.smoothingTimeConstant = 0.3;
        chain.makeupGain.connect(vuAnalyser);
        vuAnalyserRef.current = vuAnalyser;

        // Start the canvas animation loop
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(drawSpectrum);

        setReady(true);

        // Safety: if audio slipped through the onPlay gate (e.g. media keys),
        // briefly pause/replay so the browser re-evaluates routing through
        // the freshly-created MediaElementAudioSourceNode.
        if (!audio.paused) {
          const t = audio.currentTime;
          audio.pause();
          audio.currentTime = t;
          audio.play().catch(() => {});
          console.log("[Init] Chain ready — forced pause/replay to bind Web Audio graph");
        }
      } catch (e) {
        console.error("298EQ audio init failed:", e);
        setReady(false);
        setError("Web Audio API blocked or audio element could not be attached.");
      }
    })();

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadeddata", onLoadedData);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.remove();
      audioRef.current = null;

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch { /* already disconnected */ }
        analyserRef.current = null;
      }
      if (vuAnalyserRef.current) {
        try { vuAnalyserRef.current.disconnect(); } catch { /* already disconnected */ }
        vuAnalyserRef.current = null;
      }
      if (chainRef.current) {
        destroyAudioChain(chainRef.current.audio);
        chainRef.current = null;
      }
      if (advancedFXRef.current) {
        advancedFXRef.current.destroy();
        advancedFXRef.current = null;
      }
      if (presetAnimRef.current) {
        cancelAnimationFrame(presetAnimRef.current);
        presetAnimRef.current = null;
      }
      if (liveProcessorRef.current) {
        liveProcessorRef.current.destroy();
        liveProcessorRef.current = null;
      }
      if (micBpmDetectorRef.current) {
        micBpmDetectorRef.current.destroy();
        micBpmDetectorRef.current = null;
      }
    };
  }, [songUrl]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      const controlsLog = {
        settings,
        advancedFX: {
          macroValue: advancedFX.macroValue,
          enabled: advancedFX.enabled,
          soundClass: advancedFX.soundClass,
          intensities: advancedFX.intensities,
        },
        abToggles: abTogglesCountRef.current,
        avg298eq:
          eq298ValuesHistoryRef.current.length > 0
            ? eq298ValuesHistoryRef.current.reduce((a, b) => a + b, 0) / eq298ValuesHistoryRef.current.length
            : 0,
      };
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          song_id: songId,
          settings,
          controls_log: controlsLog,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitStatus("Submitted successfully!");
        setToast({ message: "Submission saved!", type: "success" });
      } else {
        setSubmitStatus(data.error || "Submission failed");
        setToast({ message: data.error || "Submission failed", type: "error" });
      }
    } catch {
      setSubmitStatus("Network error");
      setToast({ message: "Network error during submission", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }, [settings, advancedFX, songId]);

  const saveSession = async () => {
    setIsSaving(true);
    setSaveStatus("Saving session data...");

    const vals = eq298ValuesHistoryRef.current;
    const avg298 = vals.length > 0
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : 0;

    const payload = {
      audio_id: songId,
      session_start: sessionStartRef.current,
      session_end: new Date().toISOString(),
      average_298eq: avg298,
      final_settings: settings,
      ab_toggles: abTogglesCountRef.current,
    };

    try {
      const res = await fetch("/api/session-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[SaveSession] Server error:", JSON.stringify(data, null, 2));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      // Also save console session state
      const isUpload = songId ? true : false;
      fetch("/api/console-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_id: songId,
          track_source: isUpload ? "upload" : "song",
          console_state: {
            settings,
            advancedFX: {
              macroValue: advancedFX.macroValue,
              enabled: advancedFX.enabled,
              soundClass: advancedFX.soundClass,
              intensities: advancedFX.intensities,
            },
          },
          listening_context: "studio",
          ab_toggles: abTogglesCountRef.current,
          session_end: new Date().toISOString(),
        }),
      }).catch((e) => console.error("[SaveSession] Console session save failed:", e?.message?.slice(0, 200)));

      setSaveStatus("Session saved!");
      setToast({ message: "Session saved successfully!", type: "success" });
      setShowResults(true);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to save session";
      setSaveStatus(msg);
      setToast({ message: `Save failed: ${msg}`, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadStream = async () => {
    if (!youtubeUrl) return;
    setIsDownloadingStream(true);
    try {
      const dRes = await fetch("/api/youtube/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl,
          uploadType: uploadType,
          title: songTitle,
          artist: songArtist || "Unknown",
        }),
      });
      const dData = await dRes.json();
      if (!dRes.ok) throw new Error(dData.error || "Download failed");
      setStreamDownloaded(true);
      setToast({ message: `"${dData.upload.title}" saved to B2!`, type: "success" });
    } catch (err: any) {
      console.error("[DownloadStream] error:", err);
      setToast({ message: err?.message || "Failed to download stream", type: "error" });
    } finally {
      setIsDownloadingStream(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Staged Learning Gate */}
      {stageReady && (
        <StageGate
          currentStage={currentStage}
          stageStatusMap={stageStatusMap}
          onStageComplete={(next) => setCurrentStage(next)}
        />
      )}

      {/* ───────────────────────────────────────────
          STANDALONE — MIC BPM
          ─────────────────────────────────────────── */}
      <div className="eq-zone" style={{ marginBottom: "16px" }}>
        <div className="eq-zone-label">
          <Radio size={12} className="eq-zone-icon" />
          Mic BPM Detector
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "8px 0" }}>
          <button
            type="button"
            onClick={handleMicBpmToggle}
            className={`btn btn-secondary${micBpmActive ? " active" : ""}`}
            style={{
              fontSize: "12px",
              padding: "8px 16px",
              gap: "6px",
              display: "inline-flex",
              alignItems: "center",
              border: micBpmActive ? "1px solid var(--accent)" : undefined,
              color: micBpmActive ? "var(--accent)" : undefined,
            }}
          >
            <Radio size={14} />
            {micBpmActive ? "Stop Listening" : "Detect BPM from Mic"}
          </button>
          {micBpmActive && (
            <span
              className="meta-chip"
              style={{
                background: micBpm !== null ? "rgba(255,88,174,0.12)" : "rgba(255,255,255,0.06)",
                color: micBpm !== null ? "var(--accent)" : "var(--muted)",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {micBpm !== null ? `${Math.round(micBpm)} BPM` : "Listening... tap a beat or play music"}
            </span>
          )}
          {!micBpmActive && (
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Tap the button and play music near your mic to detect its tempo.
            </span>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────
          ZONE A — SETUP
          ─────────────────────────────────────────── */}
      {visibleZones.has("A" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <Headphones size={12} className="eq-zone-icon" />
          Setup
        </div>
        <div className="teaching-tools-bar" style={{ margin: 0, padding: 0, border: "none", background: "transparent" }}>
          <HeadphoneProfile />
          <button
            type="button"
            onClick={() => setLessonMode(true)}
            className={`btn btn-secondary lesson-mode-btn${lessonMode ? " active" : ""}`}
          >
            <GraduationCap size={14} />
            Lesson Mode
          </button>
          <a
            href="/docs/console-guide"
            className="btn btn-secondary lesson-mode-btn"
            style={{ textDecoration: "none" }}
          >
            <BookOpen size={14} />
            Tutorial
          </a>
        </div>
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE B — PLAYER
          ─────────────────────────────────────────── */}
      {visibleZones.has("B" as ZoneId) && (
      <div className="eq-zone now-playing" style={{ padding: "20px 24px" }}>
        <div className="eq-gradient-bg" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="eq-zone-label">
            <Music size={12} className="eq-zone-icon" />
            Player
          </div>
          <div className="track-info" style={{ marginBottom: "12px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
            {/* Album art */}
            <div style={{ flexShrink: 0 }}>
              <img
                src={songCoverImage || CATEGORY_FALLBACK_IMAGES[uploadType] || CATEGORY_FALLBACK_IMAGES.music}
                alt={songTitle}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--r-md)",
                  objectFit: "cover",
                  background: "rgba(255,255,255,0.05)",
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            {/* Track details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{songTitle}</h3>
                {songId.startsWith("live-") && (
                  <button
                    type="button"
                    onClick={handleDownloadStream}
                    disabled={isDownloadingStream || streamDownloaded}
                    className="stream-action-btn"
                    style={{
                      border: streamDownloaded ? "none" : undefined,
                      background: streamDownloaded ? "rgba(34,197,94,0.15)" : undefined,
                      color: streamDownloaded ? "#22c55e" : undefined,
                      opacity: isDownloadingStream ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                    title={streamDownloaded ? "Saved to B2" : "Download this stream to B2"}
                  >
                    {isDownloadingStream ? <Loader2 size={12} className="spin" /> : streamDownloaded ? <Cloud size={12} /> : <Download size={12} />}
                    {isDownloadingStream ? "Saving..." : streamDownloaded ? "Saved" : "Download"}
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {songArtist && <span className="meta-chip">{songArtist}</span>}
                {songAlbum && <span className="meta-chip">{songAlbum}</span>}
                {songGenre && <span className="meta-chip accent">{songGenre}</span>}
                {songId.startsWith("live-") && <span className="meta-chip live">Live Stream</span>}
              </div>
              {/* BPM & Key display */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px", alignItems: "center" }}>
                {bpmDetecting ? (
                  <span className="meta-chip" style={{ opacity: 0.6 }}>
                    <Loader2 size={10} className="spin" style={{ display: "inline", marginRight: "4px" }} />
                    Detecting BPM/Key...
                  </span>
                ) : (
                  <>
                    {bpm !== null && (
                      <span className="meta-chip" style={{ background: "rgba(255,88,174,0.12)", color: "var(--accent)" }}>
                        <Activity size={10} style={{ display: "inline", marginRight: "4px" }} />
                        {Math.round(bpm)} BPM
                      </span>
                    )}
                    {musicalKey && (
                      <span className="meta-chip" style={{ background: "rgba(107,140,255,0.12)", color: "#6B8CFF" }}>
                        🎹 {musicalKey}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Waveform Display — single seek control */}
          <div style={{ width: "100%", marginBottom: "8px" }}>
            <WaveformDisplay
              audioUrl={songUrl}
              audioElement={audioRef.current}
              currentTime={currentTime}
              duration={duration}
              onSeek={(time) => { if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); } }}
              isLiveStream={songId.startsWith("live-")}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--muted)", marginBottom: "12px" }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Player Controls */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={rewindToStart}
              className="btn player-control-btn"
              title="Rewind to beginning"
            >
              <SkipBack size={18} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="btn btn-primary"
              style={{ padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              type="button"
              onClick={stopPlayback}
              className="btn player-control-btn"
              title="Stop playback"
            >
              <Square size={18} />
            </button>
          </div>
        </div>
        {error && (
          <p style={{ color: "#f87171", fontSize: "12px", marginTop: "8px", position: "relative", zIndex: 1 }}>{error}</p>
        )}
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE C — LISTEN (A/B Console Toggle)
          ─────────────────────────────────────────── */}
      {visibleZones.has("C" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <ToggleLeft size={12} className="eq-zone-icon" />
          Listen — A/B Compare
        </div>
        <div className="ab-switch-row">
          <span className={`ab-switch-label${!isEnhanced ? " ab-switch-label--active" : ""}`}>Original</span>
          <button
            type="button"
            role="switch"
            aria-checked={isEnhanced}
            onClick={() => toggleAB(!isEnhanced)}
            className={`ab-switch${isEnhanced ? " ab-switch--on" : ""}`}
            title={isEnhanced ? "Switch to Original (bypass)" : "Switch to Enhanced (298EQ on)"}
          >
            <span className="ab-switch-thumb" />
          </button>
          <span className={`ab-switch-label${isEnhanced ? " ab-switch-label--active" : ""}`}>Enhanced (298EQ)</span>
        </div>
        <p className="ab-switch-hint">
          {isEnhanced
            ? "298EQ processing is active — you are hearing the enhanced signal."
            : "Bypass mode — you are hearing the original unprocessed audio."}
        </p>
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE D — ANALYSE
          ─────────────────────────────────────────── */}
      {visibleZones.has("D" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <BarChart3 size={12} className="eq-zone-icon" />
          Analyse
        </div>
        <div className="spectrum-vu-row" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div className="spectrum-card" style={{ position: "relative", overflow: "hidden", flex: "1 1 300px", minWidth: "260px", padding: "12px 16px" }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div className="section-label" style={{ margin: 0 }}>Live Spectrum Analyzer</div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background:
                      spectrumStatus === "active"
                        ? "rgba(34,197,94,0.15)"
                        : spectrumStatus === "ready"
                        ? "rgba(128,128,128,0.12)"
                        : "rgba(248,113,113,0.15)",
                    color:
                      spectrumStatus === "active" ? "#22c55e" : spectrumStatus === "ready" ? "var(--muted)" : "#f87171",
                  }}
                >
                  {spectrumStatus === "active" ? "Live" : spectrumStatus === "ready" ? "Standby" : "Offline"}
                </span>
              </div>
              <canvas ref={canvasRef} className="visualizer-container visualizer-bg" style={{ width: "100%", height: "160px", display: "block" }} />
            </div>
          </div>
          <div style={{ flex: "0 0 240px", minWidth: "200px" }}>
            <VUMeter analyser={vuAnalyserRef.current} isPlaying={isPlaying} />
          </div>
        </div>
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE D2 — CONSOLE (Phase 3: Channel Strip + Dynamics)
          ─────────────────────────────────────────── */}
      {visibleZones.has("D2" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <Volume2 size={12} className="eq-zone-icon" />
          Console
        </div>
        <div className="console-grid">
          <ConsoleStrip
            settings={consoleSettings}
            onChange={setConsoleSettings}
          />
          <CompressorControls
            settings={consoleSettings}
            onChange={setConsoleSettings}
            compressorGR={compressorGR}
            limiterGR={limiterGR}
          />
          <LUFSMeter
            analyser={vuAnalyserRef.current}
            isPlaying={isPlaying}
            targetLufs={-14}
          />
        </div>
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE D3 — REFERENCE MATCH (Phase 2.5 + 3)
          ─────────────────────────────────────────── */}
      {visibleZones.has("D3" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <Target size={12} className="eq-zone-icon" />
          Reference Match
        </div>
        <ReferencePanel
          songId={songId}
          onApplyCorrections={(corrections) => {
            const newSettings: EQSettings = {
              low: corrections.low,
              mid: settings.mid,
              high: corrections.high,
              gain: corrections.gain,
              eq298: corrections.eq298,
            };
            setSettings(newSettings);
            if (chainRef.current) {
              applyAllBandGains(chainRef.current, newSettings, !isEnhancedRef.current);
            }
            setToast({ message: "Reference corrections applied!", type: "success" });
          }}
        />
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE D4 — LIVE MODE (Phase 4: Open Stage)
          ─────────────────────────────────────────── */}
      {visibleZones.has("D4" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <Radio size={12} className="eq-zone-icon" />
          Live Mode
        </div>
        <LiveModePanel
          audioContext={chainRef.current?.ctx ?? null}
          analyser={vuAnalyserRef.current}
          soundClass={uploadType}
          isLiveMode={isLiveMode}
          activeSceneId={activeSceneId}
          onToggleLive={(active) => {
            setIsLiveMode(active);
            if (active && chainRef.current) {
              // Connect live input to the audio chain's entry point (not source, which has 0 inputs)
              const entryNode = chainRef.current.advancedFX?.input ?? chainRef.current.runtime.input;
              if (liveProcessorRef.current) {
                liveProcessorRef.current.connectTo(entryNode);
              }
            }
          }}
          onSceneApply={(scene) => {
            // Toggle behavior: if same scene is clicked, deactivate it
            if (activeSceneId === scene.id) {
              setActiveSceneId(null);
              const defaultConsole = getDefaultConsoleSettings();
              const flatEQ: EQSettings = { low: 0, mid: 0, high: 0, gain: 0, eq298: 0 };
              setConsoleSettings(defaultConsole);
              setSettings(flatEQ);
              if (chainRef.current) {
                applyAllBandGains(chainRef.current, flatEQ, !isEnhancedRef.current);
                applyConsoleSettings(chainRef.current, defaultConsole);
              }
              if (advancedFXRef.current) {
                advancedFXRef.current.updateConfig({
                  enabled: false,
                });
              }
              setToast({ message: `Scene "${scene.name}" deactivated`, type: "info" });
              return;
            }

            // Apply the scene
            setActiveSceneId(scene.id);
            setConsoleSettings(scene.console);
            setSettings(scene.eq);
            if (chainRef.current) {
              applyAllBandGains(chainRef.current, scene.eq, !isEnhancedRef.current);
              applyConsoleSettings(chainRef.current, scene.console);
            }
            if (advancedFXRef.current && scene.fx) {
              advancedFXRef.current.updateConfig({
                enabled: scene.fxEnabled,
                ...scene.fx,
              });
            }
            setToast({ message: `Scene "${scene.name}" applied`, type: "success" });
          }}
          liveProcessorRef={liveProcessorRef}
        />
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE E — LEARN (Teaching Tools)
          ─────────────────────────────────────────── */}
      {visibleZones.has("E" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <FlaskConical size={12} className="eq-zone-icon" />
          Learn
        </div>
        <div className="teaching-tools-grid">
          <FrequencySweep
            audioContext={chainRef.current?.ctx ?? null}
            analyser={analyserRef.current}
          />
          <NoiseInjection
            audioContext={chainRef.current?.ctx ?? null}
            destinationNode={chainRef.current?.ctx.destination ?? null}
            analyser={analyserRef.current}
          />
          <ClippingDemo
            audioContext={chainRef.current?.ctx ?? null}
            sourceNode={chainRef.current?.makeupGain ?? null}
            destinationNode={chainRef.current?.ctx.destination ?? null}
            analyser={analyserRef.current}
            vuAnalyser={vuAnalyserRef.current}
          />
        </div>
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE F — ADJUST (EQ Presets + Toggle Modal + Quality Score)
          ─────────────────────────────────────────── */}
      {visibleZones.has("F" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <SlidersHorizontal size={12} className="eq-zone-icon" />
          Adjust
        </div>

        {/* EQ Presets */}
        <EQPresets
          currentSettings={settings}
          fxConfig={advancedFX}
          onApply={(newSettings) => {
            const startSettings = { ...settingsRef.current };
            const bands = ["low", "mid", "high", "gain", "eq298"] as const;
            const duration = 50;
            const startTime = performance.now();

            if (presetAnimRef.current) cancelAnimationFrame(presetAnimRef.current);

            const animatePreset = (now: number) => {
              const elapsed = now - startTime;
              const t = Math.min(1, elapsed / duration);
              const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

              const interpolated = {} as EQSettings;
              for (const band of bands) {
                interpolated[band] = startSettings[band] + (newSettings[band] - startSettings[band]) * eased;
              }
              setSettings(interpolated);
              if (chainRef.current) {
                applyAllBandGains(chainRef.current, interpolated, !isEnhancedRef.current);
              }

              if (t < 1) {
                presetAnimRef.current = requestAnimationFrame(animatePreset);
              } else {
                setSettings(newSettings);
                if (chainRef.current) {
                  applyAllBandGains(chainRef.current, newSettings, !isEnhancedRef.current);
                }
                presetAnimRef.current = null;
              }
            };
            presetAnimRef.current = requestAnimationFrame(animatePreset);
          }}
          onApplyFX={(fx) => {
            setAdvancedFX(fx);
            if (advancedFXRef.current) {
              advancedFXRef.current.setMacro(fx.macroValue);
            }
          }}
        />

        {/* EQ Toggle Buttons */}
        <div className="eq-toggle-bar">
          <button
            type="button"
            onClick={() => { setShowBasicEQ(!showBasicEQ); setShowAdvancedEQModal(false); }}
            className={`eq-toggle-btn${showBasicEQ ? " active" : ""}`}
          >
            <SlidersHorizontal size={14} /> Basic EQ
          </button>
          <button
            type="button"
            onClick={() => { setShowAdvancedEQModal(!showAdvancedEQModal); setShowBasicEQ(false); }}
            className={`eq-toggle-btn${showAdvancedEQModal ? " active" : ""}`}
          >
            <Settings2 size={14} /> Advanced EQ
          </button>
        </div>

        {/* Device-aware Low slider warning */}
        {deviceProfile && (deviceProfile === "earbuds" || deviceProfile === "laptop-speakers" || deviceProfile === "phone-speaker") && showBasicEQ && (
          <div className="device-low-warning">
            <AlertTriangle size={12} />
            <span>Low frequencies may be inaudible on your device. Watch the spectrum analyzer to see bass changes.</span>
          </div>
        )}
        {qualityScore !== null && (
          <div className="quality-score-bar">
            <div className="quality-score-header">
              <Gauge size={12} />
              <span className="quality-score-label">Sound Quality</span>
              <span className={`quality-score-value${qualityScore >= 71 ? " good" : qualityScore >= 41 ? " ok" : " bad"}`}>
                {Math.round(qualityScore)}/100
              </span>
            </div>
            <div className="quality-score-track">
              <div
                className={`quality-score-fill${qualityScore >= 71 ? " good" : qualityScore >= 41 ? " ok" : " bad"}`}
                style={{ width: `${Math.max(2, qualityScore)}%` }}
              />
            </div>
          </div>
        )}

        {/* Learning Indicators Panel */}
        {indicators && (
          <LearningIndicators indicators={indicators} settings={settings} />
        )}

        {/* Basic EQ — modal via portal */}
        {showBasicEQ && createPortal(
          <div className="eq-modal-overlay" onClick={() => setShowBasicEQ(false)}>
            <div className="eq-modal" onClick={(e) => e.stopPropagation()}>
              <div className="eq-modal-header">
                <span className="eq-modal-title"><SlidersHorizontal size={16} /> Basic EQ</span>
                <button type="button" onClick={() => setShowBasicEQ(false)} className="eq-modal-close">
                  <X size={16} />
                </button>
              </div>
              <div className="eq-modal-body" style={{ touchAction: "none" }}>
                <div className="controls-grid" style={{ marginBottom: 0 }}>
                  {(["low", "mid", "high", "gain", "eq298"] as EQBand[]).map((band) => (
                    <EQSlider
                      key={band}
                      band={band}
                      value={settings[band]}
                      onChange={(v) => handleSliderChange(band, v)}
                    />
                  ))}
                </div>
                <div className="macro-separator" />
                <MacroFader
                  label={MACRO_LABELS[uploadType]}
                  value={advancedFX.macroValue}
                  onChange={handleMacroChange}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Advanced EQ — modal via portal */}
        {showAdvancedEQModal && createPortal(
          <div className="eq-modal-overlay" onClick={() => setShowAdvancedEQModal(false)}>
            <div className="eq-modal" onClick={(e) => e.stopPropagation()}>
              <div className="eq-modal-header">
                <span className="eq-modal-title"><Settings2 size={16} /> Advanced EQ Mixer</span>
                <button type="button" onClick={() => setShowAdvancedEQModal(false)} className="eq-modal-close">
                  <X size={16} />
                </button>
              </div>
              <div className="eq-modal-body" style={{ touchAction: "none" }}>
                <AdvancedFXPanel
                  config={advancedFX}
                  onIntensityChange={handleIntensityChange}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE G — PRACTICE (Ear Training)
          ─────────────────────────────────────────── */}
      {visibleZones.has("G" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <Trophy size={12} className="eq-zone-icon" />
          Practice
        </div>
        <EarTrainingQuiz
          audioContext={chainRef.current?.ctx ?? null}
          sourceNode={chainRef.current?.makeupGain ?? null}
          destinationNode={chainRef.current?.ctx.destination ?? null}
          applyEQ={(newSettings) => {
            setSettings(newSettings);
            if (chainRef.current) {
              applyAllBandGains(chainRef.current, newSettings, !isEnhancedRef.current);
            }
          }}
          getCurrentEQ={() => settingsRef.current}
        />
        <AdvancedTraining
          applyEQ={(newSettings) => {
            setSettings(newSettings);
            if (chainRef.current) {
              applyAllBandGains(chainRef.current, newSettings, !isEnhancedRef.current);
            }
          }}
          getCurrentEQ={() => settingsRef.current}
          applyConsole={(newConsole) => {
            setConsoleSettings(newConsole);
            if (chainRef.current) {
              applyConsoleSettings(chainRef.current, newConsole);
            }
          }}
          getCurrentConsole={() => consoleSettingsRef.current}
        />
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE H2 — STUDIO TOOLS (Phase 6)
          ─────────────────────────────────────────── */}
      {visibleZones.has("H" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <Settings2 size={12} className="eq-zone-icon" />
          Studio Tools
        </div>
        <StudioToolsPanel
          songId={songId}
          songTitle={songTitle}
          audioElement={audioRef.current}
          audioContext={chainRef.current?.ctx ?? null}
          masterNode={chainRef.current?.makeupGain ?? null}
          eq={settings}
          console={consoleSettings}
          fx={advancedFXRef.current?.config ?? getDefaultFXConfig(uploadType)}
          isEnhanced={isEnhanced}
          onApplyEQ={(newEQ) => {
            setSettings(newEQ);
            if (chainRef.current) {
              applyAllBandGains(chainRef.current, newEQ, !isEnhancedRef.current);
            }
          }}
          onApplyConsole={(newConsole) => {
            setConsoleSettings(newConsole);
            if (chainRef.current) {
              applyConsoleSettings(chainRef.current, newConsole);
            }
          }}
          onApplyFX={(newFX) => {
            setAdvancedFX(newFX);
            if (advancedFXRef.current) {
              advancedFXRef.current.updateConfig(newFX);
            }
          }}
        />
      </div>
      )}

      {/* ───────────────────────────────────────────
          ZONE I — COMPLETE
          ─────────────────────────────────────────── */}
      {visibleZones.has("I" as ZoneId) && (
      <div className="eq-zone">
        <div className="eq-zone-label">
          <CheckCircle2 size={12} className="eq-zone-icon" />
          Complete
        </div>

        {ready && !error && (
          <div className="engine-live" style={{ marginBottom: "12px" }}>
            <span className="engine-live-dot" />
            298EQ Engine Active
          </div>
        )}

        <p className="complete-zone-hint">
          Save your session to record your EQ settings and A/B comparison data. Submit to send your work to your instructor.
        </p>

        <ConfirmationModal
          open={showSaveConfirm}
          title="Save & Complete Session"
          message="This will save your EQ adjustments and A/B comparison data to the session analytics. You can still come back later to make more changes."
          confirmLabel="Save & Complete"
          cancelLabel="Keep Editing"
          onConfirm={() => {
            setShowSaveConfirm(false);
            saveSession();
          }}
          onCancel={() => setShowSaveConfirm(false)}
          confirmVariant="primary"
        />
        <div className="complete-zone-actions">
          <button
            type="button"
            onClick={() => setShowSaveConfirm(true)}
            disabled={isSaving || isSubmitting}
            className="btn btn-primary"
            style={{ width: "100%", opacity: isSaving ? 0.5 : 1, cursor: isSaving ? "not-allowed" : "pointer" }}
          >
            {isSaving ? "Uploading to Demo Analytics..." : "Save & Complete Session"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isSaving}
            className="btn btn-secondary"
            style={{ width: "100%", gap: "8px", opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
          >
            {isSubmitting ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            {isSubmitting ? "Submitting..." : "Submit Submission"}
          </button>
          {saveStatus && (
            <p style={{ textAlign: "center", fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
              {saveStatus}
            </p>
          )}
          {submitStatus && (
            <p style={{ textAlign: "center", fontSize: "12px", color: submitStatus.includes("success") ? "#22c55e" : "#f87171", fontWeight: 600 }}>
              {submitStatus}
            </p>
          )}
        </div>

        {showResults && (
          <div style={{ marginTop: "16px" }}>
            <SessionResults
              songTitle={songTitle}
              songArtist={songArtist}
              sessionDate={new Date().toLocaleDateString()}
              sessionDuration={
                sessionStartRef.current
                  ? `${Math.round((new Date().getTime() - new Date(sessionStartRef.current).getTime()) / 1000)}s`
                  : "0s"
              }
              settings={settings}
              advancedFX={advancedFX}
              uploadType={uploadType}
              avg298eq={
                eq298ValuesHistoryRef.current.length > 0
                  ? eq298ValuesHistoryRef.current.reduce((a, b) => a + b, 0) / eq298ValuesHistoryRef.current.length
                  : 0
              }
              consoleToggles={abTogglesCountRef.current}
              songId={songId}
            />
          </div>
        )}
      </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Lesson Mode Overlay */}
      <LessonModeOverlay
        isOpen={lessonMode}
        onClose={() => setLessonMode(false)}
        isPlaying={isPlaying}
        hasAdjustedEQ={hasAdjustedEQ}
      />
    </div>
  );
}
