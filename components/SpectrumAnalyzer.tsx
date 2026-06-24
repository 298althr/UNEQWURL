"use client";

import { useEffect, useRef } from "react";
import AudioMotionAnalyzer from "audiomotion-analyzer";
import { getAudioChain } from "@/lib/audio-chain";

type Props = {
  audioElement: HTMLAudioElement | null;
};

export default function SpectrumAnalyzer({ audioElement }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const analyzerRef = useRef<AudioMotionAnalyzer | null>(null);

  useEffect(() => {
    if (!audioElement || !containerRef.current) return;

    // Get the existing active audio chain
    const chain = getAudioChain(audioElement);
    if (!chain) return;

    // Initialize audioMotion-analyzer inside the container
    const audioMotion = new AudioMotionAnalyzer(containerRef.current, {
      audioCtx: chain.ctx,
      connectSpeakers: false, // We handle output routing ourselves
      mode: 5, // Discrete frequency bars
      barSpace: 0.4,
      showScaleX: false,
      showScaleY: false,
      showPeaks: true,
      overlay: true,
      bgAlpha: 0,
      colorMode: "gradient",
      gradient: "classic",
      height: 180,
      maxFreq: 16000,
      minFreq: 40,
    });

    // Tap the makeupGain node output to feed into the analyzer
    audioMotion.connectInput(chain.makeupGain);
    analyzerRef.current = audioMotion;

    // Use Geist/Magnific style gradient matching the design system
    audioMotion.registerGradient("spectrum-glow", {
      bgColor: "transparent",
      colorStops: [
        { pos: 0, color: "#D080A8" },
        { pos: 0.5, color: "#B06088" },
        { pos: 1, color: "#705060" }
      ]
    });
    audioMotion.gradient = "spectrum-glow";

    return () => {
      try {
        if (chain && chain.ctx.state !== "closed") {
          audioMotion.disconnectInput(chain.makeupGain);
        }
        audioMotion.destroy();
      } catch (err) {
        // already disposed
      }
      analyzerRef.current = null;
    };
  }, [audioElement]);

  return (
    <div className="rounded-xl border border-white/10 bg-surface p-4">
      <div className="mb-2 text-sm font-semibold text-muted">
        Live Spectrum Analyzer
      </div>
      <div 
        ref={containerRef} 
        className="w-full overflow-hidden rounded-lg bg-surface/50"
        style={{ height: "180px" }}
      />
    </div>
  );
}
