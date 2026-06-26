"use client";

import { useEffect, useState, memo } from "react";

function dbFromFloat(v: number) {
  return 20 * Math.log10(Math.max(1e-10, v));
}

function computeMetrics(analyser: AnalyserNode | null, isPlaying: boolean) {
  if (!analyser || !isPlaying) {
    return {
      lufs: "—",
      peak: "—",
      truePeak: "—",
      crest: "—",
      dynamicRange: "—",
      rms: "—",
      correlation: "—",
    };
  }

  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);

  let sum = 0;
  let peak = 0;
  let truePeak = 0;
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const abs = Math.abs(v);
    sum += abs;
    sumSquares += v * v;
    if (abs > peak) peak = abs;
    // Simple inter-sample peak approximation (max of abs sample and abs midpoint)
    if (i > 0) {
      const mid = (v + data[i - 1]) / 2;
      const midAbs = Math.abs(mid);
      if (midAbs > truePeak) truePeak = midAbs;
    }
    if (abs > truePeak) truePeak = abs;
  }

  const rms = Math.sqrt(sumSquares / data.length);
  const avg = sum / data.length;
  const peakDb = dbFromFloat(peak);
  const truePeakDb = dbFromFloat(truePeak);
  const rmsDb = dbFromFloat(rms);

  // Very rough LUFS approximation: apply ~-1.1 dB offset to RMS (simplified K-weighting)
  const lufsDb = rmsDb - 1.1;
  const crest = peakDb - rmsDb;
  const dynamicRange = peakDb - avg > 0 ? peakDb - dbFromFloat(avg) : 0;

  // Correlation approximation (mono vs stereo) — only meaningful if analyser is stereo
  let correlation = 0;
  if (data.length >= 2) {
    let sumL = 0, sumR = 0, sumLR = 0, sumL2 = 0, sumR2 = 0;
    const count = Math.floor(data.length / 2) * 2;
    for (let i = 0; i < count; i += 2) {
      const l = data[i];
      const r = data[i + 1];
      sumL += l;
      sumR += r;
      sumLR += l * r;
      sumL2 += l * l;
      sumR2 += r * r;
    }
    const n = count / 2;
    const meanL = sumL / n;
    const meanR = sumR / n;
    const num = sumLR - n * meanL * meanR;
    const den = Math.sqrt((sumL2 - n * meanL * meanL) * (sumR2 - n * meanR * meanR));
    correlation = den > 0 ? num / den : 0;
  }

  return {
    lufs: lufsDb.toFixed(1),
    peak: peakDb.toFixed(1),
    truePeak: truePeakDb.toFixed(1),
    crest: crest > 0 ? crest.toFixed(1) : "0.0",
    dynamicRange: dynamicRange > 0 ? dynamicRange.toFixed(1) : "0.0",
    rms: rmsDb.toFixed(1),
    correlation: correlation.toFixed(2),
  };
}

type Props = {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  bpm?: number | null;
  musicalKey?: string | null;
};

function SCADAMetricsBar({ analyser, isPlaying, bpm, musicalKey }: Props) {
  const [metrics, setMetrics] = useState(() => computeMetrics(analyser, isPlaying));

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setMetrics(computeMetrics(analyser, isPlaying));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [analyser, isPlaying]);

  const tiles = [
    { label: "LUFS", value: metrics.lufs, unit: "LU" },
    { label: "True Peak", value: metrics.truePeak, unit: "dBTP" },
    { label: "RMS", value: metrics.rms, unit: "dB" },
    { label: "Crest", value: metrics.crest, unit: "dB" },
    { label: "Dynamic Range", value: metrics.dynamicRange, unit: "dB" },
    { label: "Correlation", value: metrics.correlation, unit: "" },
    { label: "BPM", value: bpm ? Math.round(bpm).toString() : "—", unit: "" },
    { label: "Key", value: musicalKey || "—", unit: "" },
  ];

  return (
    <div className="scada-metrics-bar">
      {tiles.map((t) => (
        <div key={t.label} className="scada-tile">
          <div className="scada-tile-label">{t.label}</div>
          <div className="scada-tile-value">
            {t.value}
            {t.unit && <span className="scada-tile-unit">{t.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(SCADAMetricsBar);
