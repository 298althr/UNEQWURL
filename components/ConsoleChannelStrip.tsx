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
  /** Optional benchmark EQ target — shows yellow tick on each knob's arc */
  benchmarkSettings?: EQSettings | null;
};

const BAND_COLORS: Record<string, string> = {
  low:   "#6B8CFF",
  mid:   "#C084FC",
  high:  "#FF58AE",
  gain:  "#FFB347",
  eq298: "#00D4AA",
};

/** Knob size hierarchy — larger = more educationally important */
const BAND_SIZES: Record<EQBand, number> = {
  low:   82,
  eq298: 82,
  mid:   70,
  high:  70,
  gain:  62,
};

/** Band layout order: primary bands first */
const BAND_ORDER: EQBand[] = ["low", "eq298", "mid", "high", "gain"];

export default function ConsoleChannelStrip({ settings, onChange, macroValue, onMacroChange, color = "#FF58AE", benchmarkSettings }: Props) {
  return (
    <div className="console-channel-strip">
      <div className="console-strip-header">
        <div className="console-strip-scribble" style={{ color }}>EQ</div>
        <div className="console-strip-title">5-Band + FX</div>
      </div>
      <div className="console-strip-knobs">
        {BAND_ORDER.map((band) => (
          <ConsoleKnob
            key={band}
            label={BAND_LABELS[band]}
            value={settings[band]}
            min={-12}
            max={12}
            step={0.1}
            bipolar
            size={BAND_SIZES[band]}
            color={BAND_COLORS[band] || color}
            onChange={(v) => onChange(band, v)}
            benchmarkValue={benchmarkSettings?.[band]}
          />
        ))}
        <ConsoleKnob
          label="FX Macro"
          value={macroValue}
          min={0}
          max={100}
          step={1}
          bipolar={false}
          size={72}
          color="#FF58AE"
          onChange={onMacroChange}
        />
      </div>
    </div>
  );
}
