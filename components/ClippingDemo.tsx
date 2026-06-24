"use client";

import { useRef, useState, useEffect } from "react";

interface ClippingDemoProps {
  audioContext: AudioContext | null;
  sourceNode: AudioNode | null;
  destinationNode: AudioNode | null;
  analyser?: AnalyserNode | null;
  vuAnalyser?: AnalyserNode | null;
}

export default function ClippingDemo({ audioContext, sourceNode, destinationNode, analyser, vuAnalyser }: ClippingDemoProps) {
  const [isClipping, setIsClipping] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const shaperRef = useRef<WaveShaperNode | null>(null);
  const bypassRef = useRef<GainNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      disableClipping();
    };
  }, []);

  const makeClipCurve = (amount: number): Float32Array => {
    const samples = 44100;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    const threshold = 1 - amount;
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      if (x > threshold) {
        curve[i] = threshold;
      } else if (x < -threshold) {
        curve[i] = -threshold;
      } else {
        curve[i] = x;
      }
    }
    return curve;
  };

  const enableClipping = async () => {
    if (!sourceNode || !destinationNode) return;
    let ctx = audioContext || ctxRef.current;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const shaper = ctx.createWaveShaper();
    shaper.curve = makeClipCurve(threshold) as Float32Array<ArrayBuffer>;
    shaper.oversample = "none";

    // Disconnect source from destination, route through shaper
    try { sourceNode.disconnect(); } catch { /* */ }
    sourceNode.connect(shaper);
    shaper.connect(destinationNode);
    // Reconnect analysers so spectrum + VU meter keep working
    if (analyser) {
      try { shaper.connect(analyser); } catch { /* */ }
    }
    if (vuAnalyser) {
      try { shaper.connect(vuAnalyser); } catch { /* */ }
    }

    shaperRef.current = shaper;
    setIsClipping(true);
  };

  const disableClipping = () => {
    if (shaperRef.current && sourceNode && destinationNode) {
      try { sourceNode.disconnect(); } catch { /* */ }
      try { shaperRef.current.disconnect(); } catch { /* */ }
      sourceNode.connect(destinationNode);
      // Reconnect analysers on the direct path
      if (analyser) {
        try { sourceNode.connect(analyser); } catch { /* */ }
      }
      if (vuAnalyser) {
        try { sourceNode.connect(vuAnalyser); } catch { /* */ }
      }
      shaperRef.current = null;
    }
    setIsClipping(false);
  };

  const toggle = () => {
    if (isClipping) {
      disableClipping();
    } else {
      enableClipping();
    }
  };

  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    if (shaperRef.current && audioContext) {
      shaperRef.current.curve = makeClipCurve(value) as Float32Array<ArrayBuffer>;
    }
  };

  const severityLabel = threshold < 0.2 ? "Extreme" : threshold < 0.4 ? "Heavy" : threshold < 0.6 ? "Moderate" : threshold < 0.8 ? "Light" : "Subtle";

  return (
    <div className="clipping-demo-container">
      <div className="section-label" style={{ margin: 0, marginBottom: "8px" }}>Clipping Demo</div>
      <div className="clipping-demo-controls">
        <button
          type="button"
          onClick={toggle}
          className={`btn clipping-demo-toggle${isClipping ? " active" : ""}`}
          disabled={!sourceNode}
        >
          {isClipping ? "Clipping ON — Click to Disable" : "Enable Digital Clipping"}
        </button>
        {isClipping && (
          <div className="clipping-demo-slider-row">
            <label className="clipping-demo-label">Severity: {severityLabel}</label>
            <input
              type="range"
              min={0.05}
              max={0.95}
              step={0.05}
              value={threshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="clipping-demo-slider"
            />
          </div>
        )}
      </div>
      <p className="clipping-demo-hint">
        Hear what digital clipping sounds like. Watch the VU meter hit 0 dB and the CLIP indicator light up.
      </p>
    </div>
  );
}
