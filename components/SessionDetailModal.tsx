"use client";

import { useEffect, useState } from "react";

export type SessionDetail = {
  id: string;
  song_title: string;
  session_start: string;
  session_end: string;
  average_298eq: number;
  final_settings: {
    low: number;
    mid: number;
    high: number;
    gain: number;
    eq298: number;
  };
  ab_toggles: number;
  created_at: string;
};

export default function SessionDetailModal({
  session,
  onClose,
}: {
  session: SessionDetail | null;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (session) {
      const t = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [session]);

  if (!session) return null;

  const duration =
    new Date(session.session_end).getTime() -
    new Date(session.session_start).getTime();
  const mins = Math.floor(duration / 60000);
  const secs = Math.floor((duration % 60000) / 1000);

  const settings = session.final_settings || {};
  const fields: { label: string; key: keyof typeof settings; color: string }[] = [
    { label: "Low", key: "low", color: "#22c55e" },
    { label: "Mid", key: "mid", color: "#3b82f6" },
    { label: "High", key: "high", color: "#f59e0b" },
    { label: "Gain", key: "gain", color: "#8b5cf6" },
    { label: "298EQ", key: "eq298", color: "#ec4899" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
        transition: "background 0.25s ease",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid #222",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "24px",
          transform: visible ? "translateY(0)" : "translateY(16px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              {session.song_title}
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "12px",
                color: "var(--muted)",
              }}
            >
              {new Date(session.created_at).toLocaleString()} · {mins}m {secs}s
              session
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              padding: "4px",
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
            }}
          >
            <span style={{ display: "inline-block", position: "relative", width: "14px", height: "14px" }}>
              <span style={{ position: "absolute", top: "50%", left: "50%", width: "14px", height: "2px", background: "currentColor", transform: "translate(-50%, -50%) rotate(45deg)", borderRadius: "1px" }} />
              <span style={{ position: "absolute", top: "50%", left: "50%", width: "14px", height: "2px", background: "currentColor", transform: "translate(-50%, -50%) rotate(-45deg)", borderRadius: "1px" }} />
            </span>
          </button>
        </div>

        {/* Slider values */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--muted)",
              letterSpacing: "0.08em",
              marginBottom: "12px",
            }}
          >
            Final EQ Settings
          </div>
          {fields.map(({ label, key, color }) => {
            const val = Number(settings[key] ?? 0);
            const pct = ((val + 12) / 24) * 100;
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "6px",
                    background: "#222",
                    borderRadius: "3px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${pct}%`,
                      background: color,
                      borderRadius: "3px",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "48px",
                    textAlign: "right",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#fff",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {val > 0 ? "+" : ""}
                  {val.toFixed(1)}dB
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            paddingTop: "16px",
            borderTop: "1px solid #222",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Avg 298EQ
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                marginTop: "4px",
                color: "#ec4899",
              }}
            >
              {Number(session.average_298eq) > 0 ? "+" : ""}
              {Number(session.average_298eq).toFixed(1)}dB
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              A/B Toggles
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                marginTop: "4px",
                color: "#3b82f6",
              }}
            >
              {Number(session.ab_toggles) || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
