"use client";

import { useCallback } from "react";
import { Volume2, MoveHorizontal, Maximize2 } from "lucide-react";
import type { ConsoleSettings } from "@/lib/audio-chain";

type Props = {
  settings: ConsoleSettings;
  onChange: (settings: ConsoleSettings) => void;
};

export default function ConsoleStrip({ settings, onChange }: Props) {
  const updateGain = useCallback((gain: number) => {
    onChange({ ...settings, gain: Math.round(gain * 10) / 10 });
  }, [settings, onChange]);

  const updatePan = useCallback((pan: number) => {
    onChange({ ...settings, pan: Math.round(pan * 100) / 100 });
  }, [settings, onChange]);

  const updateWidth = useCallback((width: number) => {
    onChange({ ...settings, width: Math.round(width * 100) / 100 });
  }, [settings, onChange]);

  return (
    <div className="console-strip">
      <div className="console-strip-header">
        <Volume2 size={12} />
        <span>Channel Strip</span>
      </div>
      <div className="console-strip-controls">
        {/* Gain */}
        <div className="console-knob-group">
          <label className="console-knob-label">Gain</label>
          <input
            type="range"
            min={-12}
            max={12}
            step={0.1}
            value={settings.gain}
            onChange={(e) => updateGain(parseFloat(e.target.value))}
            className="console-slider console-slider--vertical"
            style={{ "--slider-fill": `${((settings.gain + 12) / 24) * 100}%` } as React.CSSProperties}
          />
          <span className="console-knob-value">{settings.gain > 0 ? "+" : ""}{settings.gain.toFixed(1)}dB</span>
        </div>

        {/* Pan */}
        <div className="console-knob-group">
          <label className="console-knob-label">Pan</label>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={settings.pan}
            onChange={(e) => updatePan(parseFloat(e.target.value))}
            className="console-slider console-slider--pan"
            style={{ "--slider-fill": `${((settings.pan + 1) / 2) * 100}%` } as React.CSSProperties}
          />
          <span className="console-knob-value">
            {settings.pan === 0 ? "C" : settings.pan < 0 ? `L${Math.round(Math.abs(settings.pan) * 100)}` : `R${Math.round(settings.pan * 100)}`}
          </span>
        </div>

        {/* Width */}
        <div className="console-knob-group">
          <label className="console-knob-label">Width</label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={settings.width}
            onChange={(e) => updateWidth(parseFloat(e.target.value))}
            className="console-slider console-slider--width"
            style={{ "--slider-fill": `${(settings.width / 2) * 100}%` } as React.CSSProperties}
          />
          <span className="console-knob-value">{settings.width === 0 ? "Mono" : settings.width === 1 ? "Stereo" : `${Math.round(settings.width * 100)}%`}</span>
        </div>
      </div>
    </div>
  );
}
