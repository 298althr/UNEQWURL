"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Home,
  Play,
  SlidersHorizontal,
  BookOpen,
  Download,
  Brain,
  List,
  Gauge,
  HeartPulse,
  Thermometer,
  Wrench,
} from "lucide-react";
import { motion } from "framer-motion";
import { APP_NAME } from "@/lib/brand";
import "./docs.css";

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

const sectionIds = [
  "hero",
  "engineer-mindset",
  "fault-categories",
  "reading-meters",
  "sound-health-room",
  "system-drift",
  "fix-last-workflow",
  "glossary",
];

export default function SoundQuality101Page() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
      const element = document.getElementById("sq-slideshow-track");
      if (!element) return;
      haptic(10);
      const originalTransform = element.style.transform;
      const originalTransition = element.style.transition;
      element.style.transform = "translateX(0)";
      element.style.transition = "none";
      await new Promise((resolve) => setTimeout(resolve, 50));
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
      element.style.transform = originalTransform;
      element.style.transition = originalTransition;
    } catch {
      window.print();
    }
  }, []);

  const goToSlide = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, sectionIds.length - 1));
    setCurrentIndex(clamped);
    haptic(8);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goToSlide(currentIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToSlide(currentIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goToSlide(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToSlide(sectionIds.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, goToSlide]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.changedTouches[0].screenX;
      touchStartY.current = e.changedTouches[0].screenY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current == null || touchStartY.current == null) return;
      const endX = e.changedTouches[0].screenX;
      const endY = e.changedTouches[0].screenY;
      const dx = touchStartX.current - endX;
      const dy = touchStartY.current - endY;
      const threshold = 50;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx > 0) goToSlide(currentIndex + 1);
        else goToSlide(currentIndex - 1);
      }
      touchStartX.current = null;
      touchStartY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [currentIndex, goToSlide]);

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

      <main className="sq-slideshow">
        {/* Hero */}
        <div id="sq-slideshow-track" className="sq-slideshow-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          <section id="hero" className="sq-slide sq-slide-hero">
            <div className="sq-hero">
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
              Don't trust your ears. Learn what to measure, how to measure it, and how to find the real cause of bad sound.
            </motion.p>
            <motion.div
              className="sq-hero-cta-row"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <button
                className="sq-hero-cta sq-hero-cta-primary sq-haptic sq-focusable"
                onClick={() => goToSlide(1)}
                style={{ background: "none", border: "none" }}
              >
                <Play size={18} />
                Start Learning
              </button>
              <Link
                href="/console"
                className="sq-hero-cta sq-hero-cta-console sq-haptic sq-focusable"
                onClick={() => haptic(10)}
              >
                <SlidersHorizontal size={18} />
                Go to Console
              </Link>
            </motion.div>
          </div>
        </div>
        </section>

        <section className="sq-slide">
          <div className="sq-slide-scroll">
            <div className="sq-slide-content">
          {/* Module 1: Think Like an Engineer */}
          <motion.article
            id="engineer-mindset"
            className="sq-lesson-card"
            data-accent="purple"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            tabIndex={0}
            aria-label="Think like an engineer"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/console.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Brain size={14} />
                  Module 1
                </div>
                <h2 className="sq-lesson-title">Think Like an Engineer</h2>
                <p className="sq-lesson-subtitle">Don't trust your ears</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <p className="mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                Good sound is not created by turning knobs. Good sound is created by finding the real cause of bad sound.
              </p>
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Why your ears can lie</h4>
                  <ul>
                    <li><strong>They favour the middle:</strong> sounds around 2–5 kHz always feel louder than they really are.</li>
                    <li><strong>They get tired:</strong> after a few minutes of loud sound, your ears stop hearing problems.</li>
                    <li><strong>They get used to bad sound:</strong> a muddy mix can start sounding normal if you listen long enough.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>The engineer's job</h4>
                  <p>First, name what is wrong. Second, find where it started. Third, fix that exact thing. Turning a knob before you know the cause is guessing, and guessing usually makes the sound worse.</p>
                </div>
              </div>
            </div>
          </motion.article>

            </div>
          </div>
        </section>

        <section className="sq-slide">
          <div className="sq-slide-scroll">
            <div className="sq-slide-content">
          {/* Module 2: The 8 Fault Categories */}
          <motion.article
            id="fault-categories"
            className="sq-lesson-card"
            data-accent="pink"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="The 8 fault categories"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/dashboard.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <List size={14} />
                  Module 2
                </div>
                <h2 className="sq-lesson-title">The 8 Fault Categories</h2>
                <p className="sq-lesson-subtitle">Name the cause before you touch a control</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <p className="mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                Every bad sound comes from hardware, software, or both. Hardware is the physical equipment you can touch. Software is the settings, routing, plugins, and firmware that control it. If you can name the category, you know where to look first.
              </p>
              <div className="sq-table-responsive">
                <table className="sq-table">
                  <thead>
                    <tr><th>Category</th><th>What you hear</th><th>Check first</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>Cable</strong></td><td>Hum, crackle, dropouts, missing high end</td><td>Swap the cable</td></tr>
                    <tr><td><strong>Equipment Damage</strong></td><td>Buzz, distortion, one channel dead</td><td>Mic, speaker, or mixer channel</td></tr>
                    <tr><td><strong>Room Acoustics</strong></td><td>Mud, echo, harshness</td><td>Room size, crowd, soft surfaces</td></tr>
                    <tr><td><strong>Speaker Position</strong></td><td>Feedback, dead zones, uneven coverage</td><td>Where the speakers are aimed</td></tr>
                    <tr><td><strong>Sound Health</strong></td><td>Imbalance, clipping, noise, distortion</td><td>The meters</td></tr>
                    <tr><td><strong>System Drift</strong></td><td>Slowly worsening balance or level</td><td>Temperature, audience, battery, mic position</td></tr>
                    <tr><td><strong>Amplifier</strong></td><td>Distortion, low power, shut-off</td><td>Power, gain, heat, protection light</td></tr>
                    <tr><td><strong>Output</strong></td><td>Missing speaker, wrong sound, mono</td><td>Routing, mute, crossover, speaker selection</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="sq-grid" style={{ marginTop: "1rem" }}>
                <div className="sq-content-block">
                  <h4>Hardware factors</h4>
                  <ul>
                    <li><strong>Cables:</strong> loose, broken, or wrong cables.</li>
                    <li><strong>Mics and speakers:</strong> damage, wear, or wrong model.</li>
                    <li><strong>Amplifiers:</strong> too hot, clipped, or in protection mode.</li>
                    <li><strong>Room and placement:</strong> walls, crowd, speaker position.</li>
                    <li><strong>Power:</strong> ground loops, bad outlets, low voltage.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>Software factors</h4>
                  <ul>
                    <li><strong>Routing:</strong> wrong channel, mute, or output assignment.</li>
                    <li><strong>Plugins:</strong> EQ, compression, or FX causing distortion or delay.</li>
                    <li><strong>Sample rate / buffer:</strong> mismatches cause clicks or pitch shift.</li>
                    <li><strong>Firmware and drivers:</strong> outdated versions can drop out or lag.</li>
                    <li><strong>Settings:</strong> gain, polarity, and crossover saved incorrectly.</li>
                  </ul>
                </div>
              </div>
              <div className="sq-quote">
                <strong>Class line:</strong> Our first job is not to fix the sound. Our first job is to name the category where the problem started.
              </div>
            </div>
          </motion.article>

            </div>
          </div>
        </section>

        <section className="sq-slide">
          <div className="sq-slide-scroll">
            <div className="sq-slide-content">
          {/* Module 3: Reading the Meters */}
          <motion.article
            id="reading-meters"
            className="sq-lesson-card"
            data-accent="blue"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="Reading the meters"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/library.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Gauge size={14} />
                  Module 3
                </div>
                <h2 className="sq-lesson-title">Reading the Meters</h2>
                <p className="sq-lesson-subtitle">Meters correct your ears</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <p className="mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                Meters do not replace listening. They help you hear what your ears missed. Start with these four readings.
              </p>
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Level meters</h4>
                  <ul>
                    <li><strong>True Peak:</strong> the highest point of the waveform. Keep it below 0 dB so the sound does not clip.</li>
                    <li><strong>RMS:</strong> the average energy. Tells you how "full" the mix feels.</li>
                    <li><strong>LUFS:</strong> how loud it sounds to a human. Target around -14 for music and -16 for speech.</li>
                    <li><strong>SPL:</strong> how loud the room is. 82–95 dB is safe; above 100 dB for long periods damages hearing.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>Shape meters</h4>
                  <ul>
                    <li><strong>Crest:</strong> the gap between peak and average. Speech is usually 10–18 dB; heavy compression shrinks it.</li>
                    <li><strong>Dynamic Range:</strong> the gap between loudest and average. 8–14 dB means the mix has life; below 4 dB sounds flat.</li>
                    <li><strong>Correlation:</strong> how similar the left and right channels are. Below 0 means bass will disappear on phones and small speakers.</li>
                  </ul>
                </div>
              </div>
              <div className="sq-grid" style={{ marginTop: "1rem" }}>
                <div className="sq-content-block">
                  <h4>Room meters</h4>
                  <ul>
                    <li><strong>STI:</strong> how easy speech is to understand. Above 0.6 is good.</li>
                    <li><strong>C80:</strong> how clear fast notes and words are. Above 0 dB is good.</li>
                    <li><strong>RT60:</strong> how long the room rings. Shorter for speech, longer for music.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>The real question</h4>
                  <p><strong>"Why does the same mix sound different at low volume?"</strong> Because your ears hear mid and high frequencies differently at low volume. Trust the meter, not the feeling.</p>
                </div>
              </div>
            </div>
          </motion.article>

            </div>
          </div>
        </section>

        <section className="sq-slide">
          <div className="sq-slide-scroll">
            <div className="sq-slide-content">
          {/* Module 4: Sound Health & Room Acoustics */}
          <motion.article
            id="sound-health-room"
            className="sq-lesson-card"
            data-accent="magenta"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="Sound health and room acoustics"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/profile.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <HeartPulse size={14} />
                  Module 4
                </div>
                <h2 className="sq-lesson-title">Sound Health & Room Acoustics</h2>
                <p className="sq-lesson-subtitle">Healthy sound, healthy room</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Five signs of healthy sound</h4>
                  <ul>
                    <li><strong>Balance:</strong> bass, mids, and treble work together.</li>
                    <li><strong>Dynamic range:</strong> quiet and loud parts are both clear.</li>
                    <li><strong>Low noise:</strong> the gaps between notes are clean.</li>
                    <li><strong>No distortion:</strong> the sound is smooth, not fuzzy or square.</li>
                    <li><strong>No clipping:</strong> the level meter never stays at the top.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>Common problems and their ranges</h4>
                  <ul>
                    <li><strong>Mud:</strong> too much 200–500 Hz.</li>
                    <li><strong>Harsh:</strong> too much 2–5 kHz.</li>
                    <li><strong>Boxy:</strong> too much 300–600 Hz.</li>
                    <li><strong>Thin:</strong> not enough low end.</li>
                    <li><strong>Painful brightness:</strong> too much 6–10 kHz.</li>
                  </ul>
                </div>
              </div>
              <div className="sq-grid" style={{ marginTop: "1rem" }}>
                <div className="sq-content-block">
                  <h4>Room acoustics</h4>
                  <p>Empty rooms with hard walls ring and sound muddy. A full room absorbs sound and tightens the bass. Curtains and carpet soften high frequencies. Concrete and glass make the sound bright and harsh.</p>
                </div>
                <div className="sq-content-block">
                  <h4>Speaker position matters</h4>
                  <p>Speakers in corners add extra bass. Speakers too far apart leave a hole in the middle. A microphone in front of a speaker causes feedback. Two speakers covering the same place cause comb filtering.</p>
                </div>
              </div>
              <div className="sq-quote">
                <strong>Key point:</strong> Speaker position and room treatment fix more than EQ ever will.
              </div>
            </div>
          </motion.article>

            </div>
          </div>
        </section>

        <section className="sq-slide">
          <div className="sq-slide-scroll">
            <div className="sq-slide-content">
          {/* Module 5: System Drift & Verification */}
          <motion.article
            id="system-drift"
            className="sq-lesson-card sq-bonus-card"
            data-accent="module6"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="System drift and verification"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/module6.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Thermometer size={14} />
                  Module 5
                </div>
                <h2 className="sq-lesson-title">System Drift & Verification</h2>
                <p className="sq-lesson-subtitle">Systems do not stay the same</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Why sound changes during the day</h4>
                  <ul>
                    <li><strong>Temperature:</strong> amps and speakers warm up and change tone.</li>
                    <li><strong>Ageing:</strong> capacitors, drivers, and batteries wear out.</li>
                    <li><strong>Audience:</strong> people absorb high frequencies and tighten the bass.</li>
                    <li><strong>Battery:</strong> wireless mics and instruments get noisy when power is low.</li>
                    <li><strong>Microphone position:</strong> a singer or instrument moves closer or farther away.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>Verification checklist</h4>
                  <ul>
                    <li>Power on every speaker and amp before soundcheck.</li>
                    <li>Play a reference track at the real show volume.</li>
                    <li>Walk the room and listen for dead zones, rattles, or hum.</li>
                    <li>Check peak, RMS, and LUFS at the mix position and at the back.</li>
                    <li>Keep at least 6 dB of headroom on the master fader.</li>
                    <li>Lock the main settings once they are verified.</li>
                  </ul>
                </div>
              </div>
              <div className="sq-quote">
                <strong>Golden Rule:</strong> Good engineers verify. They do not assume yesterday's settings still work today.
              </div>
            </div>
          </motion.article>

            </div>
          </div>
        </section>

        <section className="sq-slide">
          <div className="sq-slide-scroll">
            <div className="sq-slide-content">
          {/* Module 6: The Fix-Last Workflow */}
          <motion.article
            id="fix-last-workflow"
            className="sq-lesson-card"
            data-accent="navy"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="The fix-last workflow"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/reference.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <Wrench size={14} />
                  Module 6
                </div>
                <h2 className="sq-lesson-title">The Fix-Last Workflow</h2>
                <p className="sq-lesson-subtitle">EQ is the last tool, not the first</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <p className="mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                EQ is not the first tool you reach for. It is the last. First, find the real problem. Then fix it. Only then use EQ to shape the tone.
              </p>

              <div className="sq-flow">
                <div className="sq-flow-node">1. Identify the symptom</div>
                <div className="sq-flow-arrow" />
                <div className="sq-flow-node">2. Name the category</div>
                <div className="sq-flow-arrow" />
                <div className="sq-flow-node warning">3. Test the middle</div>
                <div className="sq-flow-arrow" />
                <div className="sq-flow-node">4. Fix the real cause</div>
                <div className="sq-flow-arrow" />
                <div className="sq-flow-node success">5. Use EQ last</div>
              </div>

              <div className="sq-grid" style={{ marginTop: "1rem" }}>
                <div className="sq-content-block">
                  <h4>The half-split method</h4>
                  <p>Do not check every cable from start to finish. Test the middle of the chain. If the mixer output is clean, the problem is after the mixer. If the mixer output is bad, the problem is before the mixer. One test cuts the search in half.</p>
                </div>
                <div className="sq-content-block">
                  <h4>When you finally reach EQ</h4>
                  <ul>
                    <li>Cut mud around 250 Hz.</li>
                    <li>Boost vocal clarity around 3–5 kHz.</li>
                    <li>Control harshness by cutting 2–4 kHz.</li>
                    <li>Balance bass by looking at the spectrum, not by feeling it.</li>
                    <li>Check the meters, listen again, and recheck.</li>
                  </ul>
                </div>
              </div>

              <h4 style={{ marginTop: "2rem" }}>Live practice with the EQRoom</h4>
              <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
                The EQRoom has a section called <strong>Imperfection / Simulation</strong>. Use it during class to inject real faults like cable noise, room changes, or speaker damage. Students hear the problem, name the category, and decide what to check first. This is where the troubleshooting practical happens.
              </p>
              <p style={{ color: "var(--muted)" }}>
                Once the real problem is fixed, use the live EQ knobs to enhance the sound quality — to shape the tone, not to hide a fault.
              </p>

              <h4 style={{ marginTop: "2rem" }}>Common student problems</h4>
              <div className="sq-tree-root">Problem: Low hum or buzz</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Swap the mic and cable. If the hum stops, the mic or cable is bad.
                <br /><strong>Step 2:</strong> If the hum stays, check power strips and break ground loops.
              </div>
              <div className="sq-tree-root warning">Problem: Hissing noise</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Mute the channel. If the hiss stops, the gain is too high. Move the mic closer and turn the gain down.
                <br /><strong>Step 2:</strong> If the hiss stays, a compressor or noisy processor is lifting the background noise.
              </div>
              <div className="sq-tree-root success">Problem: Vocals sound hollow or weak</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Check if two speakers cover the same area.
                <br /><strong>Step 2:</strong> If yes, one cable may be wired backwards, causing phase cancellation. Flip the polarity or fix the wiring.
              </div>

              <h4 style={{ marginTop: "2rem" }}>Common software problems</h4>
              <div className="sq-tree-root">Problem: No sound from one channel</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Check the channel mute, fader, and output routing.
                <br /><strong>Step 2:</strong> Bypass plugins one by one to see if one is blocking the signal.
              </div>
              <div className="sq-tree-root warning">Problem: Clicks or pops in the audio</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Increase the buffer size in the audio driver.
                <br /><strong>Step 2:</strong> Make sure the sample rate matches across the interface, DAW, and operating system.
              </div>
              <div className="sq-tree-root success">Problem: Delay between sound and video</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Remove or reduce latency-heavy plugins.
                <br /><strong>Step 2:</strong> Check the driver buffer and report latency settings.
              </div>
              <div className="sq-tree-root">Problem: Sound changes after a restart</div>
              <div className="sq-tree-node">
                <strong>Step 1:</strong> Check if a preset, scene, or firmware was reset to default.
                <br /><strong>Step 2:</strong> Compare the saved snapshot against the current settings.
              </div>

              <div className="sq-quote">
                <strong>Final lesson:</strong> Professional engineers do not start by adjusting EQ. They start by finding the true source of the problem. Don't trust your ears. Trust the process.
              </div>
            </div>
          </motion.article>

            </div>
          </div>
        </section>

        <section className="sq-slide">
          <div className="sq-slide-scroll">
            <div className="sq-slide-content">
          {/* Glossary */}
          <motion.article
            id="glossary"
            className="sq-lesson-card"
            data-accent="navy"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            tabIndex={0}
            aria-label="Glossary of terms"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-hero" style={{ backgroundImage: "url(/assets/hero/reference.png)" }}>
              <div className="sq-lesson-hero-content">
                <div className="sq-lesson-number">
                  <BookOpen size={14} />
                  Reference
                </div>
                <h2 className="sq-lesson-title">Glossary</h2>
                <p className="sq-lesson-subtitle">Quick definitions of terms used in this guide</p>
              </div>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-glossary-list">
                <div className="sq-glossary-item">
                  <strong><abbr title="Public Address">PA</abbr></strong>
                  <p>The speakers, amplifiers, and mixer that project sound to the audience.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong><abbr title="Equalizer">EQ</abbr></strong>
                  <p>A tool that boosts or cuts specific frequency ranges to shape the sound.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong><abbr title="Sound Pressure Level">SPL</abbr></strong>
                  <p>How loud the room is, measured in decibels.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong><abbr title="Decibel">dB</abbr></strong>
                  <p>A unit used to measure sound level or signal strength.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong><abbr title="Hertz / kilohertz">Hz / kHz</abbr></strong>
                  <p>Units of frequency. Hz means cycles per second; kHz means thousands of cycles per second.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong><abbr title="Loudness Units relative to Full Scale">LUFS</abbr></strong>
                  <p>A measurement of how loud a mix sounds to human ears.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>True Peak</strong>
                  <p>The highest level of the digital waveform. Keep it below 0 to avoid clipping.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>RMS</strong>
                  <p>The average energy of a signal. Shows how "full" a mix feels.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong><abbr title="Speech Transmission Index">STI</abbr></strong>
                  <p>A score from 0 to 1 that measures how well speech can be understood.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong><abbr title="Clarity">C80</abbr></strong>
                  <p>A measure of how clear fast notes and words are.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong><abbr title="Reverberation Time">RT60</abbr></strong>
                  <p>How long a sound takes to fade away in a room.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Reference Track</strong>
                  <p>A song you know well, played through the PA to compare against your live mix.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Feedback</strong>
                  <p>The loud squeal that happens when a microphone picks up sound from its own speaker.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Clipping</strong>
                  <p>When a signal is too strong and the waveform is cut off, causing distortion.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Phase</strong>
                  <p>The timing between two copies of the same sound. If they are out of time, they can cancel each other.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Half-split Method</strong>
                  <p>Testing the middle of the signal chain to quickly find where a problem starts.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Hum</strong>
                  <p>A low-frequency noise, often caused by ground loops or bad power.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Hiss</strong>
                  <p>A high-frequency noise, often caused by gain that is set too high.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Mud</strong>
                  <p>Too much energy in the 200–500 Hz range, making a mix sound thick and unclear.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Harshness</strong>
                  <p>Sharp, uncomfortable energy around 2–5 kHz.</p>
                </div>
                <div className="sq-glossary-item">
                  <strong>Comb Filtering</strong>
                  <p>When two copies of the same sound arrive at slightly different times, making some frequencies disappear.</p>
                </div>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  </div>
</main>

      {/* Floating nav */}
      <nav className="sq-nav" aria-label="Slide navigation">
        <button
          className="sq-nav-btn sq-haptic sq-focusable"
          onClick={() => goToSlide(currentIndex - 1)}
          disabled={currentIndex === 0}
          aria-label="Previous slide"
          title="Previous slide"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="sq-nav-btn sq-haptic sq-focusable"
          onClick={() => goToSlide(currentIndex + 1)}
          disabled={currentIndex === sectionIds.length - 1}
          aria-label="Next slide"
          title="Next slide"
        >
          <ChevronRight size={20} />
        </button>
      </nav>

      {/* Progress indicator */}
      <div className="sq-progress" aria-label="Slide progress">
        {sectionIds.map((id, idx) => (
          <button
            key={id}
            className={`sq-progress-dot${idx === currentIndex ? " active" : ""}`}
            onClick={() => goToSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            aria-current={idx === currentIndex ? "true" : undefined}
          />
        ))}
      </div>

      {/* Keyboard hint */}
      <div className="sq-keyboard-hint">
        <kbd>←</kbd>
        <kbd>→</kbd>
        <span>to navigate</span>
      </div>
    </div>
  );
}
