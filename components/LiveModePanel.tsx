"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Mic, MicOff, Radio, AlertTriangle, Zap, Activity } from "lucide-react";
import { LiveInputProcessor } from "@/lib/live-audio";
import type { LiveInputStatus, LiveInputConfig } from "@/lib/live-audio";
import type { ClipStatus } from "@/lib/clip-detector";
import { ClipDetector } from "@/lib/clip-detector";
import { SCENE_PRESETS, getScenesForSoundClass, type ScenePreset } from "@/lib/scene-presets";
import type { ConsoleSettings } from "@/lib/audio-chain";
import type { EQSettings } from "@/lib/types";

type Props = {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  soundClass: string;
  isLiveMode: boolean;
  activeSceneId?: string | null;
  onToggleLive: (active: boolean) => void;
  onSceneApply: (scene: ScenePreset) => void;
  liveProcessorRef: React.MutableRefObject<LiveInputProcessor | null>;
};

export default function LiveModePanel({
  audioContext,
  analyser,
  soundClass,
  isLiveMode,
  activeSceneId,
  onToggleLive,
  onSceneApply,
  liveProcessorRef,
}: Props) {
  const [liveStatus, setLiveStatus] = useState<LiveInputStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clipStatus, setClipStatus] = useState<ClipStatus | null>(null);
  const [inputLevel, setInputLevel] = useState<number | null>(null);
  const clipDetectorRef = useRef<ClipDetector | null>(null);
  const levelIntervalRef = useRef<number | null>(null);

  const availableScenes = getScenesForSoundClass(soundClass);

  // Start/stop clip detector when live mode toggles
  useEffect(() => {
    if (isLiveMode && analyser) {
      const detector = new ClipDetector(analyser);
      detector.start();
      detector.onStatus(setClipStatus);
      clipDetectorRef.current = detector;

      // Input level polling
      levelIntervalRef.current = window.setInterval(() => {
        if (liveProcessorRef.current?.status === "active") {
          setInputLevel(liveProcessorRef.current.getInputLevel());
        }
      }, 100);

      return () => {
        detector.destroy();
        if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
        clipDetectorRef.current = null;
        setClipStatus(null);
        setInputLevel(null);
      };
    }
  }, [isLiveMode, analyser, liveProcessorRef]);

  const handleToggleLive = useCallback(async () => {
    if (!audioContext) return;

    if (isLiveMode) {
      // Stop live mode
      liveProcessorRef.current?.stop();
      setLiveStatus("idle");
      onToggleLive(false);
    } else {
      // Start live mode
      if (liveProcessorRef.current) {
        liveProcessorRef.current.destroy();
      }
      const processor = new LiveInputProcessor(audioContext);
      liveProcessorRef.current = processor;
      setLiveStatus("requesting");
      const ok = await processor.start();
      if (ok) {
        setLiveStatus("active");
        setErrorMsg(null);
        onToggleLive(true);
      } else {
        setLiveStatus("error");
        setErrorMsg(processor.errorMsg);
      }
    }
  }, [audioContext, isLiveMode, liveProcessorRef, onToggleLive]);

  const handleSceneSelect = useCallback((scene: ScenePreset) => {
    onSceneApply(scene);
  }, [onSceneApply]);

  const isActive = liveStatus === "active";
  const isRequesting = liveStatus === "requesting";
  const isClipping = clipStatus?.isClipping ?? false;
  const isDCOffset = clipStatus?.isDCOffset ?? false;

  // Input level meter position: -60 to 0 dB → 0-100%
  const levelPct = inputLevel !== null ? Math.max(0, Math.min(100, ((inputLevel + 60) / 60) * 100)) : 0;
  const levelColor = inputLevel !== null && inputLevel > -1 ? "#f87171" : inputLevel !== null && inputLevel > -6 ? "#FFB347" : "#22c55e";

  return (
    <div className="live-mode-panel">
      <div className="live-mode-header">
        <Radio size={12} />
        <span>Live Production Mode</span>
      </div>

      {/* Live Mode Toggle */}
      <div className="live-mode-toggle-row">
        <button
          type="button"
          onClick={handleToggleLive}
          disabled={isRequesting || !audioContext}
          className={`live-toggle-btn${isActive ? " active" : ""}`}
        >
          {isActive ? <Mic size={16} /> : isRequesting ? <Activity size={16} className="spin" /> : <MicOff size={16} />}
          <span>{isActive ? "Stop Live Input" : isRequesting ? "Requesting..." : "Start Live Input"}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="live-error-banner">
          <AlertTriangle size={12} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Input Level Meter */}
      {isActive && (
        <div className="live-input-level">
          <div className="live-input-level-header">
            <span>Input Level</span>
            <span style={{ color: levelColor, fontVariantNumeric: "tabular-nums" }}>
              {inputLevel !== null ? `${inputLevel.toFixed(1)}dB` : "--"}
            </span>
          </div>
          <div className="live-input-level-track">
            <div className="live-input-level-fill" style={{ width: `${levelPct}%`, background: levelColor }} />
          </div>
        </div>
      )}

      {/* Clip & DC Offset Warnings */}
      {isActive && clipStatus && (
        <div className="live-warnings">
          {isClipping && (
            <div className="live-warning live-warning--clip">
              <Zap size={12} />
              <span>CLIPPING DETECTED ({clipStatus.clipCount} clips)</span>
            </div>
          )}
          {isDCOffset && (
            <div className="live-warning live-warning--dc">
              <AlertTriangle size={12} />
              <span>DC Offset Detected</span>
            </div>
          )}
          {!isClipping && !isDCOffset && (
            <div className="live-warning live-warning--ok">
              <span>Signal OK — no clipping or DC offset</span>
            </div>
          )}
        </div>
      )}

      {/* Scene Presets */}
      <div className="live-scenes">
        <div className="live-scenes-label">Scene Presets</div>
        <div className="live-scenes-grid">
          {availableScenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => handleSceneSelect(scene)}
              className={`scene-preset-btn${activeSceneId === scene.id ? " active" : ""}`}
              title={scene.description}
            >
              <span className="scene-preset-name">{scene.name}</span>
              <span className="scene-preset-desc">{scene.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Peak / RMS readout */}
      {isActive && clipStatus && (
        <div className="live-readout">
          <div className="live-readout-row">
            <span>Peak</span>
            <span style={{ color: clipStatus.peakDb > -0.5 ? "#f87171" : "var(--text)" }}>
              {clipStatus.peakDb.toFixed(1)}dB
            </span>
          </div>
          <div className="live-readout-row">
            <span>RMS</span>
            <span>{clipStatus.rmsDb.toFixed(1)}dB</span>
          </div>
          <div className="live-readout-row">
            <span>Clips</span>
            <span style={{ color: clipStatus.clipCount > 0 ? "#f87171" : "var(--text)" }}>
              {clipStatus.clipCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
