"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
  Home,
  Headphones,
  Play,
  Volume2,
  Music,
  Mic,
  Cable,
  AlertTriangle,
  Activity,
  BookOpen,
  Lock,
  ArrowDown,
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

const sectionIds = ["lesson-1", "lesson-2", "lesson-3", "lesson-4", "lesson-5", "lesson-6", "troubleshooting", "instructor"];

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

  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = (y - cy) / 25;
    const ry = (cx - x) / 25;
    card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.015, 1.015, 1.015)`;
  };

  const resetTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "perspective(1200px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
  };

  if (!mounted) return null;

  return (
    <div className="sq-tutorial">
      <header className="sq-header">
        <Link href="/" className="sq-header-logo sq-focusable">
          <Headphones size={20} />
          <span>{APP_NAME}</span>
        </Link>
        <div className="sq-header-actions">
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
            style={{ width: 320, height: 320, bottom: "15%", right: "10%", background: "var(--purple)", animationDelay: "-6s" }}
          />
          <div className="sq-hero-content">
            <motion.div
              className="sq-hero-badge"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <BookOpen size={14} />
              Tutorial
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
              The Real-World Survival Guide to Live Sound
            </motion.p>
            <motion.p
              className="sq-hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              No fluff. No heavy math. Just what actually works when you're behind the mixing board.
            </motion.p>
            <motion.a
              href="#lesson-1"
              className="sq-hero-cta sq-haptic sq-focusable"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              onClick={() => haptic(10)}
            >
              <Play size={18} />
              Start Learning
            </motion.a>
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

        <div className="sq-section">
          {/* Lesson 1 */}
          <article
            id="lesson-1"
            className="sq-lesson-card sq-tilt sq-haptic"
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            tabIndex={0}
            aria-label="Lesson 1: Your ears are liars"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-header">
              <div className="sq-lesson-number">
                <Volume2 size={14} />
                Lesson 1
              </div>
              <h2 className="sq-lesson-title">Your Ears Are Liars</h2>
              <p className="sq-lesson-subtitle">Perception &amp; Volume</p>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>The Volume Trick</h4>
                  <ul>
                    <li><strong>The Hard Truth:</strong> Our ears don't hear bass or treble very well when the music is quiet. But we are incredibly sensitive to the 2–5 kHz range (where vocals and harsh cymbals live).</li>
                    <li><strong>Pro Move:</strong> Never finalize your mix at a quiet whisper. A mix that sounds "perfect" at quiet rehearsal volumes will sound harsh and thin when the venue is packed and loud. Always evaluate your EQ at the actual show volume.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>The Distance Drop-Off</h4>
                  <p>Sound loses energy fast as it travels. Here is the golden rule of speaker placement (the Inverse-Square Law):</p>
                  <div className="sq-table-responsive">
                    <table className="sq-table">
                      <thead>
                        <tr><th>Moving away from the speaker</th><th>What happens to the volume?</th></tr>
                      </thead>
                      <tbody>
                        <tr><td>You step twice as far away</td><td>It drops by −6 dB (noticeably quieter)</td></tr>
                        <tr><td>You step halfway closer</td><td>It jumps up by +6 dB (way louder)</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="sq-demo-box">
                <h5><Play size={14} /> Try It Out (2 mins)</h5>
                <p>Go to the 298EQ frequency sweeper. Boost the 3–5 kHz knob. Notice how the track instantly sounds way louder to your ears, even though the electrical volume meter hasn't moved at all? That's your brain playing tricks on you.</p>
              </div>
            </div>
          </article>

          {/* Lesson 2 */}
          <article
            id="lesson-2"
            className="sq-lesson-card sq-tilt sq-haptic"
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            tabIndex={0}
            aria-label="Lesson 2: Dealing with echoey rooms"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-header">
              <div className="sq-lesson-number">
                <Music size={14} />
                Lesson 2
              </div>
              <h2 className="sq-lesson-title">Dealing with Echoey Rooms</h2>
              <p className="sq-lesson-subtitle">The "Meat-Bag" Effect</p>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Why Soundcheck Always Sounds Bad</h4>
                  <p>An empty room is essentially a giant echo chamber. Sound bounces off concrete and glass, creating a muddy mess. But human bodies act as giant, squishy sound absorbers. When the crowd arrives, they suck up that echo. Your mix will naturally tighten up once the room is full.</p>
                </div>
                <div className="sq-content-block">
                  <h4>What Eats the Most Sound?</h4>
                  <div className="sq-table-responsive">
                    <table className="sq-table">
                      <thead>
                        <tr><th>Stuff in the Room</th><th>Absorption (0 = none, 1 = total)</th></tr>
                      </thead>
                      <tbody>
                        <tr><td>A human being sitting down</td><td>High (0.3–0.6) — Great for absorbing mud!</td></tr>
                        <tr><td>Thick theater curtains</td><td>High (0.5–0.7) — Tames harsh reflections</td></tr>
                        <tr><td>Painted concrete walls</td><td>Terrrible (0.01) — This is why gymnasiums sound awful</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="sq-demo-box">
                <h5><Play size={14} /> Try It Out (3 mins)</h5>
                <p>Want to simulate what happens when the crowd walks in? Take your EQ and pull down 200–500 Hz (the mud), and boost 2–4 kHz (the clarity). That's exactly what an audience does to a room naturally.</p>
              </div>
            </div>
          </article>

          {/* Lesson 3 */}
          <article
            id="lesson-3"
            className="sq-lesson-card sq-tilt sq-haptic"
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            tabIndex={0}
            aria-label="Lesson 3: Stopping feedback and stage bleed"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-header">
              <div className="sq-lesson-number">
                <Mic size={14} />
                Lesson 3
              </div>
              <h2 className="sq-lesson-title">Stopping Feedback &amp; Stage Bleed</h2>
              <p className="sq-lesson-subtitle">Controlling the Mess</p>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Controlling the Mess</h4>
                  <ul>
                    <li><strong>The Problem:</strong> Sound from the main speakers naturally wraps backward and spills onto the stage. Mics pick this up, causing muddy sound and screaming feedback.</li>
                    <li><strong>The Fix:</strong> Point your speakers carefully. Put stage wedges in the "blind spot" (the back) of your microphones. Use high-pass filters (HPF) on vocal mics to cut out low-end stage rumble.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>The Subwoofer Trick</h4>
                  <p>Putting two subwoofers right next to each other gives you a free +3 dB volume boost because they couple together. Spacing them too far apart just creates weird dead zones in the audience.</p>
                </div>
              </div>
              <h4>How Feedback Actually Happens</h4>
              <div className="sq-flow">
                <div className="sq-flow-node">Singer's Mic</div>
                <div className="sq-flow-arrow" />
                <div className="sq-flow-node">Mixer</div>
                <div className="sq-flow-arrow" />
                <div className="sq-flow-node success">Main Speakers</div>
                <div className="sq-flow-arrow" />
                <div className="sq-flow-node warning">Sound spills backward onto stage</div>
                <div className="sq-flow-arrow" />
                <div className="sq-flow-node" style={{ borderColor: "var(--red)", color: "var(--red)" }}>Mic hears the speaker and squeals!</div>
              </div>
              <div className="sq-demo-box">
                <h5><Play size={14} /> Try It Out (5 mins)</h5>
                <p>Put a high-pass filter (HPF) on a vocal track. Next, use a narrow EQ cut between 250–400 Hz. Listen to how all that gross, muddy stage wash just disappears, leaving the voice crystal clear.</p>
              </div>
            </div>
          </article>

          {/* Lesson 4 */}
          <article
            id="lesson-4"
            className="sq-lesson-card sq-tilt sq-haptic"
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            tabIndex={0}
            aria-label="Lesson 4: Making words clear"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-header">
              <div className="sq-lesson-number">
                <Activity size={14} />
                Lesson 4
              </div>
              <h2 className="sq-lesson-title">Can Grandma Hear the Pastor?</h2>
              <p className="sq-lesson-subtitle">Making Words Clear</p>
            </div>
            <div className="sq-lesson-body">
              <p className="mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                Nobody cares how fat the kick drum sounds if they can't understand what the lead singer or speaker is saying. Intelligibility is your #1 job.
              </p>
              <div className="sq-table-responsive">
                <table className="sq-table">
                  <thead>
                    <tr><th>What We Measure</th><th>What It Actually Means</th><th>The Goal</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Speech Clarity (STI)</strong></td>
                      <td>How easy it is to understand spoken words.</td>
                      <td>Score a 0.6 or higher. Anything less sounds like a school teacher.</td>
                    </tr>
                    <tr>
                      <td><strong>Musical Definition (C80)</strong></td>
                      <td>Can you hear the individual instruments, or is it a wall of mush?</td>
                      <td>Keep it above 0 dB so fast notes don't blur together.</td>
                    </tr>
                    <tr>
                      <td><strong>Crowd Safety (SPL)</strong></td>
                      <td>Are you deafening the audience?</td>
                      <td>Keep the average volume between 82–95 dB. Prolonged blasts over 100 dB physically damage hearing. Don't be that guy.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="sq-demo-box">
                <h5><Play size={14} /> Try It Out (4 mins)</h5>
                <p>To make vocals punch through a dense mix without just turning up the volume: Cut the "boxiness" at 200–400 Hz, add some bite at 2–3 kHz, and pull down 5–8 kHz a tiny bit so the "S" sounds don't rip people's ears off.</p>
              </div>
            </div>
          </article>

          {/* Lesson 5 */}
          <article
            id="lesson-5"
            className="sq-lesson-card sq-tilt sq-haptic"
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            tabIndex={0}
            aria-label="Lesson 5: The pre-show checklist"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-header">
              <div className="sq-lesson-number">
                <AlertTriangle size={14} />
                Lesson 5
              </div>
              <h2 className="sq-lesson-title">The "Don't Get Fired" Pre-Show Checklist</h2>
              <p className="sq-lesson-subtitle">Before the band walks on stage</p>
            </div>
            <div className="sq-lesson-body">
              <p className="mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                Before the band even walks on stage, professional engineers do these four things every single time:
              </p>
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>The Checklist</h4>
                  <ul>
                    <li><strong>Leave Breathing Room:</strong> Keep at least 6 dB of headroom on your master fader. No red lights. Red lights mean distortion.</li>
                    <li><strong>Clear the Runway for Vocals:</strong> Ensure the 1–4 kHz range is clear for the singer. Don't let guitars or keyboards step all over it.</li>
                    <li><strong>Tame the Low End:</strong> Keep the 200–500 Hz mud under control. Make sure your subwoofers are in phase (working together, not fighting each other).</li>
                    <li><strong>Play Your Favorite Song:</strong> Play a professionally mixed track you know perfectly before the show starts. Use it to hear how the room is behaving today.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>System Verification Demo (3 mins)</h4>
                  <p>Run a short track through the 298EQ analyzer. Try to make your live mix match the general shape of your reference track. Keep an eye on your meters to make sure you aren't squashing the life out of the music.</p>
                </div>
              </div>
            </div>
          </article>

          {/* Lesson 6 */}
          <article
            id="lesson-6"
            className="sq-lesson-card sq-tilt sq-haptic"
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            tabIndex={0}
            aria-label="Lesson 6: Cables, routing and realistic limits"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-header">
              <div className="sq-lesson-number">
                <Cable size={14} />
                Lesson 6
              </div>
              <h2 className="sq-lesson-title">The Missing Link: Cables, Routing &amp; Realistic Limits</h2>
              <p className="sq-lesson-subtitle">Physical connections matter as much as digital ones</p>
            </div>
            <div className="sq-lesson-body">
              <p className="mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                A $100,000 speaker system sounds like absolute garbage if you plug it in with a broken $5 cable. The physical connections are just as important as the digital ones.
              </p>
              <div className="sq-grid">
                <div className="sq-content-block">
                  <h4>Balanced vs. Unbalanced Cables</h4>
                  <ul>
                    <li><strong>Balanced (XLR, TRS):</strong> These cables have an extra wire inside that flips the signal to cancel out electrical noise. You can run an XLR cable 100 feet across a stage and it will stay perfectly quiet.</li>
                    <li><strong>Unbalanced (TS, RCA):</strong> Common for electric guitars, keyboards, and consumer gear. They act like giant antennas for hum and radio interference. <strong>Never run an unbalanced cable longer than 15-20 feet.</strong> Use a DI (Direct Injection) box to convert them to balanced for long runs.</li>
                  </ul>
                </div>
                <div className="sq-content-block">
                  <h4>Cable Routing: Don't Cross the Streams</h4>
                  <p>Power cables carry massive amounts of electricity that radiate invisible magnetic fields. If you run your delicate microphone cable right next to a thick extension cord, you will get a loud buzzing sound.</p>
                  <div className="sq-quote">
                    <strong>Rule of thumb:</strong> Keep audio cables and power cables separated. If they absolutely have to cross paths on the floor, cross them at a strict 90-degree angle (like a + sign). Never run them parallel to each other.
                  </div>
                </div>
              </div>
              <div className="sq-content-block" style={{ marginTop: "1rem" }}>
                <h4>The Reality Check: Max Attainable Quality</h4>
                <p>You cannot cheat physics. The quality of your mix is capped by the lowest-quality piece of gear in the chain. If you are mixing on a cheap 10-inch portable PA speaker, you will <strong>never</strong> get the earth-shaking sub-bass of an arena rig, no matter how hard you turn the bass knob up. Over-EQing small systems just causes them to distort and blow up.</p>
                <p style={{ color: "var(--gold)", marginTop: "0.5rem" }}><strong>Pro Tip:</strong> Know the limits of the rig you are working on. Mix for clarity and safety first. Do not try to force a small system to do a giant system's job.</p>
              </div>
            </div>
          </article>

          <div className="sq-divider">The Troubleshooting Cheat Sheet</div>

          {/* Troubleshooting */}
          <article
            id="troubleshooting"
            className="sq-lesson-card sq-bonus-card sq-tilt sq-haptic"
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            tabIndex={0}
            aria-label="Bonus: troubleshooting workflow"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-header">
              <div className="sq-lesson-number">
                <AlertTriangle size={14} />
                Bonus Section
              </div>
              <h2 className="sq-lesson-title">The "Oh Crap, Something is Broken" Workflow</h2>
              <p className="sq-lesson-subtitle">A workflow for when things go wrong</p>
            </div>
            <div className="sq-lesson-body">
              <div className="sq-quote">
                <strong>The Golden Rule of Troubleshooting:</strong> Never just slap an EQ on a problem. Follow the cable. Figure out exactly <em>where</em> the sound got messed up. Divide the signal chain in half. Test the mixer output. If it sounds fine there, the problem is your speakers or amps. If it sounds bad there, the problem is your mic or cable.
              </div>
              <h4 style={{ textAlign: "center", margin: "2rem 0 1rem 0" }}>Beginner's "No Sound" Flowchart</h4>
              <MermaidChart
                theme={theme}
                chart={`flowchart TD
    A[No Sound Coming Out?] --> B{Is it Muted?}
    B -- Yes --> C[Unmute it, genius.]
    B -- No --> D{Is the channel getting signal?}
    D -- No lights --> E{Is it a Condenser Mic?}
    E -- Yes --> F[Turn on 48V Phantom Power]
    E -- No --> G[Swap the XLR cable]
    D -- Yes lights are flashing --> H{Is the Master Fader up?}
    H -- No --> I[Push it to 0 / Unity]
    H -- Yes --> J{Are the Amps/Speakers turned on?}
    J -- No --> K[Flip the power switch]
    J -- Yes --> L[Check the speaker cable & outputs]`}
              />

              <h4 style={{ marginTop: "2rem" }}>Common Emergencies &amp; How to Fix Them Fast</h4>
              <div className="sq-tree-root">Emergency: A low, constant buzzing (50/60 Hz Hum)</div>
              <div className="sq-tree-node">
                └── Swap the microphone and the cable.
                <div className="sq-tree-node">
                  ├── <strong>Did it stop?</strong> ➔ You had a bad cable or mic. Throw it in the repair bin.
                  <br />└── <strong>Still humming?</strong> ➔ It's a power issue (ground loop) or an unbalanced cable run too far. Check the power strips feeding your amps and use DI boxes.
                </div>
              </div>
              <div className="sq-tree-root warning">Emergency: Unbearable "Hissing" Noise</div>
              <div className="sq-tree-node">
                └── Hit the MUTE button on the channel.
                <div className="sq-tree-node">
                  ├── <strong>Hiss goes away?</strong> ➔ You have the gain turned up WAY too high. Move the mic closer to the singer and turn the gain down.
                  <br />└── <strong>Hiss stays?</strong> ➔ You probably have a compressor working too hard, dragging the background noise up.
                </div>
              </div>
              <div className="sq-tree-root success">Emergency: Vocals sound hollow, weak, and weird</div>
              <div className="sq-tree-node">
                └── Check your speakers. Are two speakers hitting the same area?
                <div className="sq-tree-node">
                  ├── <strong>Yes?</strong> ➔ One of your cables is wired backward, causing the speakers to cancel each other out (Phase Cancellation). Fix the wiring or flip the polarity switch on your board.
                </div>
              </div>
            </div>
          </article>

          <div className="sq-divider instructor">Instructor Appendix</div>

          {/* Instructor */}
          <article
            id="instructor"
            className="sq-lesson-card sq-instructor-card sq-tilt sq-haptic"
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            tabIndex={0}
            aria-label="Instructor appendix"
          >
            <div className="sq-lesson-glow" />
            <div className="sq-lesson-header">
              <div className="sq-lock-badge">
                <Lock size={12} />
                Confidential For Lecturer
              </div>
              <h2 className="sq-lesson-title">Presentation Knowledge Graph</h2>
              <p className="sq-lesson-subtitle">How the lecture flows from biology to execution</p>
            </div>
            <div className="sq-lesson-body">
              <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
                This graph maps the logical progression of the lecture. It moves from internal human biology out to the physical environment, through the electrical system, and finally to the operator's execution.
              </p>
              <MermaidChart
                theme={theme}
                chart={`flowchart TD
    subgraph Phase1[Phase 1: The Human Listener]
        A[Human Perception & Biology]
        A1(Equal-Loudness Contours / ISO 226)
        A2(2-5 kHz Peak Sensitivity)
        A3(Auditory Masking & Adaptation)
        A --> A1 & A2 & A3
    end

    subgraph Phase2[Phase 2: The Acoustic Space]
        B[Room Environment & Decay]
        B1(Sabine Formula: RT60)
        B2(Absorption: Sabins / Audience)
        B --> B1 & B2
    end

    subgraph Phase3[Phase 3: The Mechanical System]
        C[Stage Physics & Loudspeakers]
        C1(Inverse-Square Law: -6dB)
        C2(Directivity & Sub Coupling)
        C3(Comb Filtering & Stage Wash)
        C --> C1 & C2 & C3
    end

    subgraph Phase4[Phase 4: Measurable Objectives]
        D[System Goals & Targets]
        D1(Intelligibility: STI > 0.6)
        D2(Clarity: C50 / C80 > 0)
        D3(Safety: 82-95 dB SPL limits)
        D --> D1 & D2 & D3
    end

    subgraph Phase5[Phase 5: Operator Execution]
        E[Troubleshooting & Workflow]
        E1(The Half-Split Method)
        E2(Gain Staging & 6dB Headroom)
        E3(298EQ Checklist & Reference Tracks)
        E --> E1 & E2 & E3
    end

    A ==>|Dictates how we hear| B
    B ==>|Altered by| C
    C ==>|Must achieve| D
    D ==>|Managed via| E`}
              />

              <h4 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Instructor's Conceptual Flowchart</h4>
              <div className="sq-content-block">
                <ul>
                  <li><strong>Start with the Listener (Biology):</strong> Frame the entire class around the fact that human hearing is flawed and non-linear. You cannot trust your ears alone because volume changes tone.</li>
                  <li><strong>Move to the Room (Acoustics):</strong> Explain that the room is an active participant in the mix. Rehearsals sound bad because Volume is high and Absorption is low; the audience fixes this by adding sabins.</li>
                  <li><strong>Introduce the Gear (Physics):</strong> Now that they understand the room, explain how speakers interact with it. Emphasize controlling the mess (directivity) rather than just pushing faders.</li>
                  <li><strong>Establish the Targets (Metrics):</strong> Tie the physics to actual numbers. It doesn't matter how good the music sounds if STI drops below 0.6 and no one can understand the words.</li>
                  <li><strong>Finish with the Method (Action):</strong> Give them the operational checklist. Teach them to divide the signal chain in half to find problems, keep 6 dB of headroom, and always use an objective reference track.</li>
                </ul>
              </div>

              <h4 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Technical Glossary Reference</h4>
              <div className="sq-glossary-list">
                {[
                  ["Auditory Adaptation", "The phenomenon where the brain adapts to a listening environment after 15–20 minutes, causing imbalances (like excessive bass or distortion) to sound 'normal'."],
                  ["C50 / C80 (Clarity Index)", "Metrics for sound definition in a room. C50 is the standard for speech (target > +3 dB), while C80 is the standard for music (target > 0 dB)."],
                  ["Comb Filtering", "Phase cancellation that occurs when a signal is mixed with a delayed version of itself, often demonstrated when panning mono signals or overlapping speaker coverage zones."],
                  ["Crest Factor", "A measurement of dynamic range, calculated as the difference between the peak level and the RMS (average) level."],
                  ["Critical Bands / Auditory Masking", "The ear groups nearby frequencies together; when two sounds occupy the same band, the louder sound will mask or hide the quieter one."],
                  ["Directivity Index (DI)", "A manufacturer specification detailing a loudspeaker's pattern control, which dictates how much energy hits the audience versus spilling onto the stage."],
                  ["Equal-Loudness Contours (ISO 226 / Fletcher-Munson)", "Curves demonstrating that human hearing sensitivity varies by frequency and volume level. Humans are most sensitive in the 2–5 kHz range."],
                  ["Half-Split Method", "A troubleshooting technique where the signal chain is tested at the midpoint (e.g., the mixer) rather than sequentially."],
                  ["Headroom", "The safety buffer maintained below a system's clipping point. The course advocates for a strict 6 dB minimum headroom on all buses."],
                  ["Inverse-Square Law", "A principle stating that doubling the distance from a sound source reduces the Sound Pressure Level (SPL) by 6 dB."],
                  ["LUFS (Loudness Units relative to Full Scale)", "A measurement of perceived loudness that adjusts for the human hearing contour, widely used as a broadcast compliance standard."],
                  ["RT60 (Sabine Formula)", "The calculation for reverberation time, representing how long it takes for sound to decay by 60 decibels."],
                  ["Sabins", "The unit of measurement for total acoustic absorption used in the RT60 calculation. For example, a seated audience member provides 0.3–0.6 sabins of absorption."],
                  ["Speech Transmission Index (STI)", "A metric scaling from 0.00 to 1.00 used to measure vocal intelligibility. A score of ≥ 0.6 is considered 'Good'."],
                  ["Subwoofer Coupling", "The physics principle where two identical, coherent low-frequency sources placed together add approximately +3 dB of energy, rather than +6 dB."],
                ].map(([term, def]) => (
                  <div key={term} className="sq-glossary-item">
                    <strong>{term}</strong>
                    <p>{def}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
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
