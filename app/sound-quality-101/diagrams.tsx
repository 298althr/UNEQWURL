export function EarBiasDiagram() {
  return (
    <svg viewBox="0 0 600 180" className="sq-diagram" aria-label="Ears are biased, so measure first">
      <circle cx="80" cy="90" r="50" fill="rgba(101, 0, 255, 0.12)" stroke="var(--accent)" strokeWidth="2" />
      <text x="80" y="85" textAnchor="middle" fill="var(--accent)" fontSize="14" fontWeight="700">EARS</text>
      <text x="80" y="105" textAnchor="middle" fill="var(--muted)" fontSize="11">biased</text>

      <path d="M140 90 L200 90" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#arrow)" />

      <rect x="220" y="50" width="120" height="80" rx="12" fill="rgba(0, 166, 255, 0.12)" stroke="#00a6ff" strokeWidth="2" />
      <text x="280" y="85" textAnchor="middle" fill="#00a6ff" fontSize="14" fontWeight="700">METERS</text>
      <text x="280" y="105" textAnchor="middle" fill="var(--muted)" fontSize="11">objective</text>

      <path d="M350 90 L410 90" stroke="#00a6ff" strokeWidth="2" markerEnd="url(#arrow)" />

      <rect x="430" y="50" width="120" height="80" rx="12" fill="rgba(34, 197, 94, 0.12)" stroke="#22c55e" strokeWidth="2" />
      <text x="490" y="85" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="700">DECIDE</text>
      <text x="490" y="105" textAnchor="middle" fill="var(--muted)" fontSize="11">fix the cause</text>

      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="var(--accent)" />
        </marker>
      </defs>
    </svg>
  );
}

export function FaultCategorySignalChain() {
  const steps = [
    { label: "Source", sub: "Mic / Instrument" },
    { label: "Cable", sub: "Fault 1" },
    { label: "Mixer", sub: "EQ / FX" },
    { label: "Amp", sub: "Fault 7" },
    { label: "Speaker", sub: "Position 4" },
    { label: "Room", sub: "Acoustics 3" },
  ];
  return (
    <svg viewBox="0 0 700 160" className="sq-diagram" aria-label="Signal chain showing where each fault category can appear">
      {steps.map((s, i) => {
        const x = 60 + i * 110;
        return (
          <g key={s.label}>
            <rect x={x} y="40" width="90" height="70" rx="10" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
            <text x={x + 45} y="70" textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="700">{s.label}</text>
            <text x={x + 45} y="90" textAnchor="middle" fill="var(--muted)" fontSize="10">{s.sub}</text>
            {i < steps.length - 1 && <path d={`M${x + 92} 75 L${x + 108} 75`} stroke="var(--accent)" strokeWidth="2" markerEnd="url(#chainArrow)" />}
          </g>
        );
      })}
      <defs>
        <marker id="chainArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L7,3 z" fill="var(--accent)" />
        </marker>
      </defs>
    </svg>
  );
}

export function MeterDashboard() {
  const gauges = [
    { label: "Peak", color: "#ef4444", value: 0.75, target: "<0 dB" },
    { label: "RMS", color: "#22c55e", value: 0.55, target: "Full" },
    { label: "LUFS", color: "#a855f7", value: 0.6, target: "-14" },
    { label: "SPL", color: "#f59e0b", value: 0.7, target: "82-95 dB" },
  ];
  return (
    <svg viewBox="0 0 600 180" className="sq-diagram" aria-label="Four key meters: peak, RMS, LUFS, and SPL">
      {gauges.map((g, i) => {
        const x = 70 + i * 140;
        return (
          <g key={g.label}>
            <path d={`M${x} 130 A 50 50 0 0 1 ${x + 100} 130`} fill="none" stroke="var(--track-border)" strokeWidth="10" strokeLinecap="round" />
            <path d={`M${x} 130 A 50 50 0 0 1 ${x + 100 * g.value} 130`} fill="none" stroke={g.color} strokeWidth="10" strokeLinecap="round" />
            <line x1={x + 50} y1="130" x2={x + 50 - 40 * Math.cos(Math.PI * g.value)} y2={130 - 40 * Math.sin(Math.PI * g.value)} stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
            <circle cx={x + 50} cy="130" r="4" fill="var(--text)" />
            <text x={x + 50} y="155" textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="700">{g.label}</text>
            <text x={x + 50} y="170" textAnchor="middle" fill="var(--muted)" fontSize="10">{g.target}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function RoomAcousticsDiagram() {
  return (
    <svg viewBox="0 0 600 260" className="sq-diagram" aria-label="Room diagram showing speaker placement, audience, and reflective surfaces">
      <rect x="50" y="40" width="500" height="180" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <text x="300" y="25" textAnchor="middle" fill="var(--accent)" fontSize="14" fontWeight="700">ROOM</text>

      {/* Speakers */}
      <rect x="80" y="180" width="40" height="25" rx="4" fill="#00a6ff" />
      <text x="100" y="198" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">SPK</text>
      <rect x="480" y="180" width="40" height="25" rx="4" fill="#00a6ff" />
      <text x="500" y="198" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">SPK</text>

      {/* Microphone */}
      <circle cx="300" cy="130" r="18" fill="#ff0056" />
      <text x="300" y="135" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">MIC</text>

      {/* Audience */}
      <g fill="var(--accent)">
        <circle cx="220" cy="200" r="8" />
        <circle cx="245" cy="200" r="8" />
        <circle cx="270" cy="200" r="8" />
        <circle cx="330" cy="200" r="8" />
        <circle cx="355" cy="200" r="8" />
        <circle cx="380" cy="200" r="8" />
      </g>
      <text x="300" y="230" textAnchor="middle" fill="var(--muted)" fontSize="11">Audience absorbs highs and tightens bass</text>

      {/* Hard wall reflection */}
      <path d="M550 60 L550 200" stroke="#ef4444" strokeWidth="3" strokeDasharray="6 4" />
      <text x="560" y="140" fill="#ef4444" fontSize="11" fontWeight="700">Hard wall</text>

      {/* Soft curtain absorption */}
      <path d="M50 60 L50 200" stroke="#22c55e" strokeWidth="3" strokeDasharray="6 4" />
      <text x="10" y="140" fill="#22c55e" fontSize="11" fontWeight="700">Curtain</text>

      {/* Sound path */}
      <path d="M120 180 Q220 130 300 130" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
      <path d="M500 180 Q400 130 300 130" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
    </svg>
  );
}

export function DriftTimeline() {
  const events = [
    { label: "Warm up", sub: "Amps & speakers" },
    { label: "Crowd grows", sub: "Absorbs highs" },
    { label: "Battery drops", sub: "Wireless noise" },
    { label: "Mic moves", sub: "Level changes" },
    { label: "Verify", sub: "Check meters" },
  ];
  return (
    <svg viewBox="0 0 600 180" className="sq-diagram" aria-label="Timeline showing how a system drifts during a show and when to verify">
      <line x1="40" y1="90" x2="560" y2="90" stroke="var(--accent)" strokeWidth="3" />
      {events.map((e, i) => {
        const x = 60 + i * 120;
        return (
          <g key={e.label}>
            <circle cx={x} cy="90" r="8" fill={i === events.length - 1 ? "#22c55e" : "var(--accent)"} />
            <rect x={x - 50} y="120" width="100" height="45" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
            <text x={x} y="140" textAnchor="middle" fill="var(--text)" fontSize="11" fontWeight="700">{e.label}</text>
            <text x={x} y="156" textAnchor="middle" fill="var(--muted)" fontSize="9">{e.sub}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function HalfSplitDiagram() {
  return (
    <svg viewBox="0 0 600 220" className="sq-diagram" aria-label="Half-split troubleshooting method: test the middle of the signal chain">
      <rect x="30" y="90" width="100" height="50" rx="10" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
      <text x="80" y="118" textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="700">SOURCE</text>

      <line x1="130" y1="115" x2="220" y2="115" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#splitArrow)" />

      <rect x="230" y="90" width="140" height="50" rx="10" fill="rgba(255, 183, 0, 0.15)" stroke="var(--gold)" strokeWidth="2" />
      <text x="300" y="113" textAnchor="middle" fill="var(--gold)" fontSize="12" fontWeight="700">TEST MIDDLE</text>
      <text x="300" y="128" textAnchor="middle" fill="var(--muted)" fontSize="9">Mixer output</text>

      <line x1="370" y1="115" x2="460" y2="115" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#splitArrow)" />

      <rect x="470" y="90" width="100" height="50" rx="10" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
      <text x="520" y="118" textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="700">OUTPUT</text>

      <path d="M300 155 L300 180" stroke="var(--gold)" strokeWidth="2" markerEnd="url(#splitArrowDown)" />
      <text x="300" y="200" textAnchor="middle" fill="var(--gold)" fontSize="11" fontWeight="700">One test eliminates half the chain</text>

      <rect x="90" y="30" width="180" height="40" rx="8" fill="rgba(239, 68, 68, 0.12)" stroke="#ef4444" strokeWidth="1" />
      <text x="180" y="48" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="700">If mixer output is BAD</text>
      <text x="180" y="62" textAnchor="middle" fill="var(--muted)" fontSize="9">problem is BEFORE the mixer</text>

      <rect x="330" y="30" width="180" height="40" rx="8" fill="rgba(34, 197, 94, 0.12)" stroke="#22c55e" strokeWidth="1" />
      <text x="420" y="48" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="700">If mixer output is CLEAN</text>
      <text x="420" y="62" textAnchor="middle" fill="var(--muted)" fontSize="9">problem is AFTER the mixer</text>

      <defs>
        <marker id="splitArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L7,3 z" fill="var(--accent)" />
        </marker>
        <marker id="splitArrowDown" markerWidth="8" markerHeight="8" refX="3" refY="7" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L6,0 L3,7 z" fill="var(--gold)" />
        </marker>
      </defs>
    </svg>
  );
}

export function GoodSoundSpectrum() {
  const checks = [
    "Intelligible",
    "Balanced",
    "No feedback",
    "No hum",
    "No clipping",
    "Comfortable",
    "Faithful",
  ];
  return (
    <svg viewBox="0 0 600 240" className="sq-diagram" aria-label="Balanced sound spectrum and checklist of good sound qualities">
      <text x="300" y="25" textAnchor="middle" fill="var(--accent)" fontSize="14" fontWeight="700">Balanced sound spectrum</text>

      {/* Spectrum bars: low, mid, high */}
      <rect x="80" y="140" width="120" height="60" rx="8" fill="#00a6ff" opacity="0.85" />
      <text x="140" y="175" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">LOW</text>
      <text x="140" y="190" textAnchor="middle" fill="#ffffff" fontSize="9">Bass</text>

      <rect x="240" y="120" width="120" height="80" rx="8" fill="var(--accent)" opacity="0.9" />
      <text x="300" y="160" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">MID</text>
      <text x="300" y="175" textAnchor="middle" fill="#ffffff" fontSize="9">Vocals / Body</text>

      <rect x="400" y="130" width="120" height="70" rx="8" fill="#f59e0b" opacity="0.85" />
      <text x="460" y="165" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">HIGH</text>
      <text x="460" y="180" textAnchor="middle" fill="#ffffff" fontSize="9">Clarity</text>

      <line x1="50" y1="200" x2="550" y2="200" stroke="var(--border)" strokeWidth="2" />

      {/* Checklist */}
      <text x="300" y="225" textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="700">Good sound checklist</text>
      {checks.map((label, i) => {
        const cx = 55 + (i % 4) * 140 + 10;
        const cy = 245 + Math.floor(i / 4) * 22;
        return (
          <g key={label}>
            <circle cx={cx} cy={cy} r="6" fill="#22c55e" />
            <text x={cx} y={cy + 1} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="700">✓</text>
            <text x={cx + 12} y={cy + 3} fill="var(--muted)" fontSize="10">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}
