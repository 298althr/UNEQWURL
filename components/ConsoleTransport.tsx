"use client";

import { SkipBack, Play, Pause, Square } from "lucide-react";

type Props = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onStop: () => void;
  onRewind: () => void;
  isEnhanced: boolean;
  onToggleAB: () => void;
};

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ConsoleTransport({ isPlaying, currentTime, duration, onPlay, onStop, onRewind, isEnhanced, onToggleAB }: Props) {
  return (
    <div className="console-transport">
      <div className="console-transport-time">
        <span className="console-transport-current">{formatTime(currentTime)}</span>
        <span className="console-transport-divider">/</span>
        <span className="console-transport-duration">{formatTime(duration)}</span>
      </div>
      <div className="console-transport-buttons">
        <button type="button" onClick={onRewind} className="console-transport-btn" title="Rewind">
          <SkipBack size={18} />
        </button>
        <button type="button" onClick={onPlay} className="console-transport-btn console-transport-play" title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button type="button" onClick={onStop} className="console-transport-btn" title="Stop">
          <Square size={18} />
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleAB}
        className={`console-ab-toggle${isEnhanced ? " active" : ""}`}
        title={isEnhanced ? "Switch to Original (bypass)" : "Switch to Enhanced (298EQ on)"}
      >
        {isEnhanced ? "Enhanced (298EQ)" : "Original"}
      </button>
      <div className="console-transport-status">
        <span className={`console-transport-live ${isPlaying ? "active" : ""}`}>● LIVE</span>
      </div>
    </div>
  );
}
