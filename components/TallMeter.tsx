"use client";

import { useEffect, useRef, memo } from "react";

type Props = {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  width?: number;
  height?: number;
  minDb?: number;
  maxDb?: number;
  label?: string;
  showPeak?: boolean;
  type?: "level" | "gr";
  value?: number; // optional external value for GR meters
};

function dbFromFloat(v: number) {
  return 20 * Math.log10(Math.max(1e-10, v));
}

function TallMeter({
  analyser,
  isPlaying,
  width = 28,
  height = 240,
  minDb = -60,
  maxDb = 0,
  label,
  showPeak = true,
  type = "level",
  value,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peakRef = useRef(minDb);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Background shell
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, height);

      let db = minDb;
      if (type === "gr" && value !== undefined) {
        db = Math.max(minDb, Math.min(maxDb, -value));
      } else if (analyser && isPlaying) {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const a = Math.abs(data[i]);
          if (a > peak) peak = a;
        }
        db = dbFromFloat(peak);
      }

      // Peak hold decay
      if (db > peakRef.current) {
        peakRef.current = db;
      } else {
        peakRef.current *= 0.98;
        if (peakRef.current < minDb) peakRef.current = minDb;
      }

      // Map db to height (bottom = minDb, top = maxDb)
      const dbToY = (d: number) => {
        const n = (d - minDb) / (maxDb - minDb);
        return height - Math.max(0, Math.min(1, n)) * height;
      };

      const y = dbToY(db);
      const peakY = dbToY(peakRef.current);

      // Draw segmented LED fill
      const segHeight = 4;
      const segGap = 2;
      const segments = Math.floor((height - 4) / (segHeight + segGap));
      for (let i = 0; i < segments; i++) {
        const segY = height - 4 - i * (segHeight + segGap);
        const segDb = minDb + (i / segments) * (maxDb - minDb);
        let color = "rgba(34,197,94,0.35)"; // green
        if (segDb > -6) color = "rgba(239,68,68,0.35)"; // red
        else if (segDb > -18) color = "rgba(234,179,8,0.35)"; // yellow

        // Light up if current level is above this segment
        if (segDb <= db) {
          if (segDb > -6) color = "rgba(239,68,68,0.95)";
          else if (segDb > -18) color = "rgba(234,179,8,0.95)";
          else color = "rgba(34,197,94,0.95)";
        }

        ctx.fillStyle = color;
        ctx.fillRect(3, segY, width - 6, segHeight);
      }

      // Peak hold line
      if (showPeak && peakRef.current > minDb) {
        ctx.fillStyle = type === "gr" ? "rgba(255,88,174,0.9)" : "rgba(255,255,255,0.8)";
        ctx.fillRect(2, peakY - 1, width - 4, 2);
      }

      // Center 0 dB marker for level meters
      if (type === "level") {
        const zeroY = dbToY(0);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(0, zeroY, width, 1);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, isPlaying, width, height, minDb, maxDb, showPeak, type, value]);

  return (
    <div className="tall-meter" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        style={{ width, height, display: "block" }}
        aria-label={label || "level meter"}
      />
      {label && <div className="tall-meter-label">{label}</div>}
    </div>
  );
}

export default memo(TallMeter);
