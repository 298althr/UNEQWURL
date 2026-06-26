"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Square, SkipBack, SkipForward } from "lucide-react";

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  audioElement: HTMLAudioElement | null;
  coverImage: string | null | undefined;
  title: string;
  artist: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onRewind: () => void;
  onSeek: (time: number) => void;
};

export default function MinimalPlayer({
  audioElement,
  coverImage,
  title,
  artist,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onStop,
  onRewind,
  onSeek,
}: Props) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSeek = useCallback(
    (clientX: number) => {
      if (!progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onSeek(pct * duration);
    },
    [duration, onSeek]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleSeek(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging) handleSeek(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      handleSeek(e.clientX);
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (!audioElement) return;
    const onClick = () => onTogglePlay();
    audioElement.addEventListener("click", onClick);
    return () => audioElement.removeEventListener("click", onClick);
  }, [audioElement, onTogglePlay]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="minimal-player">
      <div className="mp-cover">
        {coverImage ? (
          <img src={coverImage} alt={title} className="mp-cover-img" />
        ) : (
          <div className="mp-cover-placeholder">♪</div>
        )}
      </div>
      <div className="mp-body">
        <div className="mp-meta">
          <div className="mp-title">{title}</div>
          <div className="mp-artist">{artist || "Unknown Artist"}</div>
        </div>
        <div className="mp-progress" ref={progressRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <div className="mp-progress-track">
            <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="mp-progress-thumb" style={{ left: `${progress}%` }} />
        </div>
        <div className="mp-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="mp-controls">
          <button type="button" className="mp-btn" onClick={onRewind} title="Rewind">
            <SkipBack size={18} />
          </button>
          <button type="button" className="mp-btn mp-play" onClick={onTogglePlay} title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <button type="button" className="mp-btn" onClick={onStop} title="Stop">
            <Square size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
