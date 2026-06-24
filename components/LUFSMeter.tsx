"use client";

import { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";

type Props = {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  targetLufs?: number;
};

export default function LUFSMeter({ analyser, isPlaying, targetLufs = -14 }: Props) {
  const [lufs, setLufs] = useState<number | null>(null);
  const [peak, setPeak] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser || !isPlaying) {
      setLufs(null);
      setPeak(null);
      return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const tick = () => {
      analyser.getFloatTimeDomainData(dataArray);

      // RMS
      let sumSquares = 0;
      let maxSample = 0;
      for (let i = 0; i < bufferLength; i++) {
        const s = dataArray[i];
        sumSquares += s * s;
        if (Math.abs(s) > maxSample) maxSample = Math.abs(s);
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // Estimate LUFS (simplified: RMS in dB, offset by ~0.691 for K-weighting approximation)
      const lufsEstimate = 20 * Math.log10(rms + 1e-10) - 0.691;
      const peakDb = 20 * Math.log10(maxSample + 1e-10);

      setLufs(lufsEstimate);
      setPeak(peakDb);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying]);

  const lufsDev = lufs !== null ? lufs - targetLufs : 0;
  const lufsColor = lufs === null ? "var(--muted)" : Math.abs(lufsDev) < 1 ? "#22c55e" : Math.abs(lufsDev) < 3 ? "#FFB347" : "#f87171";

  // Meter position: -40 to 0 LUFS mapped to 0-100%
  const meterPct = lufs !== null ? Math.max(0, Math.min(100, ((lufs + 40) / 40) * 100)) : 0;
  const targetPct = ((targetLufs + 40) / 40) * 100;

  return (
    <div className="lufs-meter">
      <div className="lufs-header">
        <Activity size={12} />
        <span>LUFS Meter</span>
      </div>
      <div className="lufs-display">
        <div className="lufs-value" style={{ color: lufsColor }}>
          {lufs !== null ? lufs.toFixed(1) : "--"}
        </div>
        <div className="lufs-unit">LUFS</div>
      </div>
      <div className="lufs-bar-container">
        <div className="lufs-bar-track">
          <div className="lufs-bar-fill" style={{ width: `${meterPct}%`, background: lufsColor }} />
          <div className="lufs-bar-target" style={{ left: `${targetPct}%` }} title={`Target: ${targetLufs} LUFS`} />
        </div>
        <div className="lufs-bar-labels">
          <span>-40</span>
          <span>-23</span>
          <span>-14</span>
          <span>0</span>
        </div>
      </div>
      <div className="lufs-extra">
        <div className="lufs-extra-row">
          <span>Peak</span>
          <span style={{ color: peak !== null && peak > -0.5 ? "#f87171" : "var(--muted)" }}>
            {peak !== null ? `${peak.toFixed(1)}dB` : "--"}
          </span>
        </div>
        <div className="lufs-extra-row">
          <span>Target</span>
          <span style={{ color: "var(--accent)" }}>{targetLufs} LUFS</span>
        </div>
        <div className="lufs-extra-row">
          <span>Dev</span>
          <span style={{ color: lufsColor }}>
            {lufs !== null ? `${lufsDev > 0 ? "+" : ""}${lufsDev.toFixed(1)}dB` : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}
