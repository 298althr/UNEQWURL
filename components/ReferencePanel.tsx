"use client";

import { useEffect, useState } from "react";
import { Target, RefreshCw } from "lucide-react";

type ReferenceData = {
  detected_genre: string;
  genre_confidence: number;
  reference_track_title?: string;
  reference_comparison?: {
    reference: { title: string; genre: string };
    deviations: { low: number; eq298: number; high: number; lufs: number };
    corrections: { low: number; eq298: number; high: number; gain: number };
    matchScore: number;
  };
  quality_score_studio: number;
  benchmarks?: {
    studio: { notes: string[] };
  };
};

type Props = {
  songId: string;
  onApplyCorrections?: (corrections: { low: number; eq298: number; high: number; gain: number }) => void;
};

export default function ReferencePanel({ songId, onApplyCorrections }: Props) {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/songs/${songId}/benchmark`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No benchmark data");
        return res.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [songId]);

  if (loading) {
    return (
      <div className="reference-panel">
        <div className="reference-panel-header">
          <Target size={12} />
          <span>Reference Match</span>
        </div>
        <div className="reference-loading">Loading reference data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="reference-panel">
        <div className="reference-panel-header">
          <Target size={12} />
          <span>Reference Match</span>
        </div>
        <div className="reference-empty">No reference data available yet.</div>
      </div>
    );
  }

  const ref = data.reference_comparison;
  const matchScore = ref?.matchScore ?? data.quality_score_studio ?? 0;
  const scoreColor = matchScore >= 80 ? "#22c55e" : matchScore >= 60 ? "#FFB347" : "#f87171";
  const scoreLabel = matchScore >= 80 ? "Excellent" : matchScore >= 60 ? "Good" : matchScore >= 40 ? "Needs Work" : "Poor";

  return (
    <div className="reference-panel">
      <div className="reference-panel-header">
        <Target size={12} />
        <span>Mix Match Score</span>
      </div>

      {/* Score Display */}
      <div className="reference-score-display">
        <div className="reference-score-ring">
          <svg viewBox="0 0 100 100" className="reference-score-svg">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(matchScore / 100) * 264} 264`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="reference-score-center" style={{ color: scoreColor }}>
            <span className="reference-score-number">{matchScore}</span>
            <span className="reference-score-max">/100</span>
          </div>
        </div>
        <div className="reference-score-info">
          <div className="reference-score-label" style={{ color: scoreColor }}>{scoreLabel}</div>
          <div className="reference-genre">{data.detected_genre} ({(data.genre_confidence * 100).toFixed(0)}%)</div>
          {ref && (
            <div className="reference-track-name">vs &ldquo;{ref.reference.title}&rdquo;</div>
          )}
        </div>
      </div>

      {/* Deviations */}
      {ref && (
        <div className="reference-deviations">
          <div className="reference-dev-header">Frequency Deviations vs Reference</div>
          <div className="reference-dev-bars">
            {[
              { label: "Low", dev: ref.deviations.low, target: 0 },
              { label: "298Hz", dev: ref.deviations.eq298, target: 0 },
              { label: "High", dev: ref.deviations.high, target: 0 },
              { label: "LUFS", dev: ref.deviations.lufs, target: 0 },
            ].map((item) => {
              const maxDev = 10;
              const pct = Math.min(Math.abs(item.dev) / maxDev, 1) * 50;
              const isPositive = item.dev > 0;
              return (
                <div key={item.label} className="reference-dev-bar">
                  <span className="reference-dev-label">{item.label}</span>
                  <div className="reference-dev-track">
                    <div className="reference-dev-center" />
                    <div
                      className="reference-dev-fill"
                      style={{
                        width: `${pct}%`,
                        marginLeft: isPositive ? "50%" : `${50 - pct}%`,
                        background: isPositive ? "#f87171" : "#FFB347",
                      }}
                    />
                  </div>
                  <span className="reference-dev-value" style={{ color: Math.abs(item.dev) < 2 ? "#22c55e" : isPositive ? "#f87171" : "#FFB347" }}>
                    {item.dev > 0 ? "+" : ""}{item.dev.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="reference-dev-legend">
            <span><span className="legend-dot" style={{ background: "#f87171" }} /> Too much</span>
            <span><span className="legend-dot" style={{ background: "#FFB347" }} /> Too little</span>
            <span><span className="legend-dot" style={{ background: "#22c55e" }} /> Matched</span>
          </div>
        </div>
      )}

      {/* Apply Corrections */}
      {ref && onApplyCorrections && (
        <button
          type="button"
          onClick={() => onApplyCorrections(ref.corrections)}
          className="btn btn-secondary reference-apply-btn"
        >
          <RefreshCw size={12} />
          Apply Reference Corrections
        </button>
      )}

      {/* Notes */}
      {data.benchmarks?.studio?.notes && (
        <div className="reference-notes">
          {data.benchmarks.studio.notes.slice(0, 4).map((note, i) => (
            <div key={i} className="reference-note-item">{note}</div>
          ))}
        </div>
      )}
    </div>
  );
}
