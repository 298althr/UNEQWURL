"use client";

import type { AdvancedFXConfig, EffectKey } from "@/lib/types";
import EffectChannel from "./EffectChannel";

interface Props {
  config: AdvancedFXConfig;
  onIntensityChange: (effectKey: EffectKey, value: number) => void;
}

type GroupDef = {
  name: string;
  accent: string;
  accentLight: string;
  bgImage: string;
  effects: { key: EffectKey; label: string }[];
};

const GROUPS: GroupDef[] = [
  {
    name: "Live",
    accent: "#ff0056",
    accentLight: "#ff4d88",
    bgImage:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&width=600&auto=format&fit=crop",
    effects: [
      { key: "pitchCorrection", label: "Pitch" },
      { key: "parallelComp", label: "ParComp" },
      { key: "plateReverb", label: "Plate" },
    ],
  },
  {
    name: "Podcast",
    accent: "#00a6ff",
    accentLight: "#4dc2ff",
    bgImage:
      "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&width=600&auto=format&fit=crop",
    effects: [
      { key: "noiseGate", label: "Gate" },
      { key: "deesser", label: "De-Ess" },
      { key: "vocalChain", label: "Vocal" },
    ],
  },
  {
    name: "Music",
    accent: "#6500ff",
    accentLight: "#9a4dff",
    bgImage:
      "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&width=600&auto=format&fit=crop",
    effects: [
      { key: "reverb", label: "Reverb" },
      { key: "multiband", label: "Multi" },
    ],
  },
];

export default function AdvancedFXPanel({ config, onIntensityChange }: Props) {
  return (
    <div className="fx-cards-row-grid">
      {GROUPS.map((group) => (
        <div
          key={group.name}
          className={`fx-showcase-card ${
            group.name === "Live" ? "live-fx" : group.name === "Podcast" ? "pod-fx" : "mus-fx"
          }`}
          style={{ backgroundImage: `url('${group.bgImage}')` }}
        >
          <div className="fx-card-inner">
            <div className="fx-class-title">{group.name} Effects</div>
            <div className="fx-sliders-grid">
              {group.effects.map((fx) => {
                const current = config.intensities[fx.key] ?? 0;
                return (
                  <EffectChannel
                    key={fx.key}
                    label={fx.label}
                    value={current}
                    onChange={(v) => onIntensityChange(fx.key, v)}
                    onToggle={() => onIntensityChange(fx.key, current > 0 ? 0 : 50)}
                    accentColor={group.accent}
                    accentLight={group.accentLight}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
