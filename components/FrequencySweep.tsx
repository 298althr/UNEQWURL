"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Square } from "lucide-react";

interface FrequencySweepProps {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
}

export default function FrequencySweep({ audioContext, analyser }: FrequencySweepProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFreq, setCurrentFreq] = useState(20);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);

  const DURATION = 15;
  const START_FREQ = 20;
  const END_FREQ = 20000;

  useEffect(() => {
    return () => {
      stopSweep();
    };
  }, []);

  const stopSweep = () => {
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch { /* already stopped */ }
      oscRef.current.disconnect();
      oscRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setIsPlaying(false);
  };

  const startSweep = async () => {
    let ctx = audioContext || ctxRef.current;
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctxRef.current = ctx;
    }
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(START_FREQ, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    osc.connect(gain);
    gain.connect(ctx.destination);
    if (analyser) {
      gain.connect(analyser);
    }

    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;
    startTimeRef.current = ctx.currentTime;
    setIsPlaying(true);

    const updateFreq = () => {
      if (!ctx || !oscRef.current) return;
      const elapsed = ctx.currentTime - startTimeRef.current;
      const t = Math.min(1, elapsed / DURATION);

      // Exponential sweep: 20 → 20000
      const freq = START_FREQ * Math.pow(END_FREQ / START_FREQ, t);
      oscRef.current.frequency.setValueAtTime(freq, ctx.currentTime);
      setCurrentFreq(freq);

      if (t < 1) {
        animRef.current = requestAnimationFrame(updateFreq);
      } else {
        stopSweep();
      }
    };
    animRef.current = requestAnimationFrame(updateFreq);
  };

  const toggle = () => {
    if (isPlaying) {
      stopSweep();
    } else {
      startSweep();
    }
  };

  const formatFreq = (hz: number) => {
    if (hz < 1000) return `${Math.round(hz)} Hz`;
    return `${(hz / 1000).toFixed(2)} kHz`;
  };

  const freqLabel = (hz: number) => {
    if (hz < 60) return "Sub-bass";
    if (hz < 250) return "Bass";
    if (hz < 500) return "Low-mid";
    if (hz < 2000) return "Mid";
    if (hz < 5000) return "Presence";
    if (hz < 10000) return "Brightness";
    return "Air";
  };

  return (
    <div className="freq-sweep-container">
      <div className="section-label" style={{ margin: 0, marginBottom: "8px" }}>Frequency Sweep</div>
      <div className="freq-sweep-controls">
        <button
          type="button"
          onClick={toggle}
          className={`btn ${isPlaying ? "btn-secondary" : "btn-primary"} freq-sweep-btn`}
        >
          {isPlaying ? <Square size={14} /> : <Play size={14} />}
          {isPlaying ? "Stop" : "Play Sweep"}
        </button>
        {isPlaying && (
          <div className="freq-sweep-display">
            <span className="freq-sweep-value">{formatFreq(currentFreq)}</span>
            <span className="freq-sweep-label">{freqLabel(currentFreq)}</span>
          </div>
        )}
      </div>
      {!isPlaying && (
        <p className="freq-sweep-hint">
          Plays a sine tone from 20 Hz to 20 kHz over 15 seconds. Learn to associate frequencies with what you hear.
        </p>
      )}
    </div>
  );
}
