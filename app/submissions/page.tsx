"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Award, Calendar, ChevronRight, Music } from "lucide-react";
import DesktopNav from "@/components/DesktopNav";
import ProfileDropdown from "@/components/ProfileDropdown";
import BottomNav from "@/components/BottomNav";
import { APP_NAME } from "@/lib/brand";
import PageLogo from "@/components/PageLogo";

interface Submission {
  id: string;
  audio_title: string;
  audio_artist: string | null;
  settings: { low: number; mid: number; high: number; gain: number; eq298: number };
  score: number | null;
  score_breakdown: Record<string, { diff: number; weighted: number }> | null;
  submitted_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function scoreColor(score: number): string {
  if (score >= 71) return "#22c55e";
  if (score >= 41) return "#eab308";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Expert";
  if (score >= 71) return "Good";
  if (score >= 41) return "Developing";
  return "Needs Work";
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((data) => setSubmissions(Array.isArray(data) ? data : []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  const bestScore = submissions.reduce((best, s) => {
    if (s.score !== null && (best === null || s.score > best)) return s.score;
    return best;
  }, null as number | null);

  const avgScore = submissions.length > 0 && submissions.some((s) => s.score !== null)
    ? Math.round(
        submissions.filter((s) => s.score !== null).reduce((sum, s) => sum + (s.score ?? 0), 0) /
        submissions.filter((s) => s.score !== null).length
      )
    : null;

  return (
    <div className="container mx-auto min-h-screen submissions-page-orange" style={{ maxWidth: 900 }}>
      {/* Header — logo | nav | profile all on one row on desktop */}
      <header className="header header-with-profile header-desktop-row">
        <PageLogo page="submissions" />
        <div className="header-desktop-nav">
          <DesktopNav />
        </div>
        <ProfileDropdown />
      </header>

      <main className="pb-32" style={{ padding: "24px 20px" }}>
        {/* Hero */}
        <section className="hero relative overflow-hidden rounded-2xl mb-8">
          <div className="page-hero-bg absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: "url('/assets/hero/results.png')" }} />
          <div className="page-hero-overlay absolute inset-0 pointer-events-none z-[1]" />
          <div className="relative z-[2] p-10 md:p-14">
            <div className="hero-badge">Submissions</div>
            <h1>My <span className="gradient-text">Submissions</span></h1>
            <p>Track your EQ scores across sessions, review your best mixes, and monitor your progress.</p>
          </div>
        </section>

        {/* Stats summary */}
        {submissions.length > 0 && (
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
            <div className="stat-card">
              <span className="stat-card-label">Total</span>
              <span className="stat-card-value">{submissions.length}</span>
            </div>
            {bestScore !== null && (
              <div className="stat-card">
                <span className="stat-card-label">Best Score</span>
                <span className="stat-card-value" style={{ color: scoreColor(bestScore) }}>
                  {Math.round(bestScore)}/100
                </span>
              </div>
            )}
            {avgScore !== null && (
              <div className="stat-card">
                <span className="stat-card-label">Average</span>
                <span className="stat-card-value" style={{ color: scoreColor(avgScore) }}>
                  {avgScore}/100
                </span>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "40px" }}>
            Loading submissions...
          </p>
        )}

        {/* Empty state */}
        {!loading && submissions.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Award size={48} style={{ color: "var(--muted)", opacity: 0.3, marginBottom: "16px" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No submissions yet</h3>
            <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "20px" }}>
              Complete an EQ session and submit your settings to see your scores here.
            </p>
            <Link href="/dashboard" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Music size={14} /> Browse Tracks
            </Link>
          </div>
        )}

        {/* Submission list */}
        {!loading && submissions.length > 0 && (
          <div className="submission-list">
            {submissions.map((sub) => {
              const isExpanded = expanded === sub.id;
              const hasScore = sub.score !== null && sub.score !== undefined;
              const sc = sub.score ?? 0;

              return (
                <div key={sub.id} className="submission-row" onClick={() => setExpanded(isExpanded ? null : sub.id)}>
                  <div className="submission-row-main">
                    <div className="submission-row-info">
                      <div className="submission-row-title">{sub.audio_title}</div>
                      {sub.audio_artist && (
                        <div className="submission-row-artist">{sub.audio_artist}</div>
                      )}
                      <div className="submission-row-date">
                        <Calendar size={10} />
                        {formatDate(sub.submitted_at)}
                      </div>
                    </div>

                    {hasScore ? (
                      <div className="submission-row-score">
                        <div className="submission-score-num" style={{ color: scoreColor(sc) }}>
                          {Math.round(sc)}
                        </div>
                        <div className="submission-score-label" style={{ color: scoreColor(sc) }}>
                          {scoreLabel(sc)}
                        </div>
                      </div>
                    ) : (
                      <div className="submission-row-score">
                        <div className="submission-score-num" style={{ color: "var(--muted)", fontSize: "12px" }}>
                          No score
                        </div>
                      </div>
                    )}

                    <ChevronRight
                      size={16}
                      style={{
                        color: "var(--muted)",
                        transform: isExpanded ? "rotate(90deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </div>

                  {isExpanded && (
                    <div className="submission-row-detail">
                      {/* EQ settings used */}
                      <div className="submission-detail-section">
                        <span className="submission-detail-label">EQ Settings Used</span>
                        <div className="submission-eq-grid">
                          {(["low", "mid", "high", "gain", "eq298"] as const).map((band) => (
                            <div key={band} className="submission-eq-cell">
                              <span className="submission-eq-band">{band === "eq298" ? "298" : band}</span>
                              <span className="submission-eq-val">
                                {sub.settings[band] > 0 ? "+" : ""}{sub.settings[band]} dB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Score breakdown */}
                      {hasScore && sub.score_breakdown && (
                        <div className="submission-detail-section">
                          <span className="submission-detail-label">Score Breakdown</span>
                          <div className="submission-breakdown">
                            {Object.entries(sub.score_breakdown).map(([band, info]) => (
                              <div key={band} className="submission-breakdown-row">
                                <span>{band === "eq298" ? "298Hz" : band}</span>
                                <span>diff: {info.diff.toFixed(1)} dB</span>
                                <span>penalty: {info.weighted.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
