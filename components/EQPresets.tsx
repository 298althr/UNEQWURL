"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, Lock, Trash2, Share2 } from "lucide-react";
import type { EQSettings, AdvancedFXConfig } from "@/lib/types";

interface EQPresetsProps {
  currentSettings: EQSettings;
  onApply: (settings: EQSettings) => void;
  fxConfig?: AdvancedFXConfig | null;
  onApplyFX?: (fx: AdvancedFXConfig) => void;
}

interface Preset {
  id?: string;
  name: string;
  settings: EQSettings;
  isFactory: boolean;
  isPublic?: boolean;
  fxSettings?: AdvancedFXConfig | null;
  authorName?: string;
}

const FACTORY_PRESETS: Preset[] = [
  { name: "Flat", settings: { low: 0, mid: 0, high: 0, gain: 0, eq298: 0 }, isFactory: true },
  { name: "Vocal Boost", settings: { low: -5, mid: 3, high: 6, gain: 0, eq298: 7 }, isFactory: true },
  { name: "Warm Bass", settings: { low: 8, mid: -1, high: -3, gain: 0, eq298: -2 }, isFactory: true },
  { name: "Bass Cut", settings: { low: -8, mid: 0, high: 2, gain: 0, eq298: 0 }, isFactory: true },
  { name: "Brighten", settings: { low: -2, mid: 0, high: 7, gain: 0, eq298: 3 }, isFactory: true },
  { name: "Radio Voice", settings: { low: -9, mid: -4, high: 5, gain: 0, eq298: 5 }, isFactory: true },
  { name: "Muddy (Bad)", settings: { low: 10, mid: 6, high: -6, gain: 0, eq298: -4 }, isFactory: true },
];

const STORAGE_KEY = "298eq-user-presets";

export default function EQPresets({ currentSettings, onApply, fxConfig, onApplyFX }: EQPresetsProps) {
  const [userPresets, setUserPresets] = useState<Preset[]>([]);
  const [publicPresets, setPublicPresets] = useState<Preset[]>([]);
  const [saveName, setSaveName] = useState("");
  const [makePublic, setMakePublic] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const res = await fetch("/api/presets");
      if (res.ok) {
        const data = await res.json() as Array<{
          id: string; name: string; is_public: boolean;
          eq_settings: EQSettings; fx_settings: AdvancedFXConfig | null; author_name: string;
        }>;
        setUserPresets(data.filter((p) => !p.is_public).map((p) => ({
          id: p.id, name: p.name, settings: p.eq_settings, isFactory: false,
          isPublic: false, fxSettings: p.fx_settings,
        })));
        setPublicPresets(data.filter((p) => p.is_public).map((p) => ({
          id: p.id, name: p.name, settings: p.eq_settings, isFactory: false,
          isPublic: true, fxSettings: p.fx_settings, authorName: p.author_name,
        })));
        setLoading(false);
        return;
      }
    } catch { /* fall through to localStorage */ }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Preset[];
        setUserPresets(parsed.filter((p) => !p.isFactory));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleApply = useCallback((preset: Preset) => {
    onApply(preset.settings);
    if (preset.fxSettings && onApplyFX) {
      onApplyFX(preset.fxSettings);
    }
    setActivePreset(preset.name);
  }, [onApply, onApplyFX]);

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    const newPreset: Preset = {
      name, settings: { ...currentSettings }, isFactory: false,
      isPublic: makePublic, fxSettings: fxConfig ?? null,
    };
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, is_public: makePublic, eq_settings: currentSettings, fx_settings: fxConfig ?? null,
        }),
      });
      if (res.ok) {
        await loadPresets();
        setSaveName(""); setShowSaveInput(false); setMakePublic(false);
        setActivePreset(name);
        return;
      }
    } catch { /* fall through */ }
    const updated = [...userPresets.filter((p) => p.name !== name), newPreset];
    setUserPresets(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    setSaveName(""); setShowSaveInput(false); setMakePublic(false);
    setActivePreset(name);
  };

  const handleDelete = async (preset: Preset) => {
    if (preset.id) {
      try {
        await fetch(`/api/presets/${preset.id}`, { method: "DELETE" });
        await loadPresets();
        if (activePreset === preset.name) setActivePreset(null);
        return;
      } catch { /* fall through */ }
    }
    const updated = userPresets.filter((p) => p.name !== preset.name);
    setUserPresets(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    if (activePreset === preset.name) setActivePreset(null);
  };

  const togglePublic = async (preset: Preset) => {
    if (!preset.id) return;
    try {
      await fetch(`/api/presets/${preset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !preset.isPublic }),
      });
      await loadPresets();
    } catch { /* ignore */ }
  };

  if (!mounted) return null;

  const renderPreset = (preset: Preset) => (
    <button
      key={`${preset.name}-${preset.id ?? "factory"}`}
      type="button"
      onClick={() => handleApply(preset)}
      className={`preset-pill${activePreset === preset.name ? " active" : ""}${preset.isPublic ? " preset-public" : ""}`}
      title={preset.isFactory ? "Factory preset" : preset.isPublic ? `Public preset by ${preset.authorName ?? "unknown"}` : "Your preset"}
    >
      {preset.isPublic && <Globe size={10} style={{ marginRight: "3px", opacity: 0.6 }} />}
      {preset.name}
      {!preset.isFactory && preset.isPublic === false && (
        <>
          <span className="preset-action-icon" onClick={(e) => { e.stopPropagation(); togglePublic(preset); }} title="Make public">
            <Share2 size={10} />
          </span>
          <span className="preset-delete" onClick={(e) => { e.stopPropagation(); handleDelete(preset); }} title="Delete preset">
            <Trash2 size={10} />
          </span>
        </>
      )}
      {preset.isPublic && (
        <span className="preset-action-icon" onClick={(e) => { e.stopPropagation(); togglePublic(preset); }} title="Make private">
          <Lock size={10} />
        </span>
      )}
    </button>
  );

  return (
    <div className="eq-presets">
      <div className="section-label" style={{ margin: 0, marginBottom: "8px" }}>EQ Presets</div>
      <div className="preset-pills">
        {FACTORY_PRESETS.map(renderPreset)}
        {userPresets.map(renderPreset)}
        <button type="button" onClick={() => setShowSaveInput((prev) => !prev)} className="preset-pill preset-add" title="Save current settings as preset">
          + Save
        </button>
      </div>

      {publicPresets.length > 0 && (
        <>
          <div className="section-label" style={{ margin: "12px 0 6px", fontSize: "10px", opacity: 0.6 }}>
            <Globe size={10} style={{ display: "inline", marginRight: "4px" }} />
            Shared Presets
          </div>
          <div className="preset-pills">
            {publicPresets.map(renderPreset)}
          </div>
        </>
      )}

      {showSaveInput && (
        <div className="preset-save-row">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Preset name..."
            className="preset-input"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoFocus
          />
          <label className="preset-public-toggle">
            <input type="checkbox" checked={makePublic} onChange={(e) => setMakePublic(e.target.checked)} />
            <Globe size={11} /> Public
          </label>
          <button type="button" onClick={handleSave} className="preset-save-btn" disabled={!saveName.trim()}>
            Save
          </button>
        </div>
      )}
      {loading && (
        <p style={{ fontSize: "10px", color: "var(--muted)", margin: "4px 0 0" }}>Loading presets…</p>
      )}
    </div>
  );
}
