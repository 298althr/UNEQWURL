"use client";

import { useCallback } from "react";
import { Gauge, Power } from "lucide-react";
import type { CompressorSettings, LimiterSettings, ConsoleSettings } from "@/lib/audio-chain";

type Props = {
  settings: ConsoleSettings;
  onChange: (settings: ConsoleSettings) => void;
  compressorGR: number;
  limiterGR: number;
};

export default function CompressorControls({ settings, onChange, compressorGR, limiterGR }: Props) {
  const comp = settings.compressor;
  const lim = settings.limiter;

  const updateComp = useCallback((patch: Partial<CompressorSettings>) => {
    onChange({ ...settings, compressor: { ...comp, ...patch } });
  }, [settings, comp, onChange]);

  const updateLim = useCallback((patch: Partial<LimiterSettings>) => {
    onChange({ ...settings, limiter: { ...lim, ...patch } });
  }, [settings, lim, onChange]);

  return (
    <div className="console-dynamics">
      {/* Compressor */}
      <div className="dynamics-section">
        <div className="dynamics-header">
          <Gauge size={12} />
          <span>Compressor</span>
          <button
            type="button"
            onClick={() => updateComp({ enabled: !comp.enabled })}
            className={`dynamics-power${comp.enabled ? " active" : ""}`}
            title={comp.enabled ? "Disable compressor" : "Enable compressor"}
          >
            <Power size={10} />
          </button>
        </div>
        <div className="dynamics-controls">
          <div className="dynamics-knob">
            <label>Threshold</label>
            <input
              type="range" min={-60} max={0} step={0.5}
              value={comp.threshold}
              disabled={!comp.enabled}
              onChange={(e) => updateComp({ threshold: parseFloat(e.target.value) })}
              className="console-slider"
              style={{ "--slider-fill": `${((comp.threshold + 60) / 60) * 100}%` } as React.CSSProperties}
            />
            <span className="dynamics-value">{comp.threshold.toFixed(1)}dB</span>
          </div>
          <div className="dynamics-knob">
            <label>Ratio</label>
            <input
              type="range" min={1} max={20} step={0.5}
              value={comp.ratio}
              disabled={!comp.enabled}
              onChange={(e) => updateComp({ ratio: parseFloat(e.target.value) })}
              className="console-slider"
              style={{ "--slider-fill": `${((comp.ratio - 1) / 19) * 100}%` } as React.CSSProperties}
            />
            <span className="dynamics-value">{comp.ratio.toFixed(1)}:1</span>
          </div>
          <div className="dynamics-knob">
            <label>Attack</label>
            <input
              type="range" min={0} max={1} step={0.001}
              value={comp.attack}
              disabled={!comp.enabled}
              onChange={(e) => updateComp({ attack: parseFloat(e.target.value) })}
              className="console-slider"
              style={{ "--slider-fill": `${(comp.attack / 1) * 100}%` } as React.CSSProperties}
            />
            <span className="dynamics-value">{(comp.attack * 1000).toFixed(1)}ms</span>
          </div>
          <div className="dynamics-knob">
            <label>Release</label>
            <input
              type="range" min={0.01} max={1} step={0.01}
              value={comp.release}
              disabled={!comp.enabled}
              onChange={(e) => updateComp({ release: parseFloat(e.target.value) })}
              className="console-slider"
              style={{ "--slider-fill": `${((comp.release - 0.01) / 0.99) * 100}%` } as React.CSSProperties}
            />
            <span className="dynamics-value">{(comp.release * 1000).toFixed(0)}ms</span>
          </div>
          <div className="dynamics-knob">
            <label>Knee</label>
            <input
              type="range" min={0} max={40} step={1}
              value={comp.knee}
              disabled={!comp.enabled}
              onChange={(e) => updateComp({ knee: parseFloat(e.target.value) })}
              className="console-slider"
              style={{ "--slider-fill": `${(comp.knee / 40) * 100}%` } as React.CSSProperties}
            />
            <span className="dynamics-value">{comp.knee.toFixed(0)}dB</span>
          </div>
        </div>
        {/* Gain Reduction Meter */}
        <div className="gr-meter-row">
          <span className="gr-meter-label">GR</span>
          <div className="gr-meter-track">
            <div
              className="gr-meter-fill"
              style={{ width: `${Math.min(Math.abs(compressorGR) * 3, 100)}%` }}
            />
          </div>
          <span className="gr-meter-value">{compressorGR.toFixed(1)}dB</span>
        </div>
      </div>

      {/* Limiter */}
      <div className="dynamics-section">
        <div className="dynamics-header">
          <Gauge size={12} />
          <span>Limiter</span>
          <button
            type="button"
            onClick={() => updateLim({ enabled: !lim.enabled })}
            className={`dynamics-power${lim.enabled ? " active" : ""}`}
            title={lim.enabled ? "Disable limiter" : "Enable limiter"}
          >
            <Power size={10} />
          </button>
        </div>
        <div className="dynamics-controls">
          <div className="dynamics-knob">
            <label>Ceiling</label>
            <input
              type="range" min={-12} max={0} step={0.5}
              value={lim.ceiling}
              disabled={!lim.enabled}
              onChange={(e) => updateLim({ ceiling: parseFloat(e.target.value) })}
              className="console-slider"
              style={{ "--slider-fill": `${((lim.ceiling + 12) / 12) * 100}%` } as React.CSSProperties}
            />
            <span className="dynamics-value">{lim.ceiling.toFixed(1)}dB</span>
          </div>
        </div>
        <div className="gr-meter-row">
          <span className="gr-meter-label">GR</span>
          <div className="gr-meter-track">
            <div
              className="gr-meter-fill gr-meter-fill--limiter"
              style={{ width: `${Math.min(Math.abs(limiterGR) * 3, 100)}%` }}
            />
          </div>
          <span className="gr-meter-value">{limiterGR.toFixed(1)}dB</span>
        </div>
      </div>
    </div>
  );
}
