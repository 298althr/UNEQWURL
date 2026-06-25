"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Play, SlidersHorizontal, Music, Radio, Mic, Cloud, ArrowRight, Headphones, Sparkles, Gauge } from "lucide-react";
import { APP_NAME, APP_TAGLINE, CATEGORIES } from "@/lib/brand";

const AudioScene = dynamic(() => import("@/components/landing/AudioScene"), {
  ssr: false,
  loading: () => <div className="landing-scene-fallback" />,
});

/* ─── Types ─── */
type AuthState = { authenticated: boolean; user?: { username: string } } | null;

const FEATURES = [
  {
    icon: <SlidersHorizontal size={22} />,
    title: "Live EQ Console",
    desc: "Shape your sound in real time with a full parametric EQ and gain staging.",
  },
  {
    icon: <Gauge size={22} />,
    title: "Benchmark Scoring",
    desc: "Submit your mix and get an instant score against pro-engineered targets.",
  },
  {
    icon: <Headphones size={22} />,
    title: "A/B Reference",
    desc: "Toggle between your mix and the mastered reference to train your ear.",
  },
  {
    icon: <Sparkles size={22} />,
    title: "YouTube Streaming",
    desc: "Stream any track directly from YouTube into the console for practice.",
  },
];

/* ─── Main Page ─── */
export default function LandingPage() {
  const [auth, setAuth] = useState<AuthState>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAuth(data ? { authenticated: true, user: data } : { authenticated: false }))
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  const isLoggedIn = auth?.authenticated ?? false;

  return (
    <div className="landing-page" data-theme="dark">
      {/* ─── Header ─── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link href="/" className="landing-header-logo">
            <img
              src="/assets/logo/footer-logo-allpages.png"
              alt={APP_NAME}
              className="landing-header-logo-img"
            />
          </Link>
          <nav className="landing-header-nav" />
        </div>
      </header>

      {/* ─── 3D Hero ─── */}
      <section className="landing-hero">
        <AudioScene />

        {/* Desktop overlay */}
        <div className="landing-hero-overlay">
          <div className="landing-hero-content">
            <div className="landing-badge">{APP_TAGLINE}</div>
            <h1 className="landing-title">
              Hear What{" "}
              <span className="landing-gradient">Better Audio</span>{" "}
              Sounds Like
            </h1>
            <p className="landing-desc">
              {APP_NAME} is a hands-on EQ training console. Pick a track, shape the
              mix, and score your ear against pro benchmarks.
            </p>
            <div className="landing-cta-row">
              <Link href="/console" className="landing-btn landing-btn-primary">
                <SlidersHorizontal size={18} />
                Console
              </Link>
              <Link href="/sound-quality-101" className="landing-btn landing-btn-ghost">
                Sound Quality 101
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Album Art Showcase ─── */}
      <section className="landing-section landing-albums">
        <div className="landing-section-header">
          <span className="landing-section-label">Catalog</span>
          <h2 className="landing-section-title">Explore the Library</h2>
          <p className="landing-section-desc">
            Music, podcasts, live recordings, and streams — all ready for your mix.
          </p>
        </div>
        <div className="landing-album-grid">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="landing-album-card" style={{ "--album-accent": cat.colorValue } as React.CSSProperties}>
              <div
                className="landing-album-cover"
                style={{ backgroundImage: `url(${cat.photo})` }}
              />
              <div className="landing-album-info">
                <div className="landing-album-icon" style={{ color: cat.colorValue }}>
                  {cat.id === "music" && <Music size={16} />}
                  {cat.id === "podcast" && <Radio size={16} />}
                  {cat.id === "live" && <Mic size={16} />}
                  {cat.id === "stream" && <Cloud size={16} />}
                </div>
                <h3>{cat.label}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="landing-section landing-features">
        <div className="landing-section-header">
          <span className="landing-section-label">Features</span>
          <h2 className="landing-section-title">What You Can Do</h2>
        </div>
        <div className="landing-feature-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Console CTA ─── */}
      <section className="landing-section landing-console-cta">
        <div className="landing-console-box">
          <div className="landing-console-visual">
            <div className="landing-eq-bars">
              {Array.from({ length: 7 }, (_, i) => (
                <span
                  key={i}
                  className="landing-eq-bar"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          </div>
          <div className="landing-console-text">
            <h2>Ready to Mix?</h2>
            <p>
              Jump into the console, pick a track from any category, and start
              training your ear.
            </p>
            <div className="landing-cta-row">
              {isLoggedIn ? (
                <Link href="/dashboard" className="landing-btn landing-btn-primary">
                  <SlidersHorizontal size={18} />
                  Enter Console
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link href="/login" className="landing-btn landing-btn-primary">
                  <Play size={18} />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <div className="landing-footer-mark">
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className="landing-footer-name">{APP_NAME}</span>
        </div>
        <p className="landing-footer-copy">Tune the mix. Match the benchmark.</p>
      </footer>
    </div>
  );
}

