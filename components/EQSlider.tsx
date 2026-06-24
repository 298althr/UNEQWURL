"use client";

import { memo, useRef, useState, useCallback, useEffect } from "react";
import type { EQBand } from "@/lib/types";
import { BAND_LABELS } from "@/lib/types";

type Props = {
  band: EQBand;
  value: number;
  step?: number;
  onChange: (value: number) => void;
};

function EQSlider({ band, value, step = 0.1, onChange }: Props) {
  const is298 = band === "eq298";
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const min = -12;
  const max = 12;

  const formattedValue = is298
    ? `${Math.round(((value + 12) / 24) * 100)}% Enhanced`
    : `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`;

  const percent = ((value - min) / (max - min)) * 100;
  const centerPercent = ((0 - min) / (max - min)) * 100;

  const computeValueFromY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const p = 1 - y / rect.height;
      const raw = min + p * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [value, step]
  );

  const handleStart = useCallback(
    (clientY: number) => {
      setIsDragging(true);
      onChange(computeValueFromY(clientY));
    },
    [computeValueFromY, onChange]
  );

  const handleMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      onChange(computeValueFromY(clientY));
    },
    [isDragging, computeValueFromY, onChange]
  );

  const handleEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div className={`mixer-channel${is298 ? " primary" : ""}`}>
      <span className="mixer-channel-label">{BAND_LABELS[band]}</span>

      <div
        ref={trackRef}
        className="fader-track"
        onMouseDown={(e) => handleStart(e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) handleStart(t.clientY);
        }}
        style={{ position: "relative" }}
      >
        <div
          className="fader-fill"
          style={{
            height: `${percent}%`,
            transition: isDragging ? "none" : "height 0.15s ease",
          }}
        />
        {/* 0 dB center marker */}
        <div
          style={{
            position: "absolute",
            left: -6,
            right: -6,
            bottom: `${centerPercent}%`,
            height: 1,
            background: "rgba(255,255,255,0.15)",
            pointerEvents: "none",
          }}
        />
        <div
          className="fader-thumb"
          style={{
            bottom: `calc(${percent}% - 6px)`,
            transition: isDragging ? "none" : "bottom 0.15s ease",
          }}
        />
      </div>

      <span className="fader-value">{formattedValue}</span>

      {/* Hidden accessible input for keyboard users */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={`${BAND_LABELS[band]} adjustment`}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
        }}
      />
    </div>
  );
}

export default memo(EQSlider);
