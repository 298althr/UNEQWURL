"use client";

import ConsoleKnob from "./ConsoleKnob";
import type { EQBand, EQSettings } from "@/lib/types";
import { BAND_LABELS } from "@/lib/types";

type Props = {
  settings: EQSettings;
  onChange: (band: EQBand, value: number) => void;
  macroValue: number;
  onMacroChange: (value: number) => void;
  uploadType: string;
  color?: string;
};

const BAND_COLORS: Record<string, string> = {
  low: "#6B8CFF",
  mid: "#C084FC",
  high: "#FF58AE",
  gain: "#FFB347",
  eq298: "#00D4AA",
};

export default function ConsoleChannelStrip({ settings, onChange, macroValue, onMacroChange, color = "#FF58AE" }: Props) {
  const bands: EQBand[] = ["low", "mid", "high", "gain", "eq298"];
  return (
    <div className="console-channel-strip">
      <div className="console-strip-header">
        <div className="console-strip-scribble" style={{ color }}>EQ</div>
        <div className="console-strip-title">5-Band + FX</div>
      </div>
      <div className="console-strip-knobs">
        {bands.map((band) => (
          <ConsoleKnob
            key={band}
            label={BAND_LABELS[band]}
            value={settings[band]}
            min={-12}
            max={12}
            step={0.1}
            bipolar
            size={56}
            color={BAND_COLORS[band] || color}
            onChange={(v) => onChange(band, v)}
          />
        ))}
        <ConsoleKnob
          label="FX Macro"
          value={macroValue}
          min={0}
          max={100}
          step={1}
          bipolar={false}
          size={56}
          color="#FF58AE"
          onChange={onMacroChange}
        />
      </div>
    </div>
  );
}
