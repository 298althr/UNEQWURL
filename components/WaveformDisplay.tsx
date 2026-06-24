"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WaveformDisplayProps {
  audioUrl: string;
  audioElement: HTMLAudioElement | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isLiveStream?: boolean;
}

interface PeakData {
  peaks: { min: number; max: number }[];
  sampleRate: number;
  duration: number;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function WaveformDisplay({
  audioUrl,
  audioElement,
  currentTime,
  duration,
  onSeek,
  isLiveStream = false,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peaksRef = useRef<PeakData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Decode audio and compute peaks
  useEffect(() => {
    if (isLiveStream || !audioUrl) return;
    let cancelled = false;

    const computePeaks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error("Failed to fetch audio");
        const arrayBuffer = await response.arrayBuffer();

        // Use a temporary AudioContext for decoding
        const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        tempCtx.close();

        if (cancelled) return;

        const channelData = audioBuffer.getChannelData(0);
        // Target ~300 bars for a clear, detailed waveform
        const targetBars = 300;
        const samplesPerSlice = Math.max(1, Math.floor(channelData.length / targetBars));
        const sliceCount = Math.floor(channelData.length / samplesPerSlice);
        const peaks: { min: number; max: number }[] = [];

        for (let i = 0; i < sliceCount; i++) {
          let min = 1.0;
          let max = -1.0;
          const start = i * samplesPerSlice;
          const end = Math.min(start + samplesPerSlice, channelData.length);
          for (let j = start; j < end; j++) {
            const sample = channelData[j];
            if (sample < min) min = sample;
            if (sample > max) max = sample;
          }
          peaks.push({ min, max });
        }

        if (!cancelled) {
          peaksRef.current = { peaks, sampleRate: audioBuffer.sampleRate, duration: audioBuffer.duration };
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[Waveform] Failed to decode audio:", err);
          setError("Waveform unavailable");
          setLoading(false);
        }
      }
    };

    computePeaks();

    return () => {
      cancelled = true;
    };
  }, [audioUrl, isLiveStream]);

  // Draw waveform + playhead
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
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
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    const peaksData = peaksRef.current;
    // Resolve CSS accent color to a usable canvas color
    const accentColors = { played: "#ff58ae", playedDim: "rgba(255,88,174,0.4)", unplayed: "rgba(255,255,255,0.18)" };

    if (isLiveStream || error || !peaksData || peaksData.peaks.length === 0) {
      // Draw flat line for live streams or when no data
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "10px Geist, sans-serif";
      ctx.textAlign = "center";
      if (isLiveStream) {
        ctx.fillText("Live stream — waveform not available", width / 2, midY + 4);
      } else if (loading) {
        ctx.fillText("Analyzing waveform...", width / 2, midY + 4);
      } else if (error) {
        ctx.fillText(error, width / 2, midY + 4);
      }
      animFrameRef.current = requestAnimationFrame(draw);
      return;
    }

    const peaks = peaksData.peaks;
    const barWidth = width / peaks.length;
    const progress = duration > 0 ? currentTime / duration : 0;
    const playheadX = progress * width;

    // Draw center reference line
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Draw time grid markers
    if (duration > 0) {
      const numMarkers = Math.min(10, Math.ceil(duration / 10));
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "9px Geist, sans-serif";
      ctx.textAlign = "center";
      for (let m = 0; m <= numMarkers; m++) {
        const x = (m / numMarkers) * width;
        const t = (m / numMarkers) * duration;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.fillText(formatTime(t), x, height - 2);
      }
    }

    // Draw waveform bars — mirrored top/bottom for clear visual
    const playedGradient = ctx.createLinearGradient(0, 0, 0, height);
    playedGradient.addColorStop(0, "#ff58ae");
    playedGradient.addColorStop(0.5, "rgba(255,88,174,0.7)");
    playedGradient.addColorStop(1, "#ff58ae");

    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const x = i * barWidth;
      // Minimum amplitude floor so quiet sections are still visible (0.12 = 12% minimum)
      const amplitude = Math.max(0.12, Math.max(Math.abs(peak.max), Math.abs(peak.min)));
      const barH = Math.max(2, amplitude * midY * 0.92);
      // Use full barWidth with no gaps — bars touch edge-to-edge for full-width waveform
      const drawW = Math.max(1, barWidth);

      if (x < playheadX) {
        ctx.fillStyle = playedGradient;
      } else {
        ctx.fillStyle = accentColors.unplayed;
      }
      // Draw centered bar (mirrored from midY)
      ctx.fillRect(x, midY - barH, drawW, barH * 2);
    }

    // Draw playhead line
    if (duration > 0) {
      ctx.strokeStyle = "#ff58ae";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead dot
      ctx.fillStyle = "#ff58ae";
      ctx.beginPath();
      ctx.arc(playheadX, midY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Playhead glow
      ctx.shadowColor = "#ff58ae";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(playheadX, midY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Current time label at playhead
    if (duration > 0 && playheadX > 30 && playheadX < width - 30) {
      ctx.fillStyle = "#ff58ae";
      ctx.font = "bold 10px Geist, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(formatTime(currentTime), playheadX, 12);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [currentTime, duration, isLiveStream, error, loading]);

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

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLiveStream || !duration || !peaksRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    onSeek(progress * duration);
  };

  return (
    <div className="waveform-container">
      <div className="section-label" style={{ margin: 0, marginBottom: "6px" }}>Waveform — click to seek</div>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: "100%",
          height: "90px",
          display: "block",
          cursor: isLiveStream ? "default" : "pointer",
          borderRadius: "var(--r-sm)",
          background: "rgba(255,255,255,0.02)",
        }}
      />
    </div>
  );
}
