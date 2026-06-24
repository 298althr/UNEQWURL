"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Send, Trophy, Loader2 } from "lucide-react";
import { computeFreqResponse, type FreqPoint } from "@/lib/freq-response";
import type { EQSettings, SoundClass, AdvancedFXConfig } from "@/lib/types";
import { MACRO_LABELS } from "@/lib/effects/MacroController";

const BAND_COLORS: Record<keyof EQSettings, string> = {
  low: "#22c55e",
  mid: "#3b82f6",
  high: "#f59e0b",
  gain: "#a855f7",
  eq298: "#D080A8",
};

const BAND_LABELS: Record<keyof EQSettings, string> = {
  low: "Low",
  mid: "Mid",
  high: "High",
  gain: "Gain",
  eq298: "298EQ",
};

interface Props {
  songTitle: string;
  songArtist: string | null;
  sessionDate: string;
  sessionDuration: string;
  settings: EQSettings;
  advancedFX: AdvancedFXConfig;
  uploadType: SoundClass;
  avg298eq: number;
  consoleToggles: number;
  songId: string;
}

function FreqResponseGraph({ points }: { points: FreqPoint[] }) {
  const width = 600;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  const minDb = -18;
  const maxDb = 18;

  const xForFreq = (f: number) =>
    padding.left + ((Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) * graphW;

  const yForDb = (db: number) =>
    padding.top + graphH - ((db - minDb) / (maxDb - minDb)) * graphH;

  // Guard against empty points to prevent "Cannot read properties of undefined (reading 'freq')"
  const hasPoints = points.length > 0;
  const pathD = hasPoints
    ? points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${xForFreq(p.freq)} ${yForDb(p.db)}`)
        .join(" ")
    : "";

  const zeroY = yForDb(0);

  // Grid lines at 0 dB
  const gridLines = [-12, -6, 0, 6, 12];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ background: "transparent" }}>
      {/* Grid lines */}
      {gridLines.map((db) => (
        <line
          key={db}
          x1={padding.left}
          y1={yForDb(db)}
          x2={width - padding.right}
          y2={yForDb(db)}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray={db === 0 ? "none" : "4 4"}
        />
      ))}
      {/* 0 dB label */}
      <text x={padding.left - 5} y={zeroY + 3} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="end">
        0dB
      </text>
      {/* Freq labels */}
      {[100, 1000, 10000].map((f) => (
        <text
          key={f}
          x={xForFreq(f)}
          y={height - 5}
          fill="rgba(255,255,255,0.4)"
          fontSize="9"
          textAnchor="middle"
        >
          {f >= 1000 ? `${f / 1000}k` : f}Hz
        </text>
      ))}
      {hasPoints && (
        <>
          {/* Response curve */}
          <path d={pathD} fill="none" stroke="#D080A8" strokeWidth="2" opacity="0.9" />
          {/* Glow shadow */}
          <path d={pathD} fill="none" stroke="#D080A8" strokeWidth="6" opacity="0.15" />
          {/* Area fill */}
          <path
            d={`${pathD} L ${xForFreq(points[points.length - 1].freq)} ${zeroY} L ${xForFreq(points[0].freq)} ${zeroY} Z`}
            fill="rgba(184, 160, 176, 0.08)"
          />
        </>
      )}
    </svg>
  );
}

export default function SessionResults({
  songTitle,
  songArtist,
  sessionDate,
  sessionDuration,
  settings,
  advancedFX,
  uploadType,
  avg298eq,
  consoleToggles,
  songId,
}: Props) {
  const [freqPoints, setFreqPoints] = useState<FreqPoint[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFreqPoints(computeFreqResponse(settings, 200));
  }, [settings]);

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSubmissions(data);
      })
      .catch(() => {});
  }, []);

  const handleDownloadPNG = useCallback(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 900;
    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, W, H);

    // Accent border top
    ctx.fillStyle = "#D080A8";
    ctx.fillRect(40, 0, W - 80, 3);

    // Title
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px Geist, sans-serif";
    ctx.fillText(songTitle, 40, 55);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 14px Geist, sans-serif";
    ctx.fillText(`${songArtist ?? "Unknown Artist"} · ${sessionDate} · ${sessionDuration} session`, 40, 80);

    // Section: Final EQ Settings
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "700 11px Geist, sans-serif";
    ctx.fillText("FINAL EQ SETTINGS", 40, 115);

    const barY = 140;
    const barH = 6;
    const barW = 280;
    const rowH = 36;

    (Object.keys(BAND_LABELS) as Array<keyof EQSettings>).forEach((key, i) => {
      const y = barY + i * rowH;
      const val = settings[key];
      const pct = ((val + 12) / 24) * 100;

      // Label
      ctx.fillStyle = BAND_COLORS[key];
      ctx.font = "600 13px Geist, sans-serif";
      ctx.fillText(BAND_LABELS[key], 40, y + 14);

      // Track
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect(100, y, barW, barH, 3);
      ctx.fill();

      // Fill
      ctx.fillStyle = BAND_COLORS[key];
      ctx.beginPath();
      ctx.roundRect(100, y, (barW * pct) / 100, barH, 3);
      ctx.fill();

      // Value
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 13px Geist, sans-serif";
      ctx.fillText(`${val >= 0 ? "+" : ""}${val.toFixed(1)}dB`, 100 + barW + 12, y + 14);
    });

    // Section: Frequency Response
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "700 11px Geist, sans-serif";
    ctx.fillText("FREQUENCY RESPONSE", 40, 340);

    // Draw freq response on canvas
    const graphX = 40;
    const graphY = 360;
    const graphW = 720;
    const graphH = 160;
    const minDb = -18;
    const maxDb = 18;

    const xForFreq = (f: number) =>
      graphX + ((Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) * graphW;
    const yForDb = (db: number) =>
      graphY + graphH - ((db - minDb) / (maxDb - minDb)) * graphH;

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    [-12, -6, 0, 6, 12].forEach((db) => {
      const y = yForDb(db);
      ctx.beginPath();
      ctx.moveTo(graphX, y);
      ctx.lineTo(graphX + graphW, y);
      ctx.stroke();
    });

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(graphX, yForDb(0));
    ctx.lineTo(graphX + graphW, yForDb(0));
    ctx.stroke();

    // Curve
    if (freqPoints.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = "#D080A8";
      ctx.lineWidth = 2.5;
      freqPoints.forEach((p, i) => {
        const x = xForFreq(p.freq);
        const y = yForDb(p.db);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Glow
      ctx.beginPath();
      ctx.strokeStyle = "rgba(208, 128, 168, 0.25)";
      ctx.lineWidth = 8;
      freqPoints.forEach((p, i) => {
        const x = xForFreq(p.freq);
        const y = yForDb(p.db);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Freq labels
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "500 10px Geist, sans-serif";
    [100, 1000, 10000].forEach((f) => {
      const x = xForFreq(f);
      ctx.fillText(f >= 1000 ? `${f / 1000}kHz` : `${f}Hz`, x - 12, graphY + graphH + 18);
    });

    // Section: Stats
    const statsY = 560;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "700 11px Geist, sans-serif";
    ctx.fillText("SESSION STATS", 40, statsY);

    const stats = [
      { label: "AVG 298EQ", value: `${avg298eq >= 0 ? "+" : ""}${avg298eq.toFixed(1)}dB`, color: "#D080A8" },
      { label: "MACRO FX", value: `${advancedFX.macroValue}% ${MACRO_LABELS[uploadType]}`, color: "#3b82f6" },
      { label: "CONSOLE TOGGLES", value: `${consoleToggles}`, color: "#a855f7" },
    ];

    stats.forEach((s, i) => {
      const y = statsY + 30 + i * 40;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "600 11px Geist, sans-serif";
      ctx.fillText(s.label, 40, y);
      ctx.fillStyle = s.color;
      ctx.font = "bold 20px Geist, sans-serif";
      ctx.fillText(s.value, 40, y + 24);
    });

    // Section: Advanced FX Results
    const fxY = statsY + 170;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "700 11px Geist, sans-serif";
    ctx.fillText("ADVANCED FX RESULTS", 40, fxY);

    const fxItems = [
      { label: "Macro", value: `${advancedFX.macroValue}% ${MACRO_LABELS[uploadType]}`, color: "#fff" },
      { label: "Sound Class", value: uploadType.charAt(0).toUpperCase() + uploadType.slice(1), color: "#fff" },
      { label: "FX Status", value: advancedFX.enabled ? "Enabled" : "Disabled", color: advancedFX.enabled ? "#22c55e" : "#f87171" },
      ...Object.entries(advancedFX.intensities).map(([key, val]) => ({
        label: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        value: `${val}%`,
        color: "#fff",
      })),
    ];

    fxItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 40 + col * 370;
      const y = fxY + 22 + row * 44;
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.roundRect(x, y - 14, 350, 38, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "600 10px Geist, sans-serif";
      ctx.fillText(item.label.toUpperCase(), x + 12, y + 2);
      ctx.fillStyle = item.color;
      ctx.font = "bold 14px Geist, sans-serif";
      ctx.fillText(item.value, x + 12, y + 18);
    });

    // Footer branding
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "700 12px Geist, sans-serif";
    ctx.fillText("298EQ · Audio Enhancement Studio", 40, H - 30);

    // Download
    const link = document.createElement("a");
    link.download = `298EQ_${songTitle.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [songTitle, songArtist, sessionDate, sessionDuration, settings, avg298eq, advancedFX.macroValue, advancedFX.enabled, advancedFX.intensities, uploadType, consoleToggles, freqPoints]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const controlsLog = {
        settings,
        advancedFX: {
          macroValue: advancedFX.macroValue,
          enabled: advancedFX.enabled,
          soundClass: advancedFX.soundClass,
          intensities: advancedFX.intensities,
        },
        consoleToggles,
        avg298eq,
      };
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: songId,
          settings,
          controls_log: controlsLog,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitStatus("Submitted successfully!");
        // Refresh submissions list
        const refreshed = await fetch("/api/submissions").then((r) => r.json());
        if (Array.isArray(refreshed)) setSubmissions(refreshed);
      } else {
        setSubmitStatus(data.error || "Submission failed");
      }
    } catch {
      setSubmitStatus("Network error");
    } finally {
      setSubmitting(false);
    }
  }, [settings, advancedFX, consoleToggles, avg298eq, songId]);

  return (
    <div ref={cardRef} className="session-results-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "4px" }}>{songTitle}</h2>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          {sessionDate} · {sessionDuration} session
        </p>
      </div>

      {/* EQ Settings */}
      <div style={{ marginBottom: "28px" }}>
        <div className="section-label" style={{ marginBottom: "16px" }}>Final EQ Settings</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {(Object.keys(BAND_LABELS) as Array<keyof EQSettings>).map((key) => {
            const val = settings[key];
            const pct = ((val + 12) / 24) * 100;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ width: "60px", fontSize: "13px", fontWeight: 600, color: BAND_COLORS[key] }}>
                  {BAND_LABELS[key]}
                </span>
                <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: BAND_COLORS[key],
                      borderRadius: "3px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <span style={{ width: "55px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#fff" }}>
                  {val >= 0 ? "+" : ""}{val.toFixed(1)}dB
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Frequency Response */}
      <div style={{ marginBottom: "28px" }}>
        <div className="section-label" style={{ marginBottom: "12px" }}>Frequency Response</div>
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <FreqResponseGraph points={freqPoints} />
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
            Avg 298EQ
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#D080A8" }}>
            {avg298eq >= 0 ? "+" : ""}{avg298eq.toFixed(1)}dB
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
            Macro FX
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#3b82f6" }}>
            {advancedFX.macroValue}%
          </div>
          <div style={{ fontSize: "10px", color: "var(--muted)" }}>{MACRO_LABELS[uploadType]}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
            Console Toggles
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#a855f7" }}>
            {consoleToggles}
          </div>
        </div>
      </div>

      {/* Advanced FX Results */}
      <div style={{ marginBottom: "28px" }}>
        <div className="section-label" style={{ marginBottom: "16px" }}>Advanced FX Results</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          {/* Macro */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Macro</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>{advancedFX.macroValue}% {MACRO_LABELS[uploadType]}</div>
          </div>

          {/* Sound Class */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Sound Class</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>{uploadType}</div>
          </div>

          {/* FX Enabled */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>FX Status</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: advancedFX.enabled ? "#22c55e" : "#f87171" }}>{advancedFX.enabled ? "Enabled" : "Disabled"}</div>
          </div>

          {/* Individual Intensities */}
          {Object.entries(advancedFX.intensities).map(([key, val]) => (
            <div key={key} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>{val}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
        <button
          type="button"
          onClick={handleDownloadPNG}
          className="btn btn-secondary"
          style={{ flex: 1, gap: "8px" }}
        >
          <Download size={16} />
          Download PNG
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn btn-primary"
          style={{ flex: 1, gap: "8px", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          {submitting ? "Submitting..." : "Submit Submission"}
        </button>
      </div>

      {submitStatus && (
        <p style={{ textAlign: "center", fontSize: "13px", color: submitStatus.includes("success") ? "#22c55e" : "#f87171", fontWeight: 600, marginBottom: "20px" }}>
          {submitStatus}
        </p>
      )}

      {/* Submissions History */}
      {submissions.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: "12px" }}>
            <Trophy size={12} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Submission History
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {submissions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{sub.audio_title ?? "Unknown"}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                    {new Date(sub.submitted_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {sub.score != null ? (
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#D080A8" }}>{sub.score}%</div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>Pending</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
