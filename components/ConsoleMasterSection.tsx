"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ConsoleSettings } from "@/lib/audio-chain";
import ConsoleKnob from "./ConsoleKnob";

type Props = {
  settings: ConsoleSettings;
  onChange: (settings: ConsoleSettings) => void;
  outputDb?: number;
};

function MasterFader({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const percent = ((value - min) / (max - min)) * 100;

  const compute = useCallback(
    (cy: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return value;
      const y = Math.max(0, Math.min(rect.height, cy - rect.top));
      const p = 1 - y / rect.height;
      const raw = min + p * (max - min);
      return Math.max(min, Math.min(max, Math.round(raw * 10) / 10));
    },
    [value, min, max]
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
    <div className="console-master-fader">
      <span className="console-master-fader-label">{label}</span>
      <div
        ref={trackRef}
        className="console-master-fader-track"
        onMouseDown={(e) => start(e.clientY)}
        onTouchStart={(e) => {
          if (e.touches[0]) start(e.touches[0].clientY);
        }}
      >
        <div className="console-master-fader-fill" style={{ height: `${percent}%` }} />
        <div className="console-master-fader-thumb" style={{ bottom: `calc(${percent}% - 8px)` }} />
        <div className="console-master-fader-zero" />
      </div>
      <span className="console-master-fader-value">{value.toFixed(1)}</span>
    </div>
  );
}

export default function ConsoleMasterSection({ settings, onChange, outputDb = -60 }: Props) {
  return (
    <div className="console-master-section">
      <div className="console-master-header">MASTER</div>
      <div className="console-master-faders">
        <MasterFader
          label="Main"
          value={settings.gain}
          min={-12}
          max={12}
          onChange={(v) => onChange({ ...settings, gain: v })}
        />
        <MasterFader
          label="Comp Thr"
          value={settings.compressor.threshold}
          min={-60}
          max={0}
          onChange={(v) =>
            onChange({
              ...settings,
              compressor: { ...settings.compressor, threshold: v },
            })
          }
        />
        <MasterFader
          label="Lim Cel"
          value={settings.limiter.ceiling}
          min={-12}
          max={0}
          onChange={(v) =>
            onChange({
              ...settings,
              limiter: { ...settings.limiter, ceiling: v },
            })
          }
        />
      </div>
      <div className="console-master-knobs">
        <ConsoleKnob
          label="Pan"
          value={settings.pan}
          min={-1}
          max={1}
          step={0.01}
          bipolar
          size={48}
          color="#6B8CFF"
          onChange={(v) => onChange({ ...settings, pan: v })}
        />
        <ConsoleKnob
          label="Width"
          value={settings.width}
          min={0}
          max={2}
          step={0.01}
          bipolar={false}
          size={48}
          color="#00D4AA"
          onChange={(v) => onChange({ ...settings, width: v })}
        />
      </div>
      <div className="console-master-output">
        <div className="console-master-output-label">OUT</div>
        <div className="console-master-output-db">{outputDb.toFixed(1)} dB</div>
      </div>
    </div>
  );
}
