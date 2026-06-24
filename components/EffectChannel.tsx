"use client";

import { memo, useRef, useState, useCallback, useEffect } from "react";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onToggle?: () => void;
  accentColor: string;
  accentLight: string;
}

function EffectChannel({
  label,
  value,
  onChange,
  onToggle,
  accentColor,
  accentLight,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const percent = value;

  const compute = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      return Math.round((1 - y / rect.height) * 100);
    },
    [value]
  );

  const start = useCallback(
    (cy: number) => {
      setDragging(true);
      onChange(compute(cy));
    },
    [compute, onChange]
  );

  const move = useCallback(
    (cy: number) => {
      if (!dragging) return;
      onChange(compute(cy));
    },
    [dragging, compute, onChange]
  );

  const end = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    const mm = (e: MouseEvent) => move(e.clientY);
    const mu = () => end();
    const tm = (e: TouchEvent) => {
      if (e.touches[0]) move(e.touches[0].clientY);
    };
    const te = () => end();
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    window.addEventListener("touchmove", tm, { passive: false });
    window.addEventListener("touchend", te);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", mu);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchend", te);
    };
  }, [dragging, move, end]);

  const isActive = value > 0;

  return (
    <div className="fx-slider-column">
      <div className="fx-slider-label">{label}</div>
      <div
        ref={trackRef}
        className="fx-fader-well"
        onMouseDown={(e) => start(e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) start(t.clientY);
        }}
      >
        <div className="fx-fader-rail" />
        <div
          className="fx-fader-cap"
          style={{
            bottom: `calc(${percent}% - 5px)`,
            transition: dragging ? "none" : "bottom 0.15s ease",
            background: accentColor,
            borderColor: accentLight,
            boxShadow: isActive
              ? `0 2px 6px rgba(0,0,0,0.6), 0 0 8px ${accentColor}40`
              : `0 2px 6px rgba(0,0,0,0.6)`,
          }}
        />
      </div>
      <div className="fx-readout">{value}%</div>
      <button
        type="button"
        onClick={onToggle}
        className={`fx-toggle-btn ${isActive ? "active" : ""}`}
        title={isActive ? "Turn off" : "Turn on"}
      />
    </div>
  );
}

export default memo(EffectChannel);
