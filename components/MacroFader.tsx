"use client";

import { memo, useRef, useState, useCallback, useEffect } from "react";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent?: boolean;
}

function MacroFader({ label, value, onChange, accent = true }: Props) {
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

  return (
    <div className={`mixer-channel${accent ? " primary" : ""}`}>
      <span className="mixer-channel-label">{label}</span>
      <div
        ref={trackRef}
        className="fader-track"
        onMouseDown={(e) => start(e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) start(t.clientY);
        }}
        style={{ position: "relative", height: 140 }}
      >
        <div
          className="fader-fill"
          style={{
            height: `${percent}%`,
            transition: dragging ? "none" : "height 0.15s ease",
            background: accent ? "var(--accent)" : undefined,
          }}
        />
        <div
          className="fader-thumb"
          style={{
            bottom: `calc(${percent}% - 6px)`,
            transition: dragging ? "none" : "bottom 0.15s ease",
            background: accent ? "var(--accent)" : undefined,
            borderColor: accent ? "var(--accent-light)" : undefined,
          }}
        />
      </div>
      <span className="fader-value">{value}%</span>
    </div>
  );
}

export default memo(MacroFader);
