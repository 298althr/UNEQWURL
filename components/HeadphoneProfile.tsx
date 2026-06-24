"use client";

import { useState, useEffect } from "react";
import { AudioLines, AlertTriangle } from "lucide-react";

type OutputDeviceType =
  | "earbuds"
  | "over-ear"
  | "in-ear-monitor"
  | "laptop-speakers"
  | "desktop-speakers"
  | "studio-monitor"
  | "phone-speaker";

const PROFILES: Record<OutputDeviceType, {
  label: string;
  bassLimit: string;
  warning: string;
  color: string;
  icon: string;
}> = {
  earbuds: {
    label: "Earbuds (e.g. AirPods, Galaxy Buds)",
    bassLimit: "~80 Hz",
    warning: "Earbuds typically cannot reproduce frequencies below 80 Hz. When you boost Low, you may not hear the change — but it will affect other systems. Trust the spectrum analyzer for bass decisions.",
    color: "#eab308",
    icon: "🎧",
  },
  "over-ear": {
    label: "Over-ear headphones",
    bassLimit: "~30 Hz",
    warning: "Over-ear headphones generally reproduce the full audible range. You should be able to hear all EQ changes clearly. This is the recommended setup for this class.",
    color: "#22c55e",
    icon: "🎧",
  },
  "in-ear-monitor": {
    label: "In-ear monitors (IEMs)",
    bassLimit: "~20 Hz",
    warning: "IEMs typically have excellent frequency response. You should hear all changes clearly. Be cautious of bass boost — IEMs can produce very strong low end. Keep volume moderate.",
    color: "#22c55e",
    icon: "🎵",
  },
  "laptop-speakers": {
    label: "Laptop speakers (built-in)",
    bassLimit: "~200 Hz",
    warning: "Laptop speakers have very limited bass response and narrow stereo image. Bass boosts will be nearly inaudible. Room reflections affect what you hear. Use headphones if possible.",
    color: "#f97316",
    icon: "💻",
  },
  "desktop-speakers": {
    label: "Desktop / bookshelf speakers",
    bassLimit: "~80 Hz",
    warning: "Desktop speakers can produce a decent frequency range but are affected by room acoustics. Position matters — sit at equal distance from both speakers for accurate stereo imaging.",
    color: "#eab308",
    icon: "🔊",
  },
  "studio-monitor": {
    label: "Studio monitors (near-field)",
    bassLimit: "~40 Hz",
    warning: "Studio monitors provide the most accurate reference in this list. Room acoustics still affect bass below 200 Hz. This setup will reveal details that headphones might miss.",
    color: "#22c55e",
    icon: "🔊",
  },
  "phone-speaker": {
    label: "Phone speaker (no headphones)",
    bassLimit: "~300 Hz",
    warning: "Phone speakers cannot reproduce bass or sub-bass at all. You are hearing a severely limited frequency range. The spectrum analyzer is your primary tool. Please use headphones if available.",
    color: "#ef4444",
    icon: "📱",
  },
};

const STORAGE_KEY = "298eq-output-device";

export default function HeadphoneProfile() {
  const [selected, setSelected] = useState<OutputDeviceType | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      // Support legacy key too
      const saved = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem("298eq-headphone-profile")) as OutputDeviceType | null;
      if (saved && PROFILES[saved]) {
        setSelected(saved);
        setShowWarning(true);
      }
    } catch { /* ignore */ }
  }, []);

  const handleSelect = (type: OutputDeviceType) => {
    setSelected(type);
    setShowWarning(true);
    try { localStorage.setItem(STORAGE_KEY, type); } catch { /* ignore */ }
  };

  const handleDismiss = () => {
    setShowWarning(false);
  };

  if (!mounted) return null;

  const profile = selected ? PROFILES[selected] : null;

  return (
    <div className="headphone-profile-container">
      <div className="headphone-profile-header">
        <AudioLines size={14} />
        <span className="section-label" style={{ margin: 0 }}>Output Device Profile</span>
      </div>
      <select
        value={selected || ""}
        onChange={(e) => handleSelect(e.target.value as OutputDeviceType)}
        className="headphone-profile-select"
      >
        <option value="">Select your output device...</option>
        {(Object.keys(PROFILES) as OutputDeviceType[]).map((type) => (
          <option key={type} value={type}>{PROFILES[type].icon} {PROFILES[type].label}</option>
        ))}
      </select>
      {showWarning && profile && (
        <div className="headphone-profile-warning" style={{ borderLeftColor: profile.color }}>
          <AlertTriangle size={14} style={{ color: profile.color, flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ color: profile.color }}>Frequency floor: {profile.bassLimit}</strong>
            <p>{profile.warning}</p>
            <button type="button" onClick={handleDismiss} className="headphone-profile-dismiss">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
