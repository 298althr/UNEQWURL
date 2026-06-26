"use client";

import { memo, useRef, useState, useCallback, useEffect, useMemo } from "react";

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  bipolar?: boolean;
  size?: number;
  color?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  /** Optional benchmark target — renders a small tick on the arc */
  benchmarkValue?: number;
};

function formatValue(v: number, bipolar: boolean) {
  if (bipolar) return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
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
  benchmarkValue,
}: Props) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ y: number; value: number } | null>(null);

  const startAngle = -135;
  const endAngle = 135;
  const sweep = endAngle - startAngle;
  // Sensitivity: pixels to traverse full range
  const SENSITIVITY = 180;

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);
  const snap = useCallback((v: number) => {
    const stepped = Math.round(v / step) * step;
    return parseFloat(clamp(stepped).toFixed(10));
  }, [step, clamp]);

  const normalized = useMemo(() => (value - min) / (max - min), [value, min, max]);
  const angle = startAngle + normalized * sweep;

  // ── Vertical drag interaction ──
  const startDrag = useCallback(
    (clientY: number) => {
      if (disabled) return;
      setDragging(true);
      dragStartRef.current = { y: clientY, value };
    },
    [disabled, value]
  );

  const moveDrag = useCallback(
    (clientY: number) => {
      if (!dragging || !dragStartRef.current) return;
      const dy = dragStartRef.current.y - clientY; // up = positive
      const range = max - min;
      const delta = (dy / SENSITIVITY) * range;
      onChange(snap(dragStartRef.current.value + delta));
    },
    [dragging, max, min, snap, onChange]
  );

  const endDrag = useCallback(() => {
    setDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const mm = (e: MouseEvent) => moveDrag(e.clientY);
    const mu = () => endDrag();
    const tm = (e: TouchEvent) => { if (e.touches[0]) moveDrag(e.touches[0].clientY); };
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

  // Scroll wheel support
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * step * (e.shiftKey ? 5 : 1);
      onChange(snap(value + delta));
    },
    [disabled, value, step, snap, onChange]
  );

  // ── SVG arc geometry ──
  const center = size / 2;
  const strokeWidth = Math.max(3, size / 18);
  const arcRadius = (size - strokeWidth * 2 - 6) / 2;

  const polar = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: center + arcRadius * Math.cos(rad), y: center + arcRadius * Math.sin(rad) };
  };

  const start = polar(startAngle);
  const end = polar(endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  const trackPath = `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`;

  const current = polar(angle);
  const litLargeArc = Math.abs(angle - startAngle) > 180 ? 1 : 0;
  const litPath = `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${litLargeArc} 1 ${current.x} ${current.y}`;

  // Benchmark marker
  const benchmarkAngle = benchmarkValue !== undefined
    ? startAngle + ((benchmarkValue - min) / (max - min)) * sweep
    : null;
  const bmPt = benchmarkAngle !== null ? polar(benchmarkAngle) : null;

  // Cap pointer
  const capSize = size - strokeWidth * 4;
  const pointerRad = ((angle - 90) * Math.PI) / 180;
  const dotR = Math.max(3, size / 20);
  const dotOffset = capSize / 2 - dotR - 4;

  const filterId = `knob-glow-${label.replace(/\s+/g, "-")}-${size}`;

  return (
    <div
      className="console-knob"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <div
        ref={knobRef}
        className={`console-knob-body${dragging ? " dragging" : ""}`}
        style={{ width: size, height: size, position: "relative", cursor: disabled ? "default" : dragging ? "grabbing" : "ns-resize" }}
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientY); }}
        onTouchStart={(e) => { if (e.touches[0]) startDrag(e.touches[0].clientY); }}
        onWheel={onWheel}
        onDoubleClick={() => { if (!disabled) onChange(bipolar ? 0 : min); }}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          const delta = step * (e.shiftKey ? 5 : 1);
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(snap(value + delta));
          else if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(snap(value - delta));
          else if (e.key === "Home") onChange(bipolar ? 0 : min);
          else if (e.key === "End") onChange(max);
        }}
      >
        {/* Arc SVG */}
        <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track ring */}
          <path d={trackPath} fill="none" stroke="rgba(128,128,128,0.18)" strokeWidth={strokeWidth} strokeLinecap="round" />
          {/* Lit arc */}
          <path
            d={litPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
          />
          {/* Benchmark tick */}
          {bmPt && (
            <circle
              cx={bmPt.x}
              cy={bmPt.y}
              r={strokeWidth * 0.9}
              fill="#fbbf24"
              stroke="none"
              opacity={0.85}
            />
          )}
        </svg>

        {/* Knob cap */}
        <div
          className="console-knob-cap"
          style={{
            width: capSize,
            height: capSize,
            borderRadius: "50%",
            position: "absolute",
            top: (size - capSize) / 2,
            left: (size - capSize) / 2,
            transform: `rotate(${angle}deg)`,
            transition: dragging ? "none" : "transform 0.08s ease",
          }}
        >
          <div
            className="console-knob-dot"
            style={{
              width: dotR * 2,
              height: dotR * 2,
              borderRadius: "50%",
              background: color,
              position: "absolute",
              top: dotOffset - dotR + (size - capSize) / 2,
              left: "50%",
              transform: "translateX(-50%)",
              boxShadow: `0 0 ${dotR * 2}px ${color}`,
            }}
          />
        </div>
      </div>

      <div className="console-knob-label">{label}</div>
      <div className="console-knob-value" style={{ color }}>{formatValue(value, bipolar)}</div>
    </div>
  );
}

export default memo(ConsoleKnob);
