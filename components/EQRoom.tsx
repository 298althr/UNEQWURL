"use client";

import "../app/room/eqroom.css";
import { useEffect, useRef, useState, useCallback } from "react";
import Toast from "@/components/Toast";
import type { EQBand, EQSettings, SoundClass, AdvancedFXConfig } from "@/lib/types";
import { AdvancedFXChain, getDefaultFXConfig } from "@/lib/effects/AdvancedFXChain";
import { ImperfectionChain } from "@/lib/effects/ImperfectionChain";
import { DEFAULT_IMPERFECTION_CONFIG, type ImperfectionConfig, type ImperfectionMetrics } from "@/lib/imperfection-types";
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
import LecturerConsole from "./LecturerConsole";

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

export default function EQRoom({ songId, songTitle, songArtist, songAlbum, songGenre, songCoverImage, songBpm, songKey, songUrl, uploadType = "music", onSessionSaved: _onSessionSaved, youtubeUrl: _youtubeUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chainRef = useRef<AudioChain | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vuAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const advancedFXRef = useRef<AdvancedFXChain | null>(null);
  const imperfectionChainRef = useRef<ImperfectionChain | null>(null);

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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Peak values for spectrum bars (decay slowly)
  const peakValuesRef = useRef<number[]>([]);

  // Phase 3: Console settings
  const [consoleSettings, setConsoleSettings] = useState<ConsoleSettings>(() => getDefaultConsoleSettings());
  const consoleSettingsRef = useRef(consoleSettings);
  useEffect(() => { consoleSettingsRef.current = consoleSettings; }, [consoleSettings]);
  const [compressorGR, setCompressorGR] = useState(0);
  const [limiterGR, setLimiterGR] = useState(0);

  // Imperfection / simulation profile
  const [imperfectionConfig, setImperfectionConfig] = useState<ImperfectionConfig>(() => DEFAULT_IMPERFECTION_CONFIG);
  const imperfectionConfigRef = useRef(imperfectionConfig);
  useEffect(() => { imperfectionConfigRef.current = imperfectionConfig; }, [imperfectionConfig]);
  const [imperfectionMetrics, setImperfectionMetrics] = useState<ImperfectionMetrics>(() => ({
    sti: 1, c80: 0, spl: -60, rt60: 0, lufs: -60, frequencyResponse: 100, correlation: 1, leftLevel: -60, rightLevel: -60, thd: 0, speakerHealth: 100,
  }));
  const [isSavingImperfectionProfile, setIsSavingImperfectionProfile] = useState(false);

  const saveImperfectionProfile = useCallback(async () => {
    setIsSavingImperfectionProfile(true);
    try {
      const res = await fetch("/api/imperfections/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Profile ${new Date().toLocaleString()}`,
          description: "Saved from console",
          config: imperfectionConfigRef.current,
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      setToast({ message: "Imperfection profile saved", type: "success" });
    } catch (err: any) {
      console.error("[SaveImperfectionProfile]", err);
      setToast({ message: err?.message || "Failed to save profile", type: "error" });
    } finally {
      setIsSavingImperfectionProfile(false);
    }
  }, []);

  const resetImperfectionProfile = useCallback(() => {
    setImperfectionConfig(DEFAULT_IMPERFECTION_CONFIG);
  }, []);

  // BPM / Key display
  const [bpm, setBpm] = useState<number | null>(songBpm ?? null);
  const [musicalKey, setMusicalKey] = useState<string | null>(songKey ?? null);

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

  const handleSliderChange = useCallback(async (band: EQBand, value: number) => {
    await resumeContext();
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

  // Reset trackers when loading a new song
  useEffect(() => {
    sessionStartRef.current = new Date().toISOString();
    abTogglesCountRef.current = 0;
    eq298ValuesHistoryRef.current = [0];
    setSettings({ low: 0, mid: 0, high: 0, gain: 0, eq298: 0 });
    setIsEnhanced(false);
    setIsPlaying(false);
    setAudioLoaded(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setAdvancedFX(getDefaultFXConfig(uploadType));
    setConsoleSettings(getDefaultConsoleSettings());
    setBpm(songBpm ? Math.round(songBpm) : null);
    setMusicalKey(songKey ?? null);
  }, [songId, uploadType, songBpm, songKey]);

  // BPM/Key are now cached server-side in the database (audio_features + songs/user_uploads tables).
  // Client-side auto-detection has been removed because it downloads the full audio file in a Web Worker
  // and was hanging indefinitely for B2-hosted tracks. If a track is missing cached values, the UI simply
  // hides the BPM/Key chips instead of showing a spinner.

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

  // Imperfection / simulation: apply config updates and poll metrics
  useEffect(() => {
    if (imperfectionChainRef.current) {
      imperfectionChainRef.current.updateConfig(imperfectionConfig);
    }
  }, [imperfectionConfig]);

  useEffect(() => {
    let mounted = true;
    const poll = () => {
      if (!mounted) return;
      if (imperfectionChainRef.current) {
        setImperfectionMetrics(imperfectionChainRef.current.getMetrics());
      }
      requestAnimationFrame(poll);
    };
    const id = requestAnimationFrame(poll);
    return () => {
      mounted = false;
      cancelAnimationFrame(id);
    };
  }, []);

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

        // Create imperfection / simulation chain
        const imperfectionChain = new ImperfectionChain(ctx, imperfectionConfigRef.current);
        imperfectionChainRef.current = imperfectionChain;

        // Register AudioWorklet modules before connecting (Phase 3)
        await advancedFX.init();

        let chain: AudioChain;
        try {
          chain = attachAudioChain(audio, advancedFX, ctx, imperfectionChain);
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
      if (imperfectionChainRef.current) {
        imperfectionChainRef.current.destroy();
        imperfectionChainRef.current = null;
      }
    };
  }, [songUrl]);

  return (
    <div className="eq-room">
      <LecturerConsole
        ref={canvasRef}
        songTitle={songTitle}
        songArtist={songArtist}
        songAlbum={songAlbum}
        songGenre={songGenre}
        songCoverImage={songCoverImage}
        songUrl={songUrl}
        uploadType={uploadType}
        bpm={bpm}
        musicalKey={musicalKey}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        audioElement={audioRef.current}
        onTogglePlay={togglePlay}
        onStop={stopPlayback}
        onRewind={rewindToStart}
        isEnhanced={isEnhanced}
        onToggleAB={() => toggleAB(!isEnhancedRef.current)}
        onSeek={(time) => {
          if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
          }
        }}
        eqSettings={settings}
        onEqChange={handleSliderChange}
        fxMacroValue={advancedFX.macroValue}
        onFxMacroChange={handleMacroChange}
        consoleSettings={consoleSettings}
        onConsoleChange={setConsoleSettings}
        imperfectionConfig={imperfectionConfig}
        onImperfectionChange={setImperfectionConfig}
        imperfectionMetrics={imperfectionMetrics}
        onSaveImperfectionProfile={saveImperfectionProfile}
        onResetImperfectionProfile={resetImperfectionProfile}
        isSavingImperfectionProfile={isSavingImperfectionProfile}
        spectrumStatus={spectrumStatus}
        vuAnalyser={vuAnalyserRef.current}
        isLiveStream={songId.startsWith("live-")}
        compressorGR={compressorGR}
        limiterGR={limiterGR}
        error={error}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
