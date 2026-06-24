"use client";

import { useEffect, useRef, useCallback } from "react";

interface VUMeterProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export default function VUMeter({ analyser, isPlaying }: VUMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const peakHoldRef = useRef<number>(-Infinity);
  const rmsHoldRef = useRef<number>(-Infinity);
  const clipRef = useRef<boolean>(false);
  const clipTimerRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyserNode = analyser;
    if (!canvas || !analyserNode) {
      animFrameRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }

    const width = rect.width;
    const height = rect.height;

    const bufferLength = analyserNode.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteTimeDomainData(dataArray);

    // Compute peak and RMS from time-domain data
    let peak = 0;
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = (dataArray[i] - 128) / 128;
      const absSample = Math.abs(sample);
      if (absSample > peak) peak = absSample;
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    // Convert to dBFS
    const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

    // Peak hold with 36 dB/sec decay (assuming ~60fps)
    const decayPerFrame = 36 / 60;
    if (peakDb > peakHoldRef.current) {
      peakHoldRef.current = peakDb;
    } else {
      peakHoldRef.current -= decayPerFrame;
    }
    if (rmsDb > rmsHoldRef.current) {
      rmsHoldRef.current = rmsDb;
    } else {
      rmsHoldRef.current -= decayPerFrame;
    }

    // Clip detection: peak >= -0.5 dBFS
    if (peakDb >= -0.5) {
      clipRef.current = true;
      clipTimerRef.current = 120; // ~2 seconds at 60fps
    } else if (clipTimerRef.current > 0) {
      clipTimerRef.current--;
      if (clipTimerRef.current === 0) clipRef.current = false;
    }

    ctx.clearRect(0, 0, width, height);

    // Meter dimensions
    const meterWidth = width * 0.35;
    const meterGap = width * 0.06;
    const labelWidth = width * 0.12;
    const meterHeight = height - 24;
    const meterY = 12;

    // Draw scale labels on the left
    ctx.fillStyle = "var(--muted)";
    ctx.font = "9px Geist, sans-serif";
    ctx.textAlign = "right";
    const scaleMarks = [
      { db: 0, label: "0" },
      { db: -6, label: "-6" },
      { db: -12, label: "-12" },
      { db: -18, label: "-18" },
      { db: -24, label: "-24" },
      { db: -36, label: "-36" },
      { db: -48, label: "-48" },
      { db: -60, label: "-60" },
    ];

    for (const mark of scaleMarks) {
      const y = meterY + meterHeight * (1 - (mark.db + 60) / 60);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(mark.label, labelWidth - 4, y + 3);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.moveTo(labelWidth, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Colored zone lines across both meters
    const drawZoneLine = (db: number, color: string, dashed = false) => {
      const y = meterY + meterHeight * (1 - (db + 60) / 60);
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1 : 1.5;
      if (dashed) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(labelWidth, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    drawZoneLine(0, "rgba(239, 68, 68, 0.5)");       // red — clip zone
    drawZoneLine(-6, "rgba(234, 179, 8, 0.4)");      // yellow — hot zone
    drawZoneLine(-18, "rgba(34, 197, 94, 0.35)", true); // green dashed — target RMS

    // Draw Peak meter (left bar)
    const peakMeterX = labelWidth;
    const rmsMeterX = labelWidth + meterWidth + meterGap;

    // Map dB to height: -60dB = 0%, 0dB = 100%
    const dbToHeight = (db: number) => {
      const clamped = Math.max(-60, Math.min(0, db));
      return ((clamped + 60) / 60) * meterHeight;
    };

    // Draw meter backgrounds
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(peakMeterX, meterY, meterWidth, meterHeight);
    ctx.fillRect(rmsMeterX, meterY, meterWidth, meterHeight);

    // Draw peak bar with gradient (green → yellow → red)
    const drawMeterBar = (x: number, db: number) => {
      const barHeight = dbToHeight(db);
      const y = meterY + meterHeight - barHeight;

      const gradient = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
      gradient.addColorStop(0, "#22c55e");     // green: -60 to -12
      gradient.addColorStop(0.8, "#eab308");   // yellow: -12 to -6
      gradient.addColorStop(0.9, "#f97316");   // orange: -6 to -3
      gradient.addColorStop(1, "#ef4444");     // red: -3 to 0

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, meterWidth, barHeight);

      // Peak hold line
      const holdDb = x === peakMeterX ? peakHoldRef.current : rmsHoldRef.current;
      const holdY = meterY + meterHeight - dbToHeight(holdDb);
      ctx.fillStyle = holdDb > -6 ? "#ef4444" : holdDb > -12 ? "#eab308" : "#22c55e";
      ctx.fillRect(x, holdY - 1.5, meterWidth, 2);
    };

    drawMeterBar(peakMeterX, peakDb);
    drawMeterBar(rmsMeterX, rmsDb);

    // Labels
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "8px Geist, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PEAK", peakMeterX + meterWidth / 2, height - 4);
    ctx.fillText("RMS", rmsMeterX + meterWidth / 2, height - 4);

    // Clip indicator
    if (clipRef.current) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(width - 12, 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 8px Geist, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("CLIP", width - 20, 15);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [analyser]);

  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [draw]);

  return (
    <div className="vu-meter-container">
      <div className="section-label" style={{ margin: 0, marginBottom: "6px" }}>Level Meter</div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "180px", display: "block" }}
      />
    </div>
  );
}
