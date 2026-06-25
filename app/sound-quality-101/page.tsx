"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
  Home,
  Play,
  SlidersHorizontal,
  Volume2,
  Music,
  Mic,
  Cable,
  AlertTriangle,
  Activity,
  BookOpen,
  ArrowDown,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { APP_NAME } from "@/lib/brand";
import "./docs.css";

let mermaidLoadPromise: Promise<void> | null = null;

function loadMermaid() {
  if (mermaidLoadPromise) return mermaidLoadPromise;
  mermaidLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    const w = window as any;
    if (w.mermaid) return resolve();
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Mermaid"));
    document.head.appendChild(script);
  });
  return mermaidLoadPromise;
}

function MermaidChart({ chart, theme }: { chart: string; theme: "light" | "dark" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        await loadMermaid();
        if (cancelled) return;
        const mermaid = (window as any).mermaid;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "strict",
        });
        const id = `sq-mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (!cancelled) setError(true);
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [chart, theme]);

  if (error) {
    return (
      <div className="sq-mermaid">
        <p className="text-sm text-muted">Diagram could not be rendered.</p>
      </div>
    );
  }

  return <div className="sq-mermaid" ref={ref} />;
}

function haptic(ms = 5) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

let html2pdfLoadPromise: Promise<any> | null = null;

function loadHtml2Pdf() {
  if (html2pdfLoadPromise) return html2pdfLoadPromise;
  html2pdfLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    const w = window as any;
    if (w.html2pdf) return resolve(w.html2pdf);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = () => reject(new Error("Failed to load html2pdf"));
    document.head.appendChild(script);
  });
  return html2pdfLoadPromise;
}

const sectionIds = ["what-is-sound-quality", "factors-influencing", "metrics", "how-to-measure", "when-to-measure", "finding-faults"];

export default function SoundQuality101Page() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    const saved = typeof window !== "undefined" ? (localStorage.getItem("298eq-theme") as "light" | "dark" | null) : null;
    const prefersDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : true;
    const initial = saved || (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    if (typeof window !== "undefined") localStorage.setItem("298eq-theme", next);
    haptic(10);
  }, [theme]);

  const downloadPdf = useCallback(async () => {
    try {
      const html2pdf = await loadHtml2Pdf();
      const element = document.getElementById("sq-tutorial-content");
      if (!element) return;
      haptic(10);
      await html2pdf()
        .set({
          margin: 10,
          filename: "sound-quality-101.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();
    } catch {
      window.print();
    }
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, sectionIds.length - 1));
    setCurrentIndex(clamped);
    const el = document.getElementById(sectionIds[clamped]);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      haptic(8);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        scrollToSection(currentIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        scrollToSection(currentIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToSection(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToSection(sectionIds.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, scrollToSection]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = sectionIds.indexOf(entry.target.id);
            if (idx !== -1) setCurrentIndex(idx);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <div className="sq-tutorial">
      <header className="sq-header">
        <div className="sq-header-logo-center">
          <Link href="/" className="sq-header-logo sq-focusable" aria-label="Go home">
            <img
              src="/assets/logo/footer-logo-allpages.png"
              alt={APP_NAME}
              className="sq-header-logo-img"
            />
          </Link>
        </div>
        <div className="sq-header-actions">
          <button
            className="sq-header-btn sq-haptic sq-focusable"
            onClick={downloadPdf}
            aria-label="Download as PDF"
            title="Download as PDF"
          >
            <Download size={18} />
          </button>
          <Link href="/" className="sq-home-btn sq-haptic sq-focusable" aria-label="Go home" title="Go home" onClick={() => haptic(5)}>
            <Home size={18} />
          </Link>
          <button
            className="sq-theme-toggle sq-haptic sq-focusable"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="sq-hero">
          <div className="sq-hero-bg" />
          <div className="sq-hero-grid" />
          <div
            className="sq-hero-orb"
            style={{ width: 420, height: 420, top: "5%", left: "15%", background: "var(--accent)" }}
          />
          <div
            className="sq-hero-orb"
            style={{ width: 320, height: 320, bottom: "15%", right: "10%", background: "#00a6ff", animationDelay: "-6s" }}
          />
          <div
            className="sq-hero-orb"
            style={{ width: 260, height: 260, bottom: "35%", left: "10%", background: "#ff0056", animationDelay: "-12s" }}
          />
          <div className="sq-hero-content">
            <motion.div
              className="sq-hero-badge"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <BookOpen size={14} />
              Sound Management Training
            </motion.div>
            <motion.h1
              className="sq-hero-title"
              initial={{ opacity: 0, y: 40, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              Sound Quality 101
            </motion.h1>
            <motion.p
              className="sq-hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              A practical guide for people moving into sound management
            </motion.p>
            <motion.p
              className="sq-hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              Learn what to measure, how to measure it, and how to fix problems when they show up.
            </motion.p>
            <motion.div
              className="sq-hero-cta-row"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <Link
                href="#what-is-sound-quality"
                className="sq-hero-cta sq-hero-cta-primary sq-haptic sq-focusable"
                onClick={() => haptic(10)}
              >
                <Play size={18} />
                Start Learning
              </Link>
              <Link
                href="/console"
                className="sq-hero-cta sq-hero-cta-console sq-haptic sq-focusable"
                onClick={() => haptic(10)}
              >
                <SlidersHorizontal size={18} />
                Go to Console
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              style={{ marginTop: "2.5rem" }}
            >
              <ArrowDown size={24} className="mx-auto" style={{ color: "var(--muted)", animation: "sq-bounce 2s infinite" }} />
            </motion.div>
          </div>
        </section>

        <div id="sq-tutorial-content" className="sq-section">
          {/* Section 1: What is Sound Quality? */}
          <motion.article
            id="what-is-sound-quality"
            className="sq-lesson-card"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            tabIndex={0}
            aria-label="What is sound quality?"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/console.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Volume2 size={14} />
                  Module 1
                </div>
                <h2 className="sq-lesson-title">What is Sound Quality?</h2>
                <p className="sq-lesson-subtitle">The goal: clear, balanced, safe sound</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <p className="mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                Sound quality is not just about making things loud. Good sound quality means your audience can hear every word, every instrument, and every detail clearly — without pain, distortion, or fatigue.
              </p>
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Four Pillars of Sound Quality</h4>
                  <ul>
                    <li><strong>Clarity:</strong> Can you understand speech and pick out individual instruments?</li>
                    <li><strong>Balance:</strong> Do all the frequencies work together, or is one range overpowering the rest?</li>
                    <li><strong>Consistency:</strong> Does the sound stay good from the front row to the back row?</li>
                    <li><strong>Safety:</strong> Is the volume loud enough to feel exciting, but not loud enough to damage hearing?</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>Your Ears Are Biased</h4>
                  <p>Human ears are most sensitive to the 2–5 kHz range. When you turn the volume down, bass and treble seem to disappear. When you turn it up, the same mix can sound harsh. This means you cannot trust your ears alone.</p>
                  <div className="sq-demo-box">
                    <h5><Play size={14} /> Try This</h5>
                    <p>Play a track at low volume and boost 3–5 kHz. It will suddenly feel much louder, even though the actual volume meter has barely moved.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.article>

          {/* Section 2: What Affects Sound Quality? */}
          <motion.article
            id="factors-influencing"
            className="sq-lesson-card"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="What affects sound quality?"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/dashboard.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Music size={14} />
                  Module 2
                </div>
                <h2 className="sq-lesson-title">What Affects Sound Quality?</h2>
                <p className="sq-lesson-subtitle">The environment, the gear, and the operator</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>The Room</h4>
                  <p>Empty rooms with hard walls echo. People absorb sound. A rehearsal with an empty room will sound muddy; once the audience arrives, the same mix will sound tighter.</p>
                </div>
                <div className="sq-content-block">
                  <h4>Distance</h4>
                  <p>Every time you double the distance from a speaker, the sound drops by about 6 dB. Place speakers for the audience, not for the walls.</p>
                </div>
              </div>
              <div className="sq-grid" style={{ marginTop: "1rem" }}>
                <div className="sq-content-block">
                  <h4>Microphones & Feedback</h4>
                  <p>When a microphone hears its own speaker, you get the loud squeal called feedback. Keep microphones behind the speakers and use high-pass filters on vocals.</p>
                </div>
                <div className="sq-content-block">
                  <h4>Cables & Signal Chain</h4>
                  <p>A broken cable or an unbalanced cable run too long can add hum, hiss, or radio noise. The weakest link in the chain sets the quality ceiling.</p>
                </div>
              </div>
            </div>
          </motion.article>

          {/* Section 3: Metrics That Matter */}
          <motion.article
            id="metrics"
            className="sq-lesson-card"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="Metrics that matter"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/library.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Activity size={14} />
                  Module 3
                </div>
                <h2 className="sq-lesson-title">Metrics That Matter</h2>
                <p className="sq-lesson-subtitle">Numbers that describe what you hear</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-table-responsive">
                <table className="sq-table">
                  <thead>
                    <tr><th>Metric</th><th>What it tells you</th><th>Target</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>STI</strong> (Speech Transmission Index)</td>
                      <td>How easy it is to understand spoken words.</td>
                      <td>≥ 0.6 is good</td>
                    </tr>
                    <tr>
                      <td><strong>C80</strong> (Clarity Index)</td>
                      <td>How clearly instruments and fast notes are separated.</td>
                      <td>Above 0 dB</td>
                    </tr>
                    <tr>
                      <td><strong>SPL</strong> (Sound Pressure Level)</td>
                      <td>How loud the sound is in decibels.</td>
                      <td>Average 82–95 dB for safety</td>
                    </tr>
                    <tr>
                      <td><strong>RT60</strong> (Reverb Time)</td>
                      <td>How long sound takes to fade in a room.</td>
                      <td>Shorter for speech, longer for music</td>
                    </tr>
                    <tr>
                      <td><strong>LUFS</strong> (Loudness Units)</td>
                      <td>Perceived loudness adjusted for human hearing.</td>
                      <td>Target around -14 LUFS for streaming</td>
                    </tr>
                    <tr>
                      <td><strong>Frequency Response</strong></td>
                      <td>Balance of bass, mids, and treble.</td>
                      <td>Smooth, no huge spikes or dips</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="sq-demo-box">
                <h5><Play size={14} /> Try This</h5>
                <p>Open the 298EQ analyzer and play a reference track. Look at the frequency curve. Your goal is to make your live mix follow the same general shape, without big peaks or holes.</p>
              </div>
            </div>
          </motion.article>

          {/* Section 4: How to Measure */}
          <motion.article
            id="how-to-measure"
            className="sq-lesson-card"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="How to measure sound quality"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/profile.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Mic size={14} />
                  Module 4
                </div>
                <h2 className="sq-lesson-title">How to Measure Sound Quality</h2>
                <p className="sq-lesson-subtitle">Use your ears, plus the right tools</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Step 1: Reference Track</h4>
                  <p>Play a song you know well through the PA. It gives you a baseline for how the room should sound. If the reference sounds muddy, the room is muddy. If it sounds harsh, your EQ or speaker placement is wrong.</p>
                </div>
                <div className="sq-content-block">
                  <h4>Step 2: Decibel Meter</h4>
                  <p>Use a handheld SPL meter or a phone app to check volume at the mix position and at the back of the room. Aim for an average of 82–95 dB. Anything above 100 dB for long periods damages hearing.</p>
                </div>
              </div>
              <div className="sq-grid" style={{ marginTop: "1rem" }}>
                <div className="sq-content-block">
                  <h4>Step 3: Real-Time Analyzer</h4>
                  <p>An RTA shows the frequency balance in real time. Look for problem frequencies: too much energy around 200–500 Hz means mud; a sharp spike around 2–5 kHz means harshness.</p>
                </div>
                <div className="sq-content-block">
                  <h4>Step 4: Listen at Show Volume</h4>
                  <p>Always do your final check at the volume the audience will actually hear. A mix that sounds balanced at low volume will often sound thin or harsh at show volume.</p>
                </div>
              </div>
            </div>
          </motion.article>

          {/* Section 5: When to Measure */}
          <motion.article
            id="when-to-measure"
            className="sq-lesson-card"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="When to measure sound quality"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/results.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <AlertTriangle size={14} />
                  Module 5
                </div>
                <h2 className="sq-lesson-title">When to Measure</h2>
                <p className="sq-lesson-subtitle">Timing matters as much as technique</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Before Soundcheck</h4>
                  <p>Power on every speaker, amp, and mixer channel. Play a reference track and walk the room. Fix any dead zones, rattles, or obvious hums before the band arrives.</p>
                </div>
                <div className="sq-content-block">
                  <h4>During Soundcheck</h4>
                  <p>Set gain levels so each channel has a strong, clean signal. Check that the vocal range (1–4 kHz) is clear and that the low end (200–500 Hz) is not muddy.</p>
                </div>
              </div>
              <div className="sq-grid" style={{ marginTop: "1rem" }}>
                <div className="sq-content-block">
                  <h4>Before the Show</h4>
                  <p>Play your reference track one more time. Confirm the master fader has at least 6 dB of headroom. No red lights. Then lock the main settings.</p>
                </div>
                <div className="sq-content-block">
                  <h4>During the Show</h4>
                  <p>Watch the meters and walk the room if possible. Adjust only small changes. If it suddenly sounds bad, mute channels one by one to find the problem.</p>
                </div>
              </div>
            </div>
          </motion.article>

          <div className="sq-divider">Troubleshooting Guide</div>

          {/* Section 6: Finding and Fixing Faults */}
          <motion.article
            id="finding-faults"
            className="sq-lesson-card sq-bonus-card"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="Finding and fixing faults"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/console.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Cable size={14} />
                  Module 6
                </div>
                <h2 className="sq-lesson-title">Finding and Fixing Faults</h2>
                <p className="sq-lesson-subtitle">A calm workflow for when things break</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-quote">
                <strong>Golden Rule:</strong> Never add EQ to fix a problem until you know where the problem started. Test the signal chain in the middle. If the mixer output sounds clean, the problem is after the mixer. If the mixer output sounds bad, the problem is before the mixer.
              </div>

              <h4 style={{ textAlign: "center", margin: "2rem 0 1rem 0" }}>No Sound Flowchart</h4>
              <MermaidChart
                theme={theme}
                chart={`flowchart TD
    A[No Sound?] --> B{Muted?}
    B -- Yes --> C[Unmute the channel]
    B -- No --> D{Signal light on?}
    D -- No --> E{Condenser mic?}
    E -- Yes --> F[Turn on phantom power]
    E -- No --> G[Swap the cable]
    D -- Yes --> H{Master fader up?}
    H -- No --> I[Set fader to 0]
    H -- Yes --> J{Amps on?}
    J -- No --> K[Power on amps]
    J -- Yes --> L[Check speaker cables]`}
              />

              <h4 style={{ marginTop: "2rem" }}>Common Emergencies</h4>

              <div className="sq-tree-root">Problem: Low hum or buzz</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Swap the mic and cable. If the hum stops, the mic or cable is bad.
                <br /><strong>Step 2:</strong> If the hum stays, check power strips and use DI boxes to break ground loops.
              </div>

              <div className="sq-tree-root warning">Problem: Hissing noise</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Mute the channel. If the hiss stops, the gain is too high. Move the mic closer and turn the gain down.
                <br /><strong>Step 2:</strong> If the hiss stays, a compressor or noisy processor is dragging up the background noise.
              </div>

              <div className="sq-tree-root success">Problem: Vocals sound hollow or weak</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Check if two speakers cover the same area.
                <br /><strong>Step 2:</strong> If yes, one cable may be wired backwards, causing phase cancellation. Flip the polarity switch on the mixer or fix the wiring.
              </div>
            </div>
          </motion.article>
        </div>
      </main>

      {/* Floating nav */}
      <nav className="sq-nav" aria-label="Section navigation">
        <button
          className="sq-nav-btn sq-haptic sq-focusable"
          onClick={() => scrollToSection(currentIndex - 1)}
          disabled={currentIndex === 0}
          aria-label="Previous section"
          title="Previous section"
        >
          <ChevronUp size={20} />
        </button>
        <button
          className="sq-nav-btn sq-haptic sq-focusable"
          onClick={() => scrollToSection(currentIndex + 1)}
          disabled={currentIndex === sectionIds.length - 1}
          aria-label="Next section"
          title="Next section"
        >
          <ChevronDown size={20} />
        </button>
      </nav>

      {/* Keyboard hint */}
      <div className="sq-keyboard-hint">
        <kbd>↑</kbd>
        <kbd>↓</kbd>
        <span>to navigate</span>
      </div>
    </div>
  );
}
