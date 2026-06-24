"use client";

import { useRef, useState, useEffect } from "react";

interface NoiseInjectionProps {
  audioContext: AudioContext | null;
  destinationNode: AudioNode | null;
  analyser?: AnalyserNode | null;
}

type NoiseType = "hiss" | "hum" | "rumble";

const NOISE_CONFIG: Record<NoiseType, { label: string; color: string; description: string }> = {
  hiss: { label: "Hiss", color: "#eab308", description: "Broadband high-frequency noise" },
  hum: { label: "Hum", color: "#f97316", description: "60 Hz electrical ground loop" },
  rumble: { label: "Rumble", color: "#ef4444", description: "Low-frequency HVAC / stage noise" },
};

export default function NoiseInjection({ audioContext, destinationNode, analyser }: NoiseInjectionProps) {
  const [activeNoise, setActiveNoise] = useState<Set<NoiseType>>(new Set());
  const [levels, setLevels] = useState<Record<NoiseType, number>>({ hiss: 0.06, hum: 0.10, rumble: 0.15 });
  const nodesRef = useRef<Record<NoiseType, { osc?: OscillatorNode; noise?: AudioBufferSourceNode; gain: GainNode } | null>>({
    hiss: null,
    hum: null,
    rumble: null,
  });
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    for (const type of Object.keys(nodesRef.current) as NoiseType[]) {
      const entry = nodesRef.current[type];
      if (entry) {
        try { entry.osc?.stop(); } catch { /* */ }
        try { entry.noise?.stop(); } catch { /* */ }
        entry.osc?.disconnect();
        entry.noise?.disconnect();
        entry.gain.disconnect();
      }
    }
    nodesRef.current = { hiss: null, hum: null, rumble: null };
    setActiveNoise(new Set());
  };

  const createNoiseBuffer = (ctx: AudioContext, type: NoiseType): AudioBuffer => {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === "hiss") {
      // White noise, slightly high-passed
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
    } else if (type === "rumble") {
      // Low-frequency noise (filtered random)
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) * 0.98;
        data[i] = last * 3;
      }
    }
    return buffer;
  };

  const startNoise = async (type: NoiseType) => {
    let ctx = audioContext || ctxRef.current;
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctxRef.current = ctx;
    }
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const dest = destinationNode || ctx.destination;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(levels[type], ctx.currentTime);
    gain.connect(dest);
    if (analyser) {
      gain.connect(analyser);
    }

    if (type === "hum") {
      // 60 Hz sine wave + harmonics
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      nodesRef.current[type] = { osc, gain };
    } else {
      // hiss or rumble: noise buffer
      const buffer = createNoiseBuffer(ctx, type);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      nodesRef.current[type] = { noise: source, gain };
    }

    setActiveNoise((prev) => new Set(prev).add(type));
  };

  const stopNoise = (type: NoiseType) => {
    const entry = nodesRef.current[type];
    if (entry) {
      try { entry.osc?.stop(); } catch { /* */ }
      try { entry.noise?.stop(); } catch { /* */ }
      entry.osc?.disconnect();
      entry.noise?.disconnect();
      entry.gain.disconnect();
      nodesRef.current[type] = null;
    }
    setActiveNoise((prev) => {
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
  };

  const toggleNoise = (type: NoiseType) => {
    if (activeNoise.has(type)) {
      stopNoise(type);
    } else {
      startNoise(type);
    }
  };

  const handleLevelChange = (type: NoiseType, value: number) => {
    setLevels((prev) => ({ ...prev, [type]: value }));
    const entry = nodesRef.current[type];
    if (entry && audioContext) {
      entry.gain.gain.setValueAtTime(value, audioContext.currentTime);
    }
  };

  return (
    <div className="noise-injection-container">
      <div className="section-label" style={{ margin: 0, marginBottom: "8px" }}>Noise Injection Demo</div>
      <p className="noise-injection-hint">Add noise to hear what it sounds like. Practice identifying noise types.</p>
      <div className="noise-injection-grid">
        {(Object.keys(NOISE_CONFIG) as NoiseType[]).map((type) => {
          const cfg = NOISE_CONFIG[type];
          const isActive = activeNoise.has(type);
          return (
            <div key={type} className={`noise-injection-item${isActive ? " active" : ""}`}>
              <button
                type="button"
                onClick={() => toggleNoise(type)}
                className={`noise-injection-toggle${isActive ? " active" : ""}`}
                style={isActive ? { borderColor: cfg.color, background: `${cfg.color}22` } : {}}
              >
                <span className="noise-injection-dot" style={{ background: isActive ? cfg.color : "var(--muted)" }} />
                {cfg.label}
              </button>
              <span className="noise-injection-desc">{cfg.description}</span>
              {isActive && (
                <input
                  type="range"
                  min={0}
                  max={0.2}
                  step={0.005}
                  value={levels[type]}
                  onChange={(e) => handleLevelChange(type, Number(e.target.value))}
                  className="noise-injection-slider"
                  style={{ accentColor: cfg.color }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
