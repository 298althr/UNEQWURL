"use client";

import { useState } from "react";
import ConsoleKnob from "./ConsoleKnob";
import type { ImperfectionConfig, ImperfectionMetrics } from "@/lib/imperfection-types";

const COLORS = {
  cable: "#f59e0b",
  speakerDamage: "#ef4444",
  acoustics: "#3b82f6",
  positioning: "#22c55e",
  speakerHealth: "#a855f7",
  inconsistency: "#f97316",
  amplifier: "#eab308",
  output: "#06b6d4",
};

type Props = {
  config: ImperfectionConfig;
  onChange: (config: ImperfectionConfig) => void;
  metrics: ImperfectionMetrics;
  onSaveProfile?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
};

function Toggle({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`imp-toggle ${active ? "active" : ""}`}
      style={{ borderColor: active ? color : undefined, color: active ? color : undefined }}
    >
      {active ? "ON" : "OFF"}
      <span className="imp-toggle-label">{label}</span>
    </button>
  );
}

export default function ImperfectionPanel({ config, onChange, metrics, onSaveProfile, onReset, isSaving }: Props) {
  const [activeTab, setActiveTab] = useState<keyof ImperfectionConfig>("cable");

  const update = <K extends keyof ImperfectionConfig>(key: K, patch: Partial<ImperfectionConfig[K]>) => {
    onChange({ ...config, [key]: { ...config[key], ...patch } });
  };

  const tabs: { key: keyof ImperfectionConfig; label: string }[] = [
    { key: "cable", label: "Cable" },
    { key: "speakerDamage", label: "Damage" },
    { key: "acoustics", label: "Acoustics" },
    { key: "positioning", label: "Position" },
    { key: "speakerHealth", label: "Health" },
    { key: "inconsistency", label: "Drift" },
    { key: "amplifier", label: "Amp" },
    { key: "output", label: "Output" },
  ];

  return (
    <div className="imperfection-panel">
      <div className="imp-header">
        <div className="imp-title-row">
          <div className="imp-title">Imperfection / Simulation</div>
          <div className="imp-actions">
            {onReset && (
              <button type="button" className="imp-action-btn" onClick={onReset}>
                Reset
              </button>
            )}
            {onSaveProfile && (
              <button type="button" className="imp-action-btn primary" onClick={onSaveProfile} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
            )}
          </div>
        </div>
        <div className="imp-metrics-mini">
          <div className="imp-metric-mini">
            <span className="imp-metric-label">STI</span>
            <span className="imp-metric-value">{metrics.sti.toFixed(2)}</span>
          </div>
          <div className="imp-metric-mini">
            <span className="imp-metric-label">C80</span>
            <span className="imp-metric-value">{metrics.c80.toFixed(1)} dB</span>
          </div>
          <div className="imp-metric-mini">
            <span className="imp-metric-label">SPL</span>
            <span className="imp-metric-value">{metrics.spl.toFixed(1)} dB</span>
          </div>
          <div className="imp-metric-mini">
            <span className="imp-metric-label">RT60</span>
            <span className="imp-metric-value">{metrics.rt60.toFixed(2)} s</span>
          </div>
          <div className="imp-metric-mini">
            <span className="imp-metric-label">LUFS</span>
            <span className="imp-metric-value">{metrics.lufs.toFixed(1)}</span>
          </div>
          <div className="imp-metric-mini">
            <span className="imp-metric-label">THD</span>
            <span className="imp-metric-value">{metrics.thd.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="imp-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`imp-tab ${activeTab === t.key ? "active" : ""}`}
            style={activeTab === t.key ? { borderColor: COLORS[t.key] } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="imp-body">
        {activeTab === "cable" && (
          <div className="imp-section">
            <Toggle label="Cable Fault" active={config.cable.enabled} onClick={() => update("cable", { enabled: !config.cable.enabled })} color={COLORS.cable} />
            <div className="imp-knobs">
              <ConsoleKnob label="Noise" value={config.cable.noiseLevel} min={0} max={100} step={1} size={48} color={COLORS.cable} onChange={(v) => update("cable", { noiseLevel: v })} />
              <ConsoleKnob label="Hum" value={config.cable.humLevel} min={0} max={100} step={1} size={48} color={COLORS.cable} onChange={(v) => update("cable", { humLevel: v })} />
              <ConsoleKnob label="Crackle" value={config.cable.crackleProbability} min={0} max={1} step={0.01} size={48} color={COLORS.cable} onChange={(v) => update("cable", { crackleProbability: v })} />
              <ConsoleKnob label="Cutoff" value={config.cable.frequencyCutoff} min={1000} max={20000} step={100} size={48} color={COLORS.cable} onChange={(v) => update("cable", { frequencyCutoff: v })} />
            </div>
          </div>
        )}

        {activeTab === "speakerDamage" && (
          <div className="imp-section">
            <Toggle label="Speaker Damage" active={config.speakerDamage.enabled} onClick={() => update("speakerDamage", { enabled: !config.speakerDamage.enabled })} color={COLORS.speakerDamage} />
            <div className="imp-knobs">
              <ConsoleKnob label="Distortion" value={config.speakerDamage.distortionAmount} min={0} max={100} step={1} size={48} color={COLORS.speakerDamage} onChange={(v) => update("speakerDamage", { distortionAmount: v })} />
              <ConsoleKnob label="Torn Low" value={config.speakerDamage.tornFreqLow} min={20} max={1000} step={10} size={48} color={COLORS.speakerDamage} onChange={(v) => update("speakerDamage", { tornFreqLow: v })} />
              <ConsoleKnob label="Torn High" value={config.speakerDamage.tornFreqHigh} min={1000} max={8000} step={100} size={48} color={COLORS.speakerDamage} onChange={(v) => update("speakerDamage", { tornFreqHigh: v })} />
              <ConsoleKnob label="Health" value={config.speakerDamage.healthPercent} min={0} max={100} step={1} size={48} color={COLORS.speakerDamage} onChange={(v) => update("speakerDamage", { healthPercent: v })} />
            </div>
          </div>
        )}

        {activeTab === "acoustics" && (
          <div className="imp-section">
            <Toggle label="Room Acoustics" active={config.acoustics.enabled} onClick={() => update("acoustics", { enabled: !config.acoustics.enabled })} color={COLORS.acoustics} />
            <div className="imp-knobs">
              <ConsoleKnob label="RT60" value={config.acoustics.rt60} min={0.1} max={5} step={0.1} size={48} color={COLORS.acoustics} onChange={(v) => update("acoustics", { rt60: v })} />
              <ConsoleKnob label="Room Size" value={config.acoustics.roomSize} min={1} max={100} step={1} size={48} color={COLORS.acoustics} onChange={(v) => update("acoustics", { roomSize: v })} />
              <ConsoleKnob label="Absorption" value={config.acoustics.absorption} min={0} max={1} step={0.01} size={48} color={COLORS.acoustics} onChange={(v) => update("acoustics", { absorption: v })} />
              <ConsoleKnob label="Reverb" value={config.acoustics.reverbAmount} min={0} max={100} step={1} size={48} color={COLORS.acoustics} onChange={(v) => update("acoustics", { reverbAmount: v })} />
            </div>
          </div>
        )}

        {activeTab === "positioning" && (
          <div className="imp-section">
            <Toggle label="Speaker Position" active={config.positioning.enabled} onClick={() => update("positioning", { enabled: !config.positioning.enabled })} color={COLORS.positioning} />
            <div className="imp-knobs">
              <ConsoleKnob label="L Delay" value={config.positioning.leftDelayMs} min={0} max={50} step={0.5} size={48} color={COLORS.positioning} onChange={(v) => update("positioning", { leftDelayMs: v })} />
              <ConsoleKnob label="R Delay" value={config.positioning.rightDelayMs} min={0} max={50} step={0.5} size={48} color={COLORS.positioning} onChange={(v) => update("positioning", { rightDelayMs: v })} />
              <ConsoleKnob label="Angle" value={config.positioning.angle} min={-90} max={90} step={1} size={48} color={COLORS.positioning} onChange={(v) => update("positioning", { angle: v })} />
              <ConsoleKnob label="Distance" value={config.positioning.distance} min={0.5} max={20} step={0.5} size={48} color={COLORS.positioning} onChange={(v) => update("positioning", { distance: v })} />
            </div>
          </div>
        )}

        {activeTab === "speakerHealth" && (
          <div className="imp-section">
            <Toggle label="Speaker Health" active={config.speakerHealth.enabled} onClick={() => update("speakerHealth", { enabled: !config.speakerHealth.enabled })} color={COLORS.speakerHealth} />
            <div className="imp-knobs">
              <ConsoleKnob label="Low Loss" value={config.speakerHealth.lowFreqLoss} min={0} max={100} step={1} size={48} color={COLORS.speakerHealth} onChange={(v) => update("speakerHealth", { lowFreqLoss: v })} />
              <ConsoleKnob label="High Loss" value={config.speakerHealth.highFreqLoss} min={0} max={100} step={1} size={48} color={COLORS.speakerHealth} onChange={(v) => update("speakerHealth", { highFreqLoss: v })} />
              <ConsoleKnob label="Degradation" value={config.speakerHealth.overallDegradation} min={0} max={100} step={1} size={48} color={COLORS.speakerHealth} onChange={(v) => update("speakerHealth", { overallDegradation: v })} />
            </div>
          </div>
        )}

        {activeTab === "inconsistency" && (
          <div className="imp-section">
            <Toggle label="Signal Drift" active={config.inconsistency.enabled} onClick={() => update("inconsistency", { enabled: !config.inconsistency.enabled })} color={COLORS.inconsistency} />
            <div className="imp-knobs">
              <ConsoleKnob label="Gain Var" value={config.inconsistency.gainVariance} min={0} max={100} step={1} size={48} color={COLORS.inconsistency} onChange={(v) => update("inconsistency", { gainVariance: v })} />
              <ConsoleKnob label="Dropouts" value={config.inconsistency.dropoutsPerMin} min={0} max={60} step={1} size={48} color={COLORS.inconsistency} onChange={(v) => update("inconsistency", { dropoutsPerMin: v })} />
              <ConsoleKnob label="Phase Var" value={config.inconsistency.phaseVariance} min={0} max={180} step={1} size={48} color={COLORS.inconsistency} onChange={(v) => update("inconsistency", { phaseVariance: v })} />
            </div>
          </div>
        )}

        {activeTab === "amplifier" && (
          <div className="imp-section">
            <Toggle label="Amp Saturation" active={config.amplifier.enabled} onClick={() => update("amplifier", { enabled: !config.amplifier.enabled })} color={COLORS.amplifier} />
            <div className="imp-knobs">
              <ConsoleKnob label="Saturation" value={config.amplifier.saturation} min={0} max={100} step={1} size={48} color={COLORS.amplifier} onChange={(v) => update("amplifier", { saturation: v })} />
              <ConsoleKnob label="Headroom" value={config.amplifier.headroom} min={-24} max={0} step={0.5} size={48} color={COLORS.amplifier} onChange={(v) => update("amplifier", { headroom: v })} />
              <ConsoleKnob label="Warmth" value={config.amplifier.warmth} min={0} max={100} step={1} size={48} color={COLORS.amplifier} onChange={(v) => update("amplifier", { warmth: v })} />
            </div>
          </div>
        )}

        {activeTab === "output" && (
          <div className="imp-section">
            <div className="imp-knobs">
              <ConsoleKnob label="L Gain" value={config.output.leftGain} min={-60} max={12} step={0.5} size={48} color={COLORS.output} onChange={(v) => update("output", { leftGain: v })} />
              <ConsoleKnob label="R Gain" value={config.output.rightGain} min={-60} max={12} step={0.5} size={48} color={COLORS.output} onChange={(v) => update("output", { rightGain: v })} />
              <ConsoleKnob label="L Delay" value={config.output.leftDelayMs} min={0} max={100} step={0.5} size={48} color={COLORS.output} onChange={(v) => update("output", { leftDelayMs: v })} />
              <ConsoleKnob label="R Delay" value={config.output.rightDelayMs} min={0} max={100} step={0.5} size={48} color={COLORS.output} onChange={(v) => update("output", { rightDelayMs: v })} />
              <ConsoleKnob label="Balance" value={config.output.balance} min={-1} max={1} step={0.01} size={48} color={COLORS.output} onChange={(v) => update("output", { balance: v })} />
            </div>
            <div className="imp-polarity">
              <button type="button" className={`imp-polarity-btn ${config.output.leftPolarity ? "" : "inverted"}`} onClick={() => update("output", { leftPolarity: !config.output.leftPolarity })}>L Polarity {config.output.leftPolarity ? "+" : "−"}</button>
              <button type="button" className={`imp-polarity-btn ${config.output.rightPolarity ? "" : "inverted"}`} onClick={() => update("output", { rightPolarity: !config.output.rightPolarity })}>R Polarity {config.output.rightPolarity ? "+" : "−"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
