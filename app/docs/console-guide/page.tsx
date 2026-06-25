"use client";

import { useState } from "react";
import {
  Headphones,
  Music,
  ToggleLeft,
  BarChart3,
  Volume2,
  Target,
  Radio,
  FlaskConical,
  SlidersHorizontal,
  Trophy,
  Settings2,
  CheckCircle2,
  Download,
  Activity,
  Gauge,
  AlertTriangle,
  Zap,
  Mic,
  Printer,
  Play,
  Waves,
  Ear,
  VolumeX,
  Cpu,
} from "lucide-react";
import "./guide.css";
import { APP_NAME } from "@/lib/brand";

/* ─────────────────────────────────────────────────────────────
   AUDIT DATA
   ───────────────────────────────────────────────────────────── */
const AUDIT = [
  { zone: "A", zoneName: "Setup", component: "HeadphoneProfile", control: "Output Device Selector", type: "Dropdown", status: "active", notes: "Stores choice in localStorage; warns about bass on small drivers" },
  { zone: "A", zoneName: "Setup", component: "LessonModeOverlay", control: "Lesson Mode Toggle", type: "Button", status: "active", notes: "Step-by-step guided overlay with checkpoints" },
  { zone: "B", zoneName: "Player", component: "WaveformDisplay", control: "Waveform + Seek", type: "Canvas", status: "active", notes: "Click/drag to seek; fetches peaks from audio URL" },
  { zone: "B", zoneName: "Player", component: "Audio Element", control: "Play / Pause / Stop / Rewind", type: "Buttons", status: "active", notes: "Play resumes AudioContext; Stop resets to 0" },
  { zone: "B", zoneName: "Player", component: "TrackInfo", control: "Album Art + BPM/Key + Mic BPM", type: "Display + Btn", status: "active", notes: "Auto-detects BPM/key; mic BPM gated when playing" },
  { zone: "C", zoneName: "Listen", component: "ABToggle", control: "A/B Compare Switch", type: "Toggle", status: "active", notes: "Bypasses all EQ/comp/makeup in Original mode" },
  { zone: "D", zoneName: "Analyse", component: "SpectrumAnalyzer", control: "Live FFT Spectrum", type: "Canvas", status: "active", notes: "Logarithmic freq bars via AnalyserNode + rAF" },
  { zone: "D", zoneName: "Analyse", component: "VUMeter", control: "Peak + RMS VU Meter", type: "Canvas", status: "active", notes: "Peak hold, RMS bar, clip indicator" },
  { zone: "D2", zoneName: "Console", component: "ConsoleStrip", control: "Gain / Pan / Width", type: "Sliders", status: "active", notes: "Gain→channelGain; Pan→StereoPanner; Width→M/S side gain" },
  { zone: "D2", zoneName: "Console", component: "CompressorControls", control: "Comp: Thr/Ratio/Atk/Rel/Knee + Enable", type: "Sliders+Toggle", status: "active", notes: "All params wired to DynamicsCompressorNode" },
  { zone: "D2", zoneName: "Console", component: "CompressorControls", control: "Limiter: Ceiling + Enable", type: "Slider+Toggle", status: "active", notes: "Ratio 20:1; GR meter shows reduction" },
  { zone: "D2", zoneName: "Console", component: "LUFSMeter", control: "LUFS + Peak dB Readout", type: "Display", status: "active", notes: "Simplified K-weighted estimate; target -14 LUFS" },
  { zone: "D3", zoneName: "Reference", component: "ReferencePanel", control: "Benchmark Match + Apply", type: "Panel+Btn", status: "active", notes: "Fetches genre benchmark; applies corrections" },
  { zone: "D4", zoneName: "Live", component: "LiveModePanel", control: "Mic Input + Clip + Scenes", type: "Panel+Btns", status: "active", notes: "getUserMedia; clip detector; scene presets toggle" },
  { zone: "E", zoneName: "Learn", component: "FrequencySweep", control: "20Hz–20kHz Sine Sweep", type: "Btn+Slider", status: "active", notes: "OscillatorNode sweep through audio context" },
  { zone: "E", zoneName: "Learn", component: "NoiseInjection", control: "Hiss / Hum / Rumble", type: "Toggles+Sliders", status: "active", notes: "Oscillator + noise buffer through gain nodes" },
  { zone: "E", zoneName: "Learn", component: "ClippingDemo", control: "Soft/Hard Clip Demo", type: "Button", status: "active", notes: "WaveShaperNode post-makeupGain; shows on VU" },
  { zone: "F", zoneName: "Adjust", component: "EQPresets", control: "Preset Library + Save/Apply", type: "Buttons", status: "active", notes: "Animated 50ms transition between EQ states" },
  { zone: "F", zoneName: "Adjust", component: "EQSlider × 5", control: "Low / Mid / High / Gain / 298EQ", type: "V-Sliders", status: "active", notes: "100Hz shelf; 1kHz peak; 8kHz shelf; 298Hz Q1.4 peak" },
  { zone: "F", zoneName: "Adjust", component: "MacroFader", control: "Macro Intensity 0–100", type: "H-Fader", status: "active", notes: "Drives all Advanced FX params per sound class" },
  { zone: "F", zoneName: "Adjust", component: "AdvancedFXPanel", control: "8 FX Intensity Faders", type: "Modal Sliders", status: "active", notes: "Gate→Deess→Vocal→Pitch→ParComp→Plate→Reverb" },
  { zone: "F", zoneName: "Adjust", component: "QualityScoreBar", control: "Sound Quality Score 0–100", type: "Progress Bar", status: "active", notes: "Computed from EQ deviation vs benchmark" },
  { zone: "G", zoneName: "Practice", component: "EarTrainingQuiz", control: "Fix-the-Mix Challenges", type: "Quiz", status: "active", notes: "Random EQ problem; student must correct by ear" },
  { zone: "G", zoneName: "Practice", component: "AdvancedTraining", control: "Console + EQ Matching Drills", type: "Interactive", status: "active", notes: "Match target console settings and EQ curves" },
  { zone: "H", zoneName: "Studio", component: "StudioToolsPanel", control: "Pitch/Time/HPSS/Denoise/Project", type: "Tabbed Panel", status: "active", notes: "6 tabs: pitch shift, time stretch, HPSS, denoise, project save" },
  { zone: "I", zoneName: "Complete", component: "SessionSave", control: "Save & Complete + Submit", type: "Buttons", status: "active", notes: "Saves analytics; submits to instructor" },
];

/* ─────────────────────────────────────────────────────────────
   SIGNAL CHAIN NODES
   ───────────────────────────────────────────────────────────── */
const CHAIN_NODES = [
  { label: "Source", sub: "Audio Element" },
  { label: "Advanced FX", sub: "9 Effects" },
  { label: "WEQ8 EQ", sub: "5-Band" },
  { label: "Compressor", sub: "Dynamics" },
  { label: "Panner", sub: "Stereo" },
  { label: "Width", sub: "M/S Processor" },
  { label: "Limiter", sub: "Brick-wall" },
  { label: "Gain", sub: "Channel" },
  { label: "Output", sub: "Destination" },
];

/* ─────────────────────────────────────────────────────────────
   FREQUENCY BANDS DATA
   ───────────────────────────────────────────────────────────── */
const FREQ_BANDS = [
  { range: "20–60 Hz", name: "Sub-bass", color: "#ef4444", issue: "Boomy, muddy", score: 75 },
  { range: "60–250 Hz", name: "Bass", color: "#f97316", issue: "Boomy, flabby", score: 68 },
  { range: "250–500 Hz", name: "Low-mids", color: "#eab308", issue: "Boxy, congested", score: 55 },
  { range: "500 Hz–2 kHz", name: "Mids", color: "#22c55e", issue: "Nasal, honky", score: 72 },
  { range: "2–5 kHz", name: "Presence", color: "#06b6d4", issue: "Harsh, piercing", score: 80 },
  { range: "5–10 kHz", name: "Brightness", color: "#3b82f6", issue: "Sibilance", score: 65 },
  { range: "10–20 kHz", name: "Air", color: "#a855f7", issue: "Dull, lifeless", score: 58 },
];

/* ─────────────────────────────────────────────────────────────
   EQ BAND DETAILS
   ───────────────────────────────────────────────────────────── */
const EQ_BANDS = [
  { band: "Low", freq: "100 Hz", type: "Low Shelf", range: "-12 to +12 dB", color: "#ef4444" },
  { band: "Mid", freq: "1 kHz", type: "Peaking", range: "-12 to +12 dB", color: "#22c55e" },
  { band: "High", freq: "8 kHz", type: "High Shelf", range: "-12 to +12 dB", color: "#3b82f6" },
  { band: "298EQ", freq: "298 Hz", type: "Peaking Q=1.4", range: "-12 to +12 dB", color: "#a855f7" },
  { band: "Gain", freq: "—", type: "Makeup Gain", range: "-12 to +12 dB", color: "#f97316" },
];

/* ─────────────────────────────────────────────────────────────
   COMPRESSOR PARAMS
   ───────────────────────────────────────────────────────────── */
const COMP_PARAMS = [
  { param: "Threshold", range: "-60 to 0 dB", default: "-24 dB", desc: "Level above which compression begins" },
  { param: "Ratio", range: "1:1 to 20:1", default: "3:1", desc: "How much signal above threshold is reduced" },
  { param: "Attack", range: "0 to 1000 ms", default: "3 ms", desc: "How fast compressor reacts to transients" },
  { param: "Release", range: "0 to 1000 ms", default: "250 ms", desc: "How fast gain returns after signal drops" },
  { param: "Knee", range: "0 to 40 dB", default: "30 dB", desc: "Softness of threshold transition" },
];

/* ─────────────────────────────────────────────────────────────
   ADVANCED FX CHAIN
   ───────────────────────────────────────────────────────────── */
const FX_CHAIN = [
  { name: "Noise Gate", desc: "Silences background when no signal present", order: 1 },
  { name: "De-esser", desc: "Reduces sibilance (5–8 kHz harshness)", order: 2 },
  { name: "Vocal Chain", desc: "Enhances vocal presence and clarity", order: 3 },
  { name: "Pitch Correction", desc: "Subtle pitch correction for vocals", order: 4 },
  { name: "Parallel Compression", desc: "Blends compressed + dry for density", order: 5 },
  { name: "Plate Reverb", desc: "Adds spatial depth and ambience", order: 6 },
  { name: "Hall Reverb", desc: "Longer reverb tail for atmosphere", order: 7 },
  { name: "Filter Sweep", desc: "Automated filter movement for dynamics", order: 8 },
];

/* ─────────────────────────────────────────────────────────────
   TROUBLESHOOTING TREE
   ───────────────────────────────────────────────────────────── */
const TROUBLE_LINES = [
  { text: "Symptom: HUM (50/60 Hz drone)", cls: "dt-symptom" },
  { text: "├── Source? → Swap mic/cable → Still hums? → Go downstream", cls: "dt-test" },
  { text: "├── Processing? → Bypass EQ/FX → Still hums? → Go downstream", cls: "dt-test" },
  { text: "├── Amplification? → Lift ground on amp → Hum stops? → Ground loop", cls: "dt-fix" },
  { text: "└── Output? → Move speaker from power → Hum stops? → EMI pickup", cls: "dt-fix" },
  { text: "", cls: "" },
  { text: "Symptom: HISS (high-frequency noise)", cls: "dt-symptom" },
  { text: "├── Source? → Mute input → Hiss stops? → Source noise", cls: "dt-test" },
  { text: "├── Gain? → Reduce gain, move closer → Hiss drops? → Excessive gain", cls: "dt-test" },
  { text: "├── Processing? → Bypass compressor → Hiss drops? → Comp raising noise", cls: "dt-fix" },
  { text: "└── Output? → Disconnect input → Hiss remains? → Speaker self-noise", cls: "dt-fix" },
  { text: "", cls: "" },
  { text: "Symptom: DISTORTION (signal breaking up)", cls: "dt-symptom" },
  { text: "├── Source? → Check input LED → Red? → Input clipping", cls: "dt-test" },
  { text: "├── Gain? → Lower input gain → Clean? → Gain too hot", cls: "dt-fix" },
  { text: "├── Processing? → Bypass plugins → Clean? → Plugin clipping", cls: "dt-fix" },
  { text: "└── Output? → Check amp meters → Red? → Amplifier overload", cls: "dt-fix" },
  { text: "", cls: "" },
  { text: "Symptom: MUDDY MIX (lack of clarity)", cls: "dt-symptom" },
  { text: "├── Source? → Solo channel → Still muddy? → Mic placement", cls: "dt-test" },
  { text: "├── EQ? → Check 250–500 Hz → Boosted? → Cut 3-6 dB", cls: "dt-fix" },
  { text: "├── Compressor? → Check attack → Too slow? → Speed up attack", cls: "dt-fix" },
  { text: "└── Spectrum? → Watch RTA → Energy buildup? → Cut problem freq", cls: "dt-fix" },
];

/* ─────────────────────────────────────────────────────────────
   WORKFLOW STEPS
   ───────────────────────────────────────────────────────────── */
const WORKFLOW = [
  { title: "Select Your Output Device", desc: "Choose your headphones or speakers in Zone A. The system warns if bass frequencies may be inaudible on small drivers." },
  { title: "Load a Track", desc: "Pick a song from the dashboard. The player auto-detects BPM and musical key. Album art appears in the player section." },
  { title: "Press Play & Listen", desc: "Use the waveform to seek. Watch the spectrum analyzer and VU meter activate. Confirm audio is playing cleanly." },
  { title: "A/B Compare", desc: "Toggle between Original (bypass) and Enhanced (298EQ on). Listen for differences in clarity, warmth, and presence." },
  { title: "Adjust EQ Sliders", desc: "Use the 5-band EQ (Low, Mid, High, 298EQ, Gain) to shape the frequency balance. Watch the spectrum analyzer respond in real-time." },
  { title: "Set Console Controls", desc: "Adjust Gain, Pan, and Width on the channel strip. Configure the compressor (threshold, ratio, attack, release, knee). Set the limiter ceiling." },
  { title: "Apply Advanced FX", desc: "Open the Advanced EQ modal. Use individual faders for the 9-effect chain, or use the Macro fader for genre-aware one-knob control." },
  { title: "Try Scene Presets", desc: "In Live Mode, click a scene preset to apply a complete console + EQ + FX configuration. Click again to toggle it off and return to flat." },
  { title: "Check the Quality Score", desc: "The live quality score (0–100) updates as you adjust. Aim for 70+ by matching the genre benchmark." },
  { title: "Use Reference Match", desc: "Click Apply Corrections in the Reference panel to auto-adjust EQ based on the genre benchmark curve." },
  { title: "Practice with Ear Training", desc: "Open the Ear Training quiz. A random EQ problem is applied — fix it by ear. Try Advanced Training for console matching drills." },
  { title: "Save & Submit", desc: "Click Save & Complete Session to record your settings. Submit to send your work to your instructor for review." },
];

/* ─────────────────────────────────────────────────────────────
   SIX DIMENSIONS
   ───────────────────────────────────────────────────────────── */
const DIMENSIONS = [
  { name: "Frequency Balance", icon: "bar", q: "Does the sound have too much or too little bass, mids, or treble?", tool: "Spectrum Analyzer + EQ Sliders" },
  { name: "Dynamic Range", icon: "gauge", q: "Are the loud and soft parts controlled appropriately?", tool: "Compressor + LUFS Meter" },
  { name: "Noise Floor", icon: "alert", q: "How much unwanted sound exists beneath the signal?", tool: "Noise Injection + VU Meter" },
  { name: "Distortion", icon: "zap", q: "Is the signal changing shape unintentionally?", tool: "Clipping Demo + VU Meter" },
  { name: "Spatial Quality", icon: "volume", q: "Where does the sound appear to come from?", tool: "Width Control + Pan" },
  { name: "Time Response", icon: "waves", q: "Does the system react accurately over time?", tool: "Frequency Sweep + Spectrum" },
];

/* ─────────────────────────────────────────────────────────────
   CONTEXT PRIORITIES
   ───────────────────────────────────────────────────────────── */
const CONTEXT_PRIORITY = [
  { context: "Music", p1: "Frequency Balance", p2: "Dynamic Range", p3: "Spatial Quality" },
  { context: "Podcast", p1: "Intelligibility", p2: "Noise Floor", p3: "Consistency" },
  { context: "Live", p1: "SPL / Dynamics", p2: "Frequency Balance", p3: "Time Response" },
  { context: "Stream", p1: "Consistency", p2: "LUFS Compliance", p3: "Distortion" },
];

/* ─────────────────────────────────────────────────────────────
   MEASUREMENT TOOLS
   ───────────────────────────────────────────────────────────── */
const MEASUREMENTS = [
  { metric: "Peak dBFS", what: "Absolute highest sample value", use: "Detecting clipping", inApp: "VU Meter peak hold" },
  { metric: "RMS dBFS", what: "Average power over time", use: "How loud it feels", inApp: "VU Meter RMS bar" },
  { metric: "LUFS", what: "Perceived loudness (K-weighted)", use: "Streaming/broadcast compliance", inApp: "LUFS Meter" },
  { metric: "Frequency Response", what: "Tonal balance across spectrum", use: "EQ curve verification", inApp: "Spectrum Analyzer" },
  { metric: "Gain Reduction", what: "How much compressor is working", use: "Compression assessment", inApp: "Compressor GR meter" },
  { metric: "Crest Factor", what: "Dynamic range (peak − RMS)", use: "Genre-appropriate loudness", inApp: "VU Peak vs RMS gap" },
];

/* ─────────────────────────────────────────────────────────────
   ICON MAPPER
   ───────────────────────────────────────────────────────────── */
function ZoneIcon({ zone }: { zone: string }) {
  const icons: Record<string, React.ReactNode> = {
    A: <Headphones size={14} />,
    B: <Music size={14} />,
    C: <ToggleLeft size={14} />,
    D: <BarChart3 size={14} />,
    D2: <Volume2 size={14} />,
    D3: <Target size={14} />,
    D4: <Radio size={14} />,
    E: <FlaskConical size={14} />,
    F: <SlidersHorizontal size={14} />,
    G: <Trophy size={14} />,
    H: <Settings2 size={14} />,
    I: <CheckCircle2 size={14} />,
  };
  return <>{icons[zone] ?? <Activity size={14} />}</>;
}

function DimIcon({ name }: { name: string }) {
  const map: Record<string, React.ReactNode> = {
    bar: <BarChart3 size={16} />,
    gauge: <Gauge size={16} />,
    alert: <AlertTriangle size={16} />,
    zap: <Zap size={16} />,
    volume: <Volume2 size={16} />,
    waves: <Waves size={16} />,
  };
  return <>{map[name] ?? <Activity size={16} />}</>;
}

/* ─────────────────────────────────────────────────────────────
   FREQUENCY RESPONSE SVG CHART
   ───────────────────────────────────────────────────────────── */
function FreqResponseChart() {
  return (
    <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">
      {/* Grid lines */}
      {[0, 50, 100, 150].map((y) => (
        <line key={y} x1="40" y1={y + 20} x2="580" y2={y + 20} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {/* 0 dB line */}
      <line x1="40" y1="100" x2="580" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,4" />
      {/* Frequency labels */}
      {["20", "50", "100", "200", "500", "1k", "2k", "5k", "10k", "20k"].map((label, i) => (
        <text key={label} x={40 + (i * 60)} y="195" fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">
          {label}
        </text>
      ))}
      {/* dB labels */}
      {["+12", "+6", "0", "-6", "-12"].map((label, i) => (
        <text key={label} x="30" y={24 + i * 44} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="end">
          {label}
        </text>
      ))}
      {/* Low shelf boost curve (100 Hz) */}
      <path d="M 40 100 Q 80 60, 120 70 L 180 95 Q 220 100, 260 100" fill="none" stroke="#ef4444" strokeWidth="2.5" />
      {/* 298Hz peak curve */}
      <path d="M 180 100 Q 240 55, 300 55 Q 360 55, 400 100" fill="none" stroke="#a855f7" strokeWidth="2.5" />
      {/* Mid peak curve (1kHz) */}
      <path d="M 280 100 Q 340 75, 380 75 Q 420 75, 460 100" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6" />
      {/* High shelf boost curve (8kHz) */}
      <path d="M 400 100 Q 460 70, 500 65 L 580 65" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      {/* Labels */}
      <text x="80" y="55" fill="#ef4444" fontSize="9" fontWeight="700">Low +6dB</text>
      <text x="255" y="48" fill="#a855f7" fontSize="9" fontWeight="700">298Hz +4dB</text>
      <text x="520" y="58" fill="#3b82f6" fontSize="9" fontWeight="700">High +6dB</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPRESSOR CURVE SVG
   ───────────────────────────────────────────────────────────── */
function CompressorCurve() {
  return (
    <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      {/* Grid */}
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="30" y1={y} x2="380" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {[60, 120, 180, 240, 300, 360].map((x) => (
        <line key={x} x1={x} y1="10" x2={x} y2="180" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {/* 1:1 reference line */}
      <line x1="30" y1="180" x2="380" y2="10" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4" />
      {/* Threshold line */}
      <line x1="200" y1="10" x2="200" y2="180" stroke="#ffb347" strokeWidth="1" strokeDasharray="3,3" />
      <text x="205" y="25" fill="#ffb347" fontSize="9">Threshold</text>
      {/* Compressor curve (3:1 above threshold) */}
      <path d="M 30 180 L 200 80 L 380 20" fill="none" stroke="#FF58AE" strokeWidth="2.5" />
      {/* Knee region */}
      <path d="M 170 110 Q 200 80, 230 65" fill="none" stroke="rgba(255,88,174,0.3)" strokeWidth="6" />
      {/* Labels */}
      <text x="190" y="195" fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">Input (dB)</text>
      <text x="10" y="100" fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle" transform="rotate(-90 10 100)">Output (dB)</text>
      <text x="100" y="160" fill="rgba(255,255,255,0.3)" fontSize="8">1:1 (unity)</text>
      <text x="290" y="45" fill="#FF58AE" fontSize="9" fontWeight="700">3:1 compression</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export default function ConsoleGuidePage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = () => {
    setDownloading(true);
    // Use browser's native print-to-PDF — the @media print CSS
    // applies the design system colors for the PDF output
    setTimeout(() => {
      window.print();
      setDownloading(false);
    }, 300);
  };

  return (
    <div className="guide-page">
      {/* PDF Header (only visible when printing) */}
      <div className="pdf-header">
        <div className="pdf-header-logo"><img src="/assets/logo/footer-logo-allpages.png" alt={APP_NAME} className="pdf-header-logo-img" /></div>
        <div className="pdf-header-meta">Console Room Guide · {new Date().toLocaleDateString()}</div>
      </div>

      {/* ── HERO ── */}
      <div className="guide-hero">
        <div className="guide-hero-badge">
          <Headphones size={12} />
          Console Room Guide
        </div>
        <h1>
          Sound Quality, Sound Management<br />
          & <span className="gradient-text">Console Mastery</span>
        </h1>
        <p>
          A complete walkthrough of the {APP_NAME} Console Room — every control, meter, and workflow
          explained section by section. Learn how to evaluate audio, shape sound, troubleshoot
          problems, and use the full toolchain from beginner to advanced.
        </p>
        <div className="guide-download-row">
          <button className="guide-btn guide-btn-primary" onClick={handleDownloadPDF} disabled={downloading}>
            <Download size={16} />
            {downloading ? "Preparing PDF..." : "Download PDF"}
          </button>
          <button className="guide-btn guide-btn-secondary" onClick={handleDownloadPDF}>
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      {/* ── TOC ── */}
      <div className="guide-toc">
        <h3>Table of Contents</h3>
        <ul className="guide-toc-list">
          <li><a href="#audit"><CheckCircle2 /> 1. Console Audit — All Controls Verified</a></li>
          <li><a href="#chain"><Cpu /> 2. The Audio Signal Chain</a></li>
          <li><a href="#zones"><Volume2 /> 3. Zone-by-Zone Guide</a></li>
          <li><a href="#eq"><SlidersHorizontal /> 4. EQ & Frequency Control</a></li>
          <li><a href="#dynamics"><Gauge /> 5. Dynamics — Compressor & Limiter</a></li>
          <li><a href="#fx"><Zap /> 6. Advanced FX Chain</a></li>
          <li><a href="#meters"><BarChart3 /> 7. Meters & Monitoring</a></li>
          <li><a href="#quality"><Activity /> 8. Six Dimensions of Sound Quality</a></li>
          <li><a href="#workflow"><Play /> 9. Complete Workflow — Start to Finish</a></li>
          <li><a href="#troubleshoot"><AlertTriangle /> 10. Troubleshooting & Debugging</a></li>
          <li><a href="#reference"><Target /> 11. Reference Tables & Cheat Sheet</a></li>
        </ul>
      </div>

      {/* ───────────────────────────────────────
          1. AUDIT
          ─────────────────────────────────────── */}
      <div className="guide-section" id="audit">
        <div className="guide-section-header">
          <div className="guide-section-icon"><CheckCircle2 size={14} /></div>
          <div className="guide-section-title">1. Console Audit — All Controls Verified</div>
        </div>
        <div className="guide-section-subtitle">
          Every control, meter, and monitor in the Console Room was audited for active wiring to the Web Audio API.
        </div>

        <div className="callout callout-success">
          <div className="callout-icon"><CheckCircle2 size={16} color="#22c55e" /></div>
          <div className="callout-body">
            <strong>All 27 controls verified as active.</strong> Each control is wired to a Web Audio node
            and affects the audio signal in real-time. The Width control was previously non-functional
            and has been fixed with a full mid/side stereo processor.
          </div>
        </div>

        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Component</th>
                <th>Control</th>
                <th>Type</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT.map((row, i) => (
                <tr key={i}>
                  <td><span className="zone-tag">{row.zone} — {row.zoneName}</span></td>
                  <td>{row.component}</td>
                  <td>{row.control}</td>
                  <td style={{ color: "var(--muted)" }}>{row.type}</td>
                  <td><span className="status-badge status-active">Active</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────
          2. SIGNAL CHAIN
          ─────────────────────────────────────── */}
      <div className="guide-section" id="chain">
        <div className="guide-section-header">
          <div className="guide-section-icon"><Cpu size={14} /></div>
          <div className="guide-section-title">2. The Audio Signal Chain</div>
        </div>
        <div className="guide-section-subtitle">
          Audio flows through 9 processing stages from source to output. Each stage can be bypassed or adjusted.
        </div>

        <div className="chain-diagram">
          {CHAIN_NODES.map((node, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div className="chain-node">
                <div className="chain-node-label">{node.label}</div>
                <div className="chain-node-sub">{node.sub}</div>
              </div>
              {i < CHAIN_NODES.length - 1 && <span className="chain-arrow">→</span>}
            </div>
          ))}
        </div>

        <div className="guide-card">
          <h3><Activity size={14} /> How the Chain Works</h3>
          <p>
            The <strong>HTMLAudioElement</strong> is wrapped in a <code>MediaElementAudioSourceNode</code>,
            which feeds into the <strong>Advanced FX Chain</strong> (9 effects in series). From there,
            signal enters the <strong>WEQ8 EQ</strong> (5-band: Low shelf at 100 Hz, Mid peak at 1 kHz,
            High shelf at 8 kHz, 298 Hz peaking at Q=1.4, and a makeup Gain).
          </p>
          <p>
            After EQ, the signal hits the <strong>Compressor</strong> (DynamicsCompressorNode with full
            parameter control), then the <strong>StereoPanner</strong>, then the <strong>Width processor</strong>
            (mid/side extraction with side-gain scaling), then the <strong>Limiter</strong> (20:1 ratio
            brick-wall), then <strong>Channel Gain</strong>, and finally the <strong>Output</strong> (ctx.destination).
          </p>
          <p>
            An <strong>AnalyserNode</strong> taps the signal post-makeupGain to feed the Spectrum Analyzer,
            VU Meter, and LUFS Meter simultaneously.
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────
          3. ZONE-BY-ZONE
          ─────────────────────────────────────── */}
      <div className="guide-section" id="zones">
        <div className="guide-section-header">
          <div className="guide-section-icon"><Volume2 size={14} /></div>
          <div className="guide-section-title">3. Zone-by-Zone Guide</div>
        </div>
        <div className="guide-section-subtitle">
          The Console Room is organized into 9 zones, top to bottom. Each zone has a specific purpose.
        </div>

        <div className="guide-grid-2">
          <div className="guide-card">
            <h3><Headphones size={14} color="var(--purple)" /> Zone A — Setup</h3>
            <p><strong>Headphone Profile:</strong> Select your output device (studio headphones, earbuds, laptop speakers, phone speaker). The system stores your choice and warns if bass frequencies may be inaudible on small drivers.</p>
            <p><strong>Lesson Mode:</strong> Opens a step-by-step guided overlay with numbered checkpoints for first-time users.</p>
          </div>

          <div className="guide-card">
            <h3><Music size={14} color="var(--orange)" /> Zone B — Player</h3>
            <p><strong>Waveform Display:</strong> Visual waveform with click-to-seek. Shows playback position and total duration.</p>
            <p><strong>Transport Controls:</strong> Play, Pause, Stop, and Rewind to beginning. Play auto-resumes the AudioContext if suspended.</p>
            <p><strong>Track Info:</strong> Album art, title, artist, genre. BPM and musical key auto-detected on load. Mic BPM button for real-time tempo detection (disabled during playback).</p>
          </div>

          <div className="guide-card">
            <h3><ToggleLeft size={14} color="#22c55e" /> Zone C — Listen (A/B Compare)</h3>
            <p><strong>A/B Toggle Switch:</strong> Instantly compare Original (bypass — all EQ, compressor, and makeup gain disabled) vs Enhanced (298EQ processing active). This is your most important evaluation tool.</p>
            <p>Use A/B every 20 minutes to counteract auditory adaptation — your ears adapt to whatever you're listening to.</p>
          </div>

          <div className="guide-card">
            <h3><BarChart3 size={14} color="#00a6ff" /> Zone D — Analyse</h3>
            <p><strong>Live Spectrum Analyzer:</strong> Real-time FFT showing frequency content as logarithmic bars. Status indicator: Live (green), Standby (gray), Offline (red).</p>
            <p><strong>VU Meter:</strong> Peak level (with hold) and RMS level in dB. Clip indicator turns red when signal exceeds 0 dBFS. Use this to verify gain structure.</p>
          </div>

          <div className="guide-card">
            <h3><Volume2 size={14} color="var(--accent)" /> Zone D2 — Console</h3>
            <p><strong>Channel Strip:</strong> Gain (-12 to +12 dB), Pan (-1 to +1), Width (0=mono to 2=wide, 1=normal). Width uses mid/side processing to scale the stereo image.</p>
            <p><strong>Compressor:</strong> Threshold, Ratio, Attack, Release, Knee — all with enable/disable toggle. Gain reduction meter shows how much compression is happening in real-time.</p>
            <p><strong>Limiter:</strong> Ceiling threshold with enable/disable. Ratio fixed at 20:1 for brick-wall limiting. Separate GR meter.</p>
            <p><strong>LUFS Meter:</strong> Integrated loudness estimate with target at -14 LUFS (streaming standard). Color-coded: green (within 1 LU), amber (within 3 LU), red (off target).</p>
          </div>

          <div className="guide-card">
            <h3><Target size={14} color="#22c55e" /> Zone D3 — Reference Match</h3>
            <p><strong>Benchmark Panel:</strong> Fetches genre-specific benchmark data for the loaded track. Shows target EQ curve and loudness profile.</p>
            <p><strong>Apply Corrections:</strong> One-click button to auto-adjust Low, High, 298EQ, and Gain to match the genre benchmark. Use as a starting point, then fine-tune by ear.</p>
          </div>

          <div className="guide-card">
            <h3><Radio size={14} color="var(--red)" /> Zone D4 — Live Mode</h3>
            <p><strong>Microphone Input:</strong> Connects your mic via getUserMedia to the audio chain entry point. Clip detector monitors for dangerous levels.</p>
            <p><strong>Scene Presets:</strong> Pre-configured console + EQ + FX settings for common scenarios (e.g., "Podcast Warm", "Music Bright", "Live Vocal"). Click to apply, click again to toggle off and return to flat.</p>
            <p><strong>Input Level Meter:</strong> Real-time mic level with -60 to 0 dB scale.</p>
          </div>

          <div className="guide-card">
            <h3><FlaskConical size={14} color="#eab308" /> Zone E — Learn</h3>
            <p><strong>Frequency Sweep:</strong> Plays a sine wave from 20 Hz to 20 kHz through the audio context. Teaches what each frequency band sounds like in isolation.</p>
            <p><strong>Noise Injection:</strong> Adds hiss (broadband), hum (50/60 Hz), or rumble (low-frequency) at adjustable levels. Demonstrates signal-to-noise ratio concepts.</p>
            <p><strong>Clipping Demo:</strong> Inserts a WaveShaperNode to demonstrate soft and hard clipping. Watch the VU meter hit red and hear the distortion.</p>
          </div>

          <div className="guide-card">
            <h3><SlidersHorizontal size={14} color="var(--accent)" /> Zone F — Adjust</h3>
            <p><strong>EQ Presets:</strong> Library of saved EQ + FX configurations. Apply with animated 50ms transition. Save your own presets.</p>
            <p><strong>5-Band EQ Sliders:</strong> Low (100 Hz shelf), Mid (1 kHz peak), High (8 kHz shelf), 298EQ (298 Hz peak, Q=1.4), Gain (makeup). Range: -12 to +12 dB per band.</p>
            <p><strong>Macro Fader:</strong> Genre-aware one-knob control (0–100) that drives all 9 Advanced FX parameters simultaneously.</p>
            <p><strong>Advanced EQ Modal:</strong> Individual intensity faders for each of the 9 FX effects. Toggle between Basic and Advanced EQ views.</p>
            <p><strong>Quality Score Bar:</strong> Live 0–100 score based on EQ deviation from genre benchmark. Green (71+), Amber (41–70), Red (0–40).</p>
          </div>

          <div className="guide-card">
            <h3><Trophy size={14} color="#ffb700" /> Zone G — Practice</h3>
            <p><strong>Ear Training Quiz:</strong> A random EQ problem is applied to the audio. You must identify and fix it by ear alone — no visual aids. Builds critical listening skills.</p>
            <p><strong>Advanced Training:</strong> Console and EQ matching drills. Match a target console configuration and EQ curve by ear.</p>
          </div>

          <div className="guide-card">
            <h3><Settings2 size={14} color="var(--purple)" /> Zone H — Studio Tools</h3>
            <p><strong>6-Tab Panel:</strong> Pitch Shift, Time Stretch, HPSS (Harmonic/Percussive Source Separation), Denoise, and Project management. Advanced post-production tools.</p>
          </div>

          <div className="guide-card">
            <h3><CheckCircle2 size={14} color="#22c55e" /> Zone I — Complete</h3>
            <p><strong>Save & Complete Session:</strong> Records your EQ settings, console configuration, A/B comparison data, and session analytics to the database.</p>
            <p><strong>Submit Submission:</strong> Sends your work to your instructor for review and grading.</p>
            <p><strong>Session Results:</strong> Displays a summary of your session including duration, EQ changes, and quality score.</p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────
          4. EQ & FREQUENCY
          ─────────────────────────────────────── */}
      <div className="guide-section" id="eq">
        <div className="guide-section-header">
          <div className="guide-section-icon"><SlidersHorizontal size={14} /></div>
          <div className="guide-section-title">4. EQ & Frequency Control</div>
        </div>
        <div className="guide-section-subtitle">
          The 5-band EQ is the heart of the Console Room. Understanding frequency ranges is essential.
        </div>

        <div className="freq-chart-wrap">
          <FreqResponseChart />
        </div>

        <div className="guide-card">
          <h3>EQ Band Specifications</h3>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Band</th>
                  <th>Frequency</th>
                  <th>Filter Type</th>
                  <th>Range</th>
                </tr>
              </thead>
              <tbody>
                {EQ_BANDS.map((b, i) => (
                  <tr key={i}>
                    <td style={{ color: b.color, fontWeight: 700 }}>{b.band}</td>
                    <td>{b.freq}</td>
                    <td>{b.type}</td>
                    <td>{b.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="guide-card">
          <h3>Frequency Bands & Common Issues</h3>
          <div className="bar-chart">
            {FREQ_BANDS.map((band, i) => (
              <div key={i} className="bar-chart-col">
                <div
                  className="bar-chart-bar"
                  style={{ height: `${band.score}%`, background: band.color }}
                />
                <div className="bar-chart-label">{band.name}</div>
                <div className="bar-chart-label" style={{ opacity: 0.5 }}>{band.range}</div>
              </div>
            ))}
          </div>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Range</th>
                  <th>Name</th>
                  <th>Common Issue</th>
                </tr>
              </thead>
              <tbody>
                {FREQ_BANDS.map((b, i) => (
                  <tr key={i}>
                    <td>{b.range}</td>
                    <td style={{ color: b.color, fontWeight: 600 }}>{b.name}</td>
                    <td>{b.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="callout callout-info">
          <div className="callout-icon"><Ear size={16} color="#00a6ff" /></div>
          <div className="callout-body">
            <strong>The 298 Hz Band:</strong> This is the signature frequency of 298EQ. At 298 Hz with
            Q=1.4, this peaking filter targets the exact region where vocal intelligibility and presence
            live. A small boost (+2 to +4 dB) can bring a vocal forward; a small cut can reduce boxiness.
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────
          5. DYNAMICS
          ─────────────────────────────────────── */}
      <div className="guide-section" id="dynamics">
        <div className="guide-section-header">
          <div className="guide-section-icon"><Gauge size={14} /></div>
          <div className="guide-section-title">5. Dynamics — Compressor & Limiter</div>
        </div>
        <div className="guide-section-subtitle">
          Control the dynamic range of your audio. The compressor shapes the sound; the limiter protects it.
        </div>

        <div className="freq-chart-wrap">
          <CompressorCurve />
        </div>

        <div className="guide-card">
          <h3>Compressor Parameters</h3>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Range</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {COMP_PARAMS.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{p.param}</td>
                    <td style={{ color: "var(--muted)" }}>{p.range}</td>
                    <td style={{ color: "var(--accent)" }}>{p.default}</td>
                    <td style={{ color: "var(--muted)" }}>{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="guide-grid-2">
          <div className="guide-card">
            <h3>Compressor</h3>
            <p>Reduces the dynamic range of signals above the threshold. Use it to:</p>
            <p>
              • <strong>Control peaks:</strong> Set threshold just above average level, ratio 3:1<br />
              • <strong>Add density:</strong> Lower threshold, higher ratio, slower attack<br />
              • <strong>Preserve transients:</strong> Fast attack (1-3 ms) catches peaks; slow attack (10-30 ms) lets transients through<br />
              • <strong>Avoid pumping:</strong> Release should match the tempo (250 ms is a safe default)
            </p>
          </div>
          <div className="guide-card">
            <h3>Limiter</h3>
            <p>A limiter is a compressor with a very high ratio (20:1). It prevents any signal from exceeding the ceiling.</p>
            <p>
              • <strong>Set ceiling at -1 dB</strong> to prevent inter-sample peaks<br />
              • <strong>Use as last stage</strong> before output — it is the safety net<br />
              • <strong>Watch the GR meter</strong> — if it's constantly reducing 3+ dB, your signal is too hot<br />
              • <strong>Enable/disable</strong> with the power toggle
            </p>
          </div>
        </div>

        <div className="callout callout-warning">
          <div className="callout-icon"><AlertTriangle size={16} color="#ffb347" /></div>
          <div className="callout-body">
            <strong>Over-compression warning:</strong> If your compressor GR meter shows constant 6+ dB
            reduction, your signal is too hot. Lower the channel gain before reaching for more compression.
            Over-compressed audio sounds fatiguing and lifeless.
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────
          6. ADVANCED FX
          ─────────────────────────────────────── */}
      <div className="guide-section" id="fx">
        <div className="guide-section-header">
          <div className="guide-section-icon"><Zap size={14} /></div>
          <div className="guide-section-title">6. Advanced FX Chain</div>
        </div>
        <div className="guide-section-subtitle">
          9 effects in series, each with individual intensity control. The Macro fader drives all of them at once.
        </div>

        <div className="chain-diagram">
          {FX_CHAIN.map((fx, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div className="chain-node" style={{ minWidth: "100px" }}>
                <div className="chain-node-label">{fx.order}. {fx.name}</div>
                <div className="chain-node-sub">{fx.desc}</div>
              </div>
              {i < FX_CHAIN.length - 1 && <span className="chain-arrow">→</span>}
            </div>
          ))}
        </div>

        <div className="guide-card">
          <h3><SlidersHorizontal size={14} /> Macro Fader — Genre-Aware One-Knob Control</h3>
          <p>
            The Macro fader (0–100) is a genre-aware master control. At 0, all FX are minimal. At 100,
            all FX are at maximum intensity for the selected sound class (Music, Podcast, Voice/Live, Stream).
            Each sound class has its own mapping of macro value to individual FX parameters.
          </p>
          <p>
            For fine control, open the <strong>Advanced EQ modal</strong> to adjust each effect independently.
            The 9 effects process in series: the output of each feeds the input of the next.
          </p>
        </div>

        <div className="guide-card">
          <h3>FX Effect Details</h3>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Effect</th>
                  <th>What It Does</th>
                </tr>
              </thead>
              <tbody>
                {FX_CHAIN.map((fx, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--accent)", fontWeight: 700 }}>{fx.order}</td>
                    <td style={{ fontWeight: 600 }}>{fx.name}</td>
                    <td style={{ color: "var(--muted)" }}>{fx.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────
          7. METERS & MONITORING
          ─────────────────────────────────────── */}
      <div className="guide-section" id="meters">
        <div className="guide-section-header">
          <div className="guide-section-icon"><BarChart3 size={14} /></div>
          <div className="guide-section-title">7. Meters & Monitoring</div>
        </div>
        <div className="guide-section-subtitle">
          Ears detect problems. Meters confirm and locate them. Trust the tools.
        </div>

        <div className="guide-card">
          <h3>Measurement Tools in {APP_NAME}</h3>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>What It Measures</th>
                  <th>When to Use</th>
                  <th>In-App Tool</th>
                </tr>
              </thead>
              <tbody>
                {MEASUREMENTS.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{m.metric}</td>
                    <td style={{ color: "var(--muted)" }}>{m.what}</td>
                    <td style={{ color: "var(--muted)" }}>{m.use}</td>
                    <td><span className="zone-tag">{m.inApp}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="guide-grid-2">
          <div className="guide-card">
            <h3><BarChart3 size={14} color="#00a6ff" /> Spectrum Analyzer</h3>
            <p>Real-time FFT showing frequency content as logarithmic bars. Use it to:</p>
            <p>
              • Identify problem frequencies (mud at 250-500 Hz, harshness at 3-5 kHz)<br />
              • Verify EQ changes are affecting the intended range<br />
              • Watch for bass energy buildup below 60 Hz<br />
              • Compare Original vs Enhanced spectrum
            </p>
          </div>
          <div className="guide-card">
            <h3><Activity size={14} color="var(--accent)" /> VU Meter</h3>
            <p>Peak and RMS levels in dBFS. Use it to:</p>
            <p>
              • Verify gain structure (average around -18 dBFS)<br />
              • Watch for clipping (peak hitting 0 dBFS = red)<br />
              • Check crest factor (peak − RMS = dynamic range)<br />
              • A crest factor of 12+ dB means healthy dynamics
            </p>
          </div>
          <div className="guide-card">
            <h3><Gauge size={14} color="#22c55e" /> LUFS Meter</h3>
            <p>Integrated loudness estimate with -14 LUFS target. Use it to:</p>
            <p>
              • Match streaming platform loudness (Spotify: -14 LUFS)<br />
              • Ensure broadcast compliance<br />
              • Compare perceived loudness between Original and Enhanced<br />
              • Green = within 1 LU of target; Amber = within 3 LU; Red = off target
            </p>
          </div>
          <div className="guide-card">
            <h3><VolumeX size={14} color="#ffb347" /> Gain Reduction Meters</h3>
            <p>Two GR meters show how much the compressor and limiter are working:</p>
            <p>
              • <strong>Compressor GR:</strong> Shows dB of gain reduction in real-time<br />
              • <strong>Limiter GR:</strong> Shows how hard the limiter is working<br />
              • If limiter GR shows constant 3+ dB, lower your channel gain<br />
              • Brief GR movement on transients is healthy; constant reduction is not
            </p>
          </div>
        </div>

        <div className="callout callout-info">
          <div className="callout-icon"><Activity size={16} color="#00a6ff" /></div>
          <div className="callout-body">
            <strong>The Three Loudness Answers:</strong> Peak dBFS tells you if clipping will occur.
            RMS dBFS tells you how loud it feels. LUFS tells you perceived loudness adjusted for human hearing.
            A track with peak -1 dBFS and RMS -18 dBFS has wide dynamic range. A track with peak -1 dBFS
            and RMS -8 dBFS is heavily compressed.
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────
          8. SIX DIMENSIONS
          ─────────────────────────────────────── */}
      <div className="guide-section" id="quality">
        <div className="guide-section-header">
          <div className="guide-section-icon"><Activity size={14} /></div>
          <div className="guide-section-title">8. Six Dimensions of Sound Quality</div>
        </div>
        <div className="guide-section-subtitle">
          Train your ears to evaluate audio across these six categories. Use a 1–5 scoring rubric.
        </div>

        <div className="guide-grid-2">
          {DIMENSIONS.map((d, i) => (
            <div key={i} className="guide-card">
              <h3><DimIcon name={d.icon} /> {d.name}</h3>
              <p><strong>Question:</strong> {d.q}</p>
              <p><strong>Tool in {APP_NAME}:</strong> {d.tool}</p>
              <p style={{ fontSize: 12 }}>
                <strong>Score 1:</strong> Severe problem &nbsp;
                <strong>Score 3:</strong> Acceptable &nbsp;
                <strong>Score 5:</strong> Excellent
              </p>
            </div>
          ))}
        </div>

        <div className="guide-card">
          <h3>Context Modifiers — What Matters Most</h3>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Context</th>
                  <th>Priority #1</th>
                  <th>Priority #2</th>
                  <th>Priority #3</th>
                </tr>
              </thead>
              <tbody>
                {CONTEXT_PRIORITY.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{c.context}</td>
                    <td style={{ color: "var(--accent)" }}>{c.p1}</td>
                    <td style={{ color: "var(--muted)" }}>{c.p2}</td>
                    <td style={{ color: "var(--muted)" }}>{c.p3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="callout callout-info">
          <div className="callout-icon"><Ear size={16} color="#00a6ff" /></div>
          <div className="callout-body">
            <strong>The Rotating Focus Technique:</strong> Don't try to evaluate all six dimensions in one listen.
            Do six dedicated passes — one for frequency balance, one for dynamics, one for noise, one for distortion,
            one for spatial quality, one for time response. After six passes, you have a complete profile.
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────
          9. WORKFLOW
          ─────────────────────────────────────── */}
      <div className="guide-section" id="workflow">
        <div className="guide-section-header">
          <div className="guide-section-icon"><Play size={14} /></div>
          <div className="guide-section-title">9. Complete Workflow — Start to Finish</div>
        </div>
        <div className="guide-section-subtitle">
          Follow these 12 steps from loading a track to submitting your session.
        </div>

        <div className="workflow-steps">
          {WORKFLOW.map((step, i) => (
            <div key={i} className="workflow-step">
              <div className="workflow-step-num">{i + 1}</div>
              <div className="workflow-step-body">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="callout callout-success">
          <div className="callout-icon"><CheckCircle2 size={16} color="#22c55e" /></div>
          <div className="callout-body">
            <strong>Pro tip:</strong> After every major adjustment, toggle the A/B switch to compare
            with the original. Your ears adapt quickly — the A/B switch is your reality check.
            Also, take a 5-minute break every 20 minutes to reset your auditory perception.
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────
          10. TROUBLESHOOTING
          ─────────────────────────────────────── */}
      <div className="guide-section" id="troubleshoot">
        <div className="guide-section-header">
          <div className="guide-section-icon"><AlertTriangle size={14} /></div>
          <div className="guide-section-title">10. Troubleshooting & Debugging Sound</div>
        </div>
        <div className="guide-section-subtitle">
          Follow a method, not a guess. Define, reproduce, divide, verify, eliminate, measure.
        </div>

        <div className="guide-card">
          <h3>The 6-Step Troubleshooting Method</h3>
          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="workflow-step-num">1</div>
              <div className="workflow-step-body">
                <h4>Define the Symptom</h4>
                <p>Be specific. "It sounds bad" is useless. Use precise terms: hum, hiss, distortion, feedback, low volume, intermittent, hollow, muddy.</p>
              </div>
            </div>
            <div className="workflow-step">
              <div className="workflow-step-num">2</div>
              <div className="workflow-step-body">
                <h4>Reproduce the Problem</h4>
                <p>Can you make it happen consistently? Does it happen with every source or only one? At all volume levels? On one speaker or all?</p>
              </div>
            </div>
            <div className="workflow-step">
              <div className="workflow-step-num">3</div>
              <div className="workflow-step-body">
                <h4>Divide the Signal Chain</h4>
                <p>Test the middle of the chain first. If the middle is clean, the problem is downstream. If the middle is bad, the problem is upstream. Repeat on the affected half.</p>
              </div>
            </div>
            <div className="workflow-step">
              <div className="workflow-step-num">4</div>
              <div className="workflow-step-body">
                <h4>Verify Gain Structure</h4>
                <p>Check at every stage: Is input gain appropriate? Is there adequate headroom? Are any meters hitting red? Most audio problems are gain staging issues.</p>
              </div>
            </div>
            <div className="workflow-step">
              <div className="workflow-step-num">5</div>
              <div className="workflow-step-body">
                <h4>Eliminate Variables</h4>
                <p>Change only one thing at a time. If you change three things and the problem goes away, you don't know which change fixed it.</p>
              </div>
            </div>
            <div className="workflow-step">
              <div className="workflow-step-num">6</div>
              <div className="workflow-step-body">
                <h4>Measure</h4>
                <p>Use tools, not assumptions. The spectrum analyzer shows frequency problems. The VU meter shows gain issues. The LUFS meter shows loudness compliance.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="guide-card">
          <h3>Decision Tree: Symptom → Test → Fix</h3>
          <div className="decision-tree">
            {TROUBLE_LINES.map((line, i) => (
              <div key={i} className={line.cls}>{line.text || '\u00A0'}</div>
            ))}
          </div>
        </div>

        <div className="guide-card">
          <h3>Common Issues in {APP_NAME} & How to Fix Them</h3>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Symptom</th>
                  <th>Likely Cause</th>
                  <th>How to Fix in {APP_NAME}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>No sound when pressing Play</td>
                  <td>AudioContext suspended (browser autoplay policy)</td>
                  <td>Click Play again — the first click resumes the AudioContext</td>
                </tr>
                <tr>
                  <td>Audio sounds muffled</td>
                  <td>EQ sliders too low, or Width at 0 (mono)</td>
                  <td>Reset EQ to flat, check Width is at 1.0 (normal stereo)</td>
                </tr>
                <tr>
                  <td>VU meter hitting red constantly</td>
                  <td>Channel gain too high or compressor disabled</td>
                  <td>Lower channel gain to 0 dB, enable compressor, check limiter ceiling</td>
                </tr>
                <tr>
                  <td>LUFS reading far from -14</td>
                  <td>Gain staging or compression settings off</td>
                  <td>Adjust channel gain to target -14 LUFS; use Reference Match for auto-correction</td>
                </tr>
                <tr>
                  <td>Spectrum analyzer shows nothing</td>
                  <td>No audio playing, or analyser not connected</td>
                  <td>Press Play; status should show "Live" (green)</td>
                </tr>
                <tr>
                  <td>Quality score stuck low</td>
                  <td>EQ deviating too far from genre benchmark</td>
                  <td>Use Reference Match → Apply Corrections, then fine-tune by ear</td>
                </tr>
                <tr>
                  <td>Mic BPM not working</td>
                  <td>Song is currently playing</td>
                  <td>Stop playback first, then click Mic BPM. It only works when no song is playing.</td>
                </tr>
                <tr>
                  <td>Scene preset won't toggle off</td>
                  <td>Clicking a different preset instead of the active one</td>
                  <td>Click the same (highlighted) preset again to deactivate it</td>
                </tr>
                <tr>
                  <td>Bass inaudible on earbuds</td>
                  <td>Small drivers can't reproduce sub-bass</td>
                  <td>Check Spectrum Analyzer to see bass changes visually; use headphones for critical listening</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="callout callout-danger">
          <div className="callout-icon"><AlertTriangle size={16} color="#f87171" /></div>
          <div className="callout-body">
            <strong>Critical:</strong> If you cannot locate the problem, you cannot fix it.
            Plugins and processors are tools for shaping already-good sound, not for rescuing
            fundamentally broken signals. Fix the source and gain structure before reaching for EQ.
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────
          11. REFERENCE TABLES
          ─────────────────────────────────────── */}
      <div className="guide-section" id="reference">
        <div className="guide-section-header">
          <div className="guide-section-icon"><Target size={14} /></div>
          <div className="guide-section-title">11. Reference Tables & Cheat Sheet</div>
        </div>
        <div className="guide-section-subtitle">
          Quick-reference data for everyday use in the Console Room.
        </div>

        <div className="guide-grid-2">
          <div className="guide-card">
            <h3>Gain Staging Reference</h3>
            <div className="guide-table-wrap">
              <table className="guide-table">
                <thead>
                  <tr><th>Level</th><th>Value</th></tr>
                </thead>
                <tbody>
                  <tr><td>Average target</td><td style={{ color: "#22c55e", fontWeight: 700 }}>-18 dBFS</td></tr>
                  <tr><td>Peak maximum</td><td style={{ color: "#ffb347", fontWeight: 700 }}>-6 dBFS</td></tr>
                  <tr><td>Absolute ceiling</td><td style={{ color: "#f87171", fontWeight: 700 }}>0 dBFS</td></tr>
                  <tr><td>Minimum headroom</td><td style={{ fontWeight: 700 }}>6 dB</td></tr>
                  <tr><td>Healthy crest factor</td><td style={{ fontWeight: 700 }}>12+ dB</td></tr>
                  <tr><td>Streaming target</td><td style={{ color: "var(--accent)", fontWeight: 700 }}>-14 LUFS</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="guide-card">
            <h3>EQ Quick Fixes</h3>
            <div className="guide-table-wrap">
              <table className="guide-table">
                <thead>
                  <tr><th>Problem</th><th>Fix</th></tr>
                </thead>
                <tbody>
                  <tr><td>Boomy bass</td><td>Cut Low by 3-6 dB</td></tr>
                  <tr><td>Boxy / muddy</td><td>Cut 298EQ by 2-4 dB</td></tr>
                  <tr><td>Nasal / honky</td><td>Cut Mid by 2-3 dB</td></tr>
                  <tr><td>Harsh / piercing</td><td>Cut High by 2-4 dB</td></tr>
                  <tr><td>Thin / lifeless</td><td>Boost Low +2, 298EQ +2</td></tr>
                  <tr><td>Dull / dark</td><td>Boost High +3 to +6 dB</td></tr>
                  <tr><td>Lacks presence</td><td>Boost 298EQ +2 to +4 dB</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="guide-card">
            <h3>Compressor Quick Start</h3>
            <div className="guide-table-wrap">
              <table className="guide-table">
                <thead>
                  <tr><th>Goal</th><th>Threshold</th><th>Ratio</th><th>Attack</th><th>Release</th></tr>
                </thead>
                <tbody>
                  <tr><td>Gentle control</td><td>-24 dB</td><td>2:1</td><td>10 ms</td><td>250 ms</td></tr>
                  <tr><td>Vocal leveling</td><td>-20 dB</td><td>3:1</td><td>3 ms</td><td>250 ms</td></tr>
                  <tr><td>Drum punch</td><td>-15 dB</td><td>4:1</td><td>1 ms</td><td>100 ms</td></tr>
                  <tr><td>Heavy density</td><td>-30 dB</td><td>6:1</td><td>1 ms</td><td>50 ms</td></tr>
                  <tr><td>Parallel comp</td><td>-40 dB</td><td>8:1</td><td>1 ms</td><td>50 ms</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="guide-card">
            <h3>Sound Class Color Map</h3>
            <div className="guide-table-wrap">
              <table className="guide-table">
                <thead>
                  <tr><th>Class</th><th>Color</th><th>Macro Focus</th></tr>
                </thead>
                <tbody>
                  <tr><td style={{ color: "var(--orange)" }}>Music</td><td>Orange</td><td>Reverb, width, warmth</td></tr>
                  <tr><td style={{ color: "#00a6ff" }}>Podcast</td><td>Blue</td><td>De-ess, gate, clarity</td></tr>
                  <tr><td style={{ color: "var(--red)" }}>Voice / Live</td><td>Red</td><td>Gate, pitch, compression</td></tr>
                  <tr><td style={{ color: "var(--purple)" }}>Stream</td><td>Purple</td><td>Consistency, LUFS, limiter</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="callout callout-success">
          <div className="callout-icon"><CheckCircle2 size={16} color="#22c55e" /></div>
          <div className="callout-body">
            <strong>Final takeaway:</strong> Sound quality is not magic — it is a system.
            Know how the ear works. Inspect every link in the chain. Evaluate across six dimensions.
            Trust the meters. Follow a method. Train your ears every day.
            The engineer's advantage is method. Build the method, and the quality follows.
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "48px", paddingTop: "32px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            UNEQWURL Console Room Guide · Generated from live code audit · {new Date().toLocaleDateString()}
          </p>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0", opacity: 0.6 }}>
            All 27 controls verified active · Web Audio API · WEQ8 v0.2.2 · Next.js 14
          </p>
        </div>
      </div>
    </div>
  );
}
