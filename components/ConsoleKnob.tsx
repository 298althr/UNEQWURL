"use client";

import { memo, useRef, useState, useCallback, useEffect, useMemo } from "react";

type Props = {
  label: string;
  value: number; // normalized 0..1 or -1..1 depending on bipolar
  min?: number;
  max?: number;
  step?: number;
  bipolar?: boolean;
  size?: number;
  color?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
};

function formatValue(v: number, bipolar: boolean, min: number, max: number) {
  if (bipolar) {
    const range = Math.max(Math.abs(min), Math.abs(max));
    return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
  }
  return `${Math.round(v)}`;
}

function ConsoleKnob({
  label,
  value,
  min = -12,
  max = 12,
  step = 0.1,
  bipolar = true,
  size = 64,
  color = "#FF58AE",
  onChange,
  disabled = false,
}: Props) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const startAngle = -135;
  const endAngle = 135;
  const sweep = endAngle - startAngle;

  const normalized = useMemo(() => {
    return (value - min) / (max - min);
  }, [value, min, max]);

  const angle = startAngle + normalized * sweep;

  const valueFromAngle = useCallback(
    (a: number) => {
      let clamped = Math.max(startAngle, Math.min(endAngle, a));
      const n = (clamped - startAngle) / sweep;
      const raw = min + n * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step]
  );

  const angleFromEvent = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = knobRef.current?.getBoundingClientRect();
      if (!rect) return angle;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      let a = Math.atan2(dy, dx) * (180 / Math.PI);
      a += 90; // 12 o'clock is -90 in atan2; rotate so 12 o'clock is 0
      // Normalize to -180..180
      while (a > 180) a -= 360;
      while (a < -180) a += 360;
      // Clamp to knob sweep
      if (a < -180) a = -180;
      return a;
    },
    [angle]
  );

  const startDrag = useCallback(
    (e: { clientX: number; clientY: number; preventDefault?: () => void }) => {
      if (disabled) return;
      e.preventDefault?.();
      setDragging(true);
      const a = angleFromEvent(e);
      onChange(valueFromAngle(a));
    },
    [disabled, angleFromEvent, valueFromAngle, onChange]
  );

  const moveDrag = useCallback(
    (e: { clientX: number; clientY: number }) => {
      if (!dragging) return;
      const a = angleFromEvent(e);
      onChange(valueFromAngle(a));
    },
    [dragging, angleFromEvent, valueFromAngle, onChange]
  );

  const endDrag = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    const mm = (e: MouseEvent) => moveDrag(e);
    const mu = () => endDrag();
    const tm = (e: TouchEvent) => {
      if (e.touches[0]) moveDrag(e.touches[0]);
    };
    const te = () => endDrag();
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
  }, [dragging, moveDrag, endDrag]);

  const center = size / 2;
  const radius = (size - 8) / 2;
  const strokeWidth = 4;
  const arcRadius = radius - strokeWidth / 2 - 2;

  // Build arc path for the full track
  const polar = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: center + arcRadius * Math.cos(rad),
      y: center + arcRadius * Math.sin(rad),
    };
  };
  const start = polar(startAngle);
  const end = polar(endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  const trackPath = `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`;

  // Build lit arc path up to current angle
  const current = polar(angle);
  const litLargeArc = Math.abs(angle - startAngle) > 180 ? 1 : 0;
  const litPath = `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${litLargeArc} 1 ${current.x} ${current.y}`;

  const pointerLength = arcRadius - 4;
  const pointerRad = ((angle - 90) * Math.PI) / 180;
  const px = center + pointerLength * Math.cos(pointerRad);
  const py = center + pointerLength * Math.sin(pointerRad);

  return (
    <div
      className="console-knob"
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "grab" }}
    >
      <div
        ref={knobRef}
        className="console-knob-body"
        style={{ width: size, height: size, position: "relative" }}
        onMouseDown={(e) => startDrag(e)}
        onTouchStart={(e) => {
          if (e.touches[0]) startDrag(e.touches[0]);
        }}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          const delta = step * (e.shiftKey ? 5 : 1);
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            onChange(Math.min(max, value + delta));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            onChange(Math.max(min, value - delta));
          } else if (e.key === "Home") {
            onChange(bipolar ? 0 : min);
          } else if (e.key === "End") {
            onChange(max);
          }
        }}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <filter id={`knob-glow-${label.replace(/\s+/g, "-")}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track */}
          <path
            d={trackPath}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Lit arc */}
          <path
            d={litPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#knob-glow-${label.replace(/\s+/g, "-")})`}
            style={{ transition: dragging ? "none" : "stroke-dashoffset 0.1s ease" }}
          />
        </svg>
        {/* Knob cap */}
        <div
          className="console-knob-cap"
          style={{
            width: size - 16,
            height: size - 16,
            borderRadius: "50%",
            position: "absolute",
            top: 8,
            left: 8,
            background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), rgba(0,0,0,0.3))",
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.1), 0 4px 10px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
            transform: `rotate(${angle}deg)`,
            transition: dragging ? "none" : "transform 0.1s ease",
          }}
        >
          {/* Pointer dot */}
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: color,
              position: "absolute",
              top: 6,
              left: "50%",
              transform: "translateX(-50%)",
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        </div>
      </div>
      <div className="console-knob-label">{label}</div>
      <div className="console-knob-value">{formatValue(value, bipolar, min, max)}</div>
    </div>
  );
}

export default memo(ConsoleKnob);
