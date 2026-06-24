"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Save, FolderOpen, Download, Upload, Music2, Waves, Mic2,
  Clock, Scissors, Volume2, Trash2, Settings,
  type LucideIcon,
} from "lucide-react";
import type { EQSettings } from "@/lib/types";
import type { ConsoleSettings } from "@/lib/audio-chain";
import type { AdvancedFXConfig } from "@/lib/types";
import {
  type PitchShiftSettings,
  type TimeStretchSettings,
  type VoiceChangeSettings,
  type HPSSSettings,
  type DenoiseSettings,
  type ProjectState,
  type SavedProject,
  getDefaultPitchShift,
  getDefaultTimeStretch,
  getDefaultVoiceChange,
  getDefaultHPSS,
  getDefaultDenoise,
  applyPitchShiftToSource,
  applyTimeStretchToSource,
  createVoiceChangeFilter,
  createHPSSFilter,
  createDenoiseFilter,
  serializeProject,
  deserializeProject,
  saveProjectLocal,
  loadProjectLocal,
  listProjectsLocal,
  deleteProjectLocal,
  exportProjectFile,
} from "@/lib/studio-tools";

type Props = {
  songId: string;
  songTitle: string;
  audioElement: HTMLAudioElement | null;
  audioContext: AudioContext | null;
  masterNode: AudioNode | null;
  eq: EQSettings;
  console: ConsoleSettings;
  fx: AdvancedFXConfig;
  isEnhanced: boolean;
  onApplyEQ: (eq: EQSettings) => void;
  onApplyConsole: (console: ConsoleSettings) => void;
  onApplyFX: (fx: AdvancedFXConfig) => void;
};

type ToolTab = "pitch" | "time" | "voice" | "hpss" | "denoise" | "project";

export default function StudioToolsPanel({
  songId,
  songTitle,
  audioElement,
  audioContext,
  masterNode,
  eq,
  console: consoleSettings,
  fx,
  isEnhanced,
  onApplyEQ,
  onApplyConsole,
  onApplyFX,
}: Props) {
  const [activeTab, setActiveTab] = useState<ToolTab>("project");
  const [pitchShift, setPitchShift] = useState<PitchShiftSettings>(getDefaultPitchShift());
  const [timeStretch, setTimeStretch] = useState<TimeStretchSettings>(getDefaultTimeStretch());
  const [voiceChange, setVoiceChange] = useState<VoiceChangeSettings>(getDefaultVoiceChange());
  const [hpss, setHpss] = useState<HPSSSettings>(getDefaultHPSS());
  const [denoise, setDenoise] = useState<DenoiseSettings>(getDefaultDenoise());
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const filterChainRef = useRef<{ destroy: () => void }[]>([]);

  // Apply pitch shift and time stretch to audio element
  // Both manipulate playbackRate, so we combine them when both are enabled.
  useEffect(() => {
    if (!audioElement) return;
    const pitchActive = pitchShift.enabled;
    const timeActive = timeStretch.enabled;

    if (pitchActive && timeActive) {
      // Both active: combine rates. preservesPitch=false so pitch shifts.
      // Note: speed will be ratio * pitchRate (can't independently control with playbackRate alone).
      const pitchRate = Math.pow(2, pitchShift.semitones / 12);
      audioElement.playbackRate = timeStretch.ratio * pitchRate;
      audioElement.preservesPitch = false;
    } else if (timeActive) {
      applyTimeStretchToSource(audioElement, timeStretch);
    } else if (pitchActive) {
      applyPitchShiftToSource(audioElement, pitchShift);
    } else {
      audioElement.playbackRate = 1.0;
      audioElement.preservesPitch = true;
    }
  }, [audioElement, pitchShift, timeStretch]);

  // Voice change, HPSS, Denoise: insert filter nodes into the audio chain
  // between masterNode (makeupGain) and ctx.destination.
  useEffect(() => {
    if (!audioContext || !masterNode) return;

    // Tear down previous filter chain and reconnect master → destination
    filterChainRef.current.forEach((f) => f.destroy());
    filterChainRef.current = [];
    try { masterNode.disconnect(); } catch {}
    masterNode.connect(audioContext.destination);

    const activeFilters: { input: AudioNode; output: AudioNode; destroy: () => void }[] = [];

    if (voiceChange.enabled) {
      activeFilters.push(createVoiceChangeFilter(audioContext, voiceChange));
    }
    if (hpss.enabled) {
      activeFilters.push(createHPSSFilter(audioContext, hpss));
    }
    if (denoise.enabled) {
      activeFilters.push(createDenoiseFilter(audioContext, denoise));
    }

    if (activeFilters.length > 0) {
      // Disconnect master → destination, insert filter chain
      try { masterNode.disconnect(audioContext.destination); } catch {}

      let prev: AudioNode = masterNode;
      for (const f of activeFilters) {
        prev.connect(f.input);
        prev = f.output;
      }
      prev.connect(audioContext.destination);
    }

    filterChainRef.current = activeFilters;

    return () => {
      activeFilters.forEach((f) => f.destroy());
      try { masterNode.disconnect(); } catch {}
      masterNode.connect(audioContext.destination);
    };
  }, [audioContext, masterNode, voiceChange, hpss, denoise]);

  // Load saved projects on mount
  useEffect(() => {
    setSavedProjects(listProjectsLocal());
  }, []);

  const handleSaveProject = useCallback(() => {
    const state = serializeProject(songId, songTitle, eq, consoleSettings, fx, isEnhanced);
    const key = `${songId}-${Date.now()}`;
    saveProjectLocal(key, state);
    setSavedProjects(listProjectsLocal());
    setSaveStatus("Project saved!");
    setTimeout(() => setSaveStatus(null), 2000);
  }, [songId, songTitle, eq, consoleSettings, fx, isEnhanced]);

  const handleLoadProject = useCallback((project: SavedProject) => {
    onApplyEQ(project.state.eq);
    onApplyConsole(project.state.console);
    onApplyFX(project.state.fx);
    setSaveStatus(`Loaded: ${project.name}`);
    setTimeout(() => setSaveStatus(null), 2000);
  }, [onApplyEQ, onApplyConsole, onApplyFX]);

  const handleDeleteProject = useCallback((id: string) => {
    deleteProjectLocal(id);
    setSavedProjects(listProjectsLocal());
  }, []);

  const handleExportProject = useCallback(() => {
    const state = serializeProject(songId, songTitle, eq, consoleSettings, fx, isEnhanced);
    exportProjectFile(state);
  }, [songId, songTitle, eq, consoleSettings, fx, isEnhanced]);

  const handleImportProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      const state = deserializeProject(json);
      if (state) {
        onApplyEQ(state.eq);
        onApplyConsole(state.console);
        onApplyFX(state.fx);
        setSaveStatus(`Imported: ${state.songTitle}`);
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        setSaveStatus("Invalid project file");
        setTimeout(() => setSaveStatus(null), 2000);
      }
    };
    reader.readAsText(file);
  }, [onApplyEQ, onApplyConsole, onApplyFX]);

  const tabs: { id: ToolTab; label: string; icon: LucideIcon }[] = [
    { id: "project", label: "Project", icon: Save },
    { id: "pitch", label: "Pitch", icon: Music2 },
    { id: "time", label: "Time", icon: Clock },
    { id: "voice", label: "Voice", icon: Mic2 },
    { id: "hpss", label: "HPSS", icon: Scissors },
    { id: "denoise", label: "Denoise", icon: Waves },
  ];

  return (
    <div className="studio-tools-panel">
      <div className="studio-tools-header">
        <Settings size={12} />
        <span>Studio Production Tools</span>
      </div>

      {/* Tab bar */}
      <div className="studio-tools-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`studio-tool-tab${activeTab === tab.id ? " active" : ""}`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="studio-tools-content">
        {/* Project Save/Load */}
        {activeTab === "project" && (
          <div className="studio-tool-section">
            <div className="studio-tool-row">
              <button type="button" onClick={handleSaveProject} className="btn btn-primary studio-tool-btn">
                <Save size={14} /> Save Project
              </button>
              <button type="button" onClick={handleExportProject} className="btn btn-secondary studio-tool-btn">
                <Download size={14} /> Export JSON
              </button>
              <label className="btn btn-secondary studio-tool-btn">
                <Upload size={14} /> Import JSON
                <input type="file" accept=".json" onChange={handleImportProject} style={{ display: "none" }} />
              </label>
            </div>

            {saveStatus && <div className="studio-tool-status">{saveStatus}</div>}

            {savedProjects.length > 0 && (
              <div className="studio-saved-projects">
                <div className="studio-saved-label">Saved Projects ({savedProjects.length})</div>
                {savedProjects.map((p) => (
                  <div key={p.id} className="studio-saved-item">
                    <div className="studio-saved-info">
                      <span className="studio-saved-name">{p.name}</span>
                      <span className="studio-saved-date">
                        {new Date(p.state.savedAt).toLocaleDateString()} {new Date(p.state.savedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="studio-saved-actions">
                      <button type="button" onClick={() => handleLoadProject(p)} className="studio-saved-load">
                        <FolderOpen size={12} /> Load
                      </button>
                      <button type="button" onClick={() => handleDeleteProject(p.id)} className="studio-saved-delete">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pitch Shift */}
        {activeTab === "pitch" && (
          <div className="studio-tool-section">
            <div className="studio-tool-toggle">
              <label className="studio-tool-check">
                <input
                  type="checkbox"
                  checked={pitchShift.enabled}
                  onChange={(e) => setPitchShift({ ...pitchShift, enabled: e.target.checked })}
                />
                <span>Enable Pitch Shift</span>
              </label>
            </div>
            <div className="studio-tool-knob">
              <label>Semitones</label>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={pitchShift.semitones}
                disabled={!pitchShift.enabled}
                onChange={(e) => setPitchShift({ ...pitchShift, semitones: parseInt(e.target.value) })}
                className="console-slider"
              />
              <span className="studio-tool-value">{pitchShift.semitones > 0 ? "+" : ""}{pitchShift.semitones} st</span>
            </div>
            <div className="studio-tool-knob">
              <label>Formant Shift</label>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={pitchShift.formantShift}
                disabled={!pitchShift.enabled}
                onChange={(e) => setPitchShift({ ...pitchShift, formantShift: parseInt(e.target.value) })}
                className="console-slider"
              />
              <span className="studio-tool-value">{pitchShift.formantShift > 0 ? "+" : ""}{pitchShift.formantShift} st</span>
            </div>
            <p className="studio-tool-hint">Shifts pitch in semitones via playbackRate. Note: this also changes playback speed. True pitch-independent time stretching requires a phase vocoder.</p>
            {pitchShift.enabled && timeStretch.enabled && (
              <div className="studio-tool-status" style={{ background: "rgba(255,179,71,0.1)", color: "#FFB347" }}>
                Both pitch and time stretch are active — rates are combined (speed = ratio × pitch rate).
              </div>
            )}
          </div>
        )}

        {/* Time Stretch */}
        {activeTab === "time" && (
          <div className="studio-tool-section">
            <div className="studio-tool-toggle">
              <label className="studio-tool-check">
                <input
                  type="checkbox"
                  checked={timeStretch.enabled}
                  onChange={(e) => setTimeStretch({ ...timeStretch, enabled: e.target.checked })}
                />
                <span>Enable Time Stretch</span>
              </label>
            </div>
            <div className="studio-tool-knob">
              <label>Speed Ratio</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={timeStretch.ratio}
                disabled={!timeStretch.enabled}
                onChange={(e) => setTimeStretch({ ...timeStretch, ratio: parseFloat(e.target.value) })}
                className="console-slider"
              />
              <span className="studio-tool-value">{timeStretch.ratio.toFixed(2)}x</span>
            </div>
            <div className="studio-tool-toggle">
              <label className="studio-tool-check">
                <input
                  type="checkbox"
                  checked={timeStretch.preservePitch}
                  disabled={!timeStretch.enabled}
                  onChange={(e) => setTimeStretch({ ...timeStretch, preservePitch: e.target.checked })}
                />
                <span>Preserve Pitch</span>
              </label>
            </div>
            <p className="studio-tool-hint">Changes playback speed. Enable "Preserve Pitch" to keep the original key.</p>
          </div>
        )}

        {/* Voice Change */}
        {activeTab === "voice" && (
          <div className="studio-tool-section">
            <div className="studio-tool-toggle">
              <label className="studio-tool-check">
                <input
                  type="checkbox"
                  checked={voiceChange.enabled}
                  onChange={(e) => setVoiceChange({ ...voiceChange, enabled: e.target.checked })}
                />
                <span>Enable Voice Change</span>
              </label>
            </div>
            <div className="studio-tool-knob">
              <label>Formant</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={voiceChange.formant}
                disabled={!voiceChange.enabled}
                onChange={(e) => setVoiceChange({ ...voiceChange, formant: parseFloat(e.target.value) })}
                className="console-slider"
              />
              <span className="studio-tool-value">{voiceChange.formant > 0 ? "+" : ""}{voiceChange.formant.toFixed(1)}</span>
            </div>
            <div className="studio-tool-select">
              <label>Character</label>
              <select
                value={voiceChange.character}
                disabled={!voiceChange.enabled}
                onChange={(e) => setVoiceChange({ ...voiceChange, character: e.target.value as VoiceChangeSettings["character"] })}
              >
                <option value="neutral">Neutral</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="child">Child</option>
                <option value="robot">Robot</option>
                <option value="monster">Monster</option>
              </select>
            </div>
            <p className="studio-tool-hint">Shifts formants to change voice character. Robot adds ring modulation.</p>
          </div>
        )}

        {/* HPSS */}
        {activeTab === "hpss" && (
          <div className="studio-tool-section">
            <div className="studio-tool-toggle">
              <label className="studio-tool-check">
                <input
                  type="checkbox"
                  checked={hpss.enabled}
                  onChange={(e) => setHpss({ ...hpss, enabled: e.target.checked })}
                />
                <span>Enable Harmonic/Percussive Separation</span>
              </label>
            </div>
            <div className="studio-tool-select">
              <label>Mode</label>
              <select
                value={hpss.mode}
                disabled={!hpss.enabled}
                onChange={(e) => setHpss({ ...hpss, mode: e.target.value as HPSSSettings["mode"] })}
              >
                <option value="full">Full (No separation)</option>
                <option value="harmonic">Harmonic Only</option>
                <option value="percussive">Percussive Only</option>
              </select>
            </div>
            <div className="studio-tool-knob">
              <label>Intensity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={hpss.intensity}
                disabled={!hpss.enabled}
                onChange={(e) => setHpss({ ...hpss, intensity: parseFloat(e.target.value) })}
                className="console-slider"
              />
              <span className="studio-tool-value">{Math.round(hpss.intensity * 100)}%</span>
            </div>
            <p className="studio-tool-hint">Isolates harmonic (tonal) or percussive (transient) elements from the mix.</p>
          </div>
        )}

        {/* Denoise */}
        {activeTab === "denoise" && (
          <div className="studio-tool-section">
            <div className="studio-tool-toggle">
              <label className="studio-tool-check">
                <input
                  type="checkbox"
                  checked={denoise.enabled}
                  onChange={(e) => setDenoise({ ...denoise, enabled: e.target.checked })}
                />
                <span>Enable Denoise</span>
              </label>
            </div>
            <div className="studio-tool-knob">
              <label>Threshold</label>
              <input
                type="range"
                min="-60"
                max="-10"
                step="1"
                value={denoise.threshold}
                disabled={!denoise.enabled}
                onChange={(e) => setDenoise({ ...denoise, threshold: parseInt(e.target.value) })}
                className="console-slider"
              />
              <span className="studio-tool-value">{denoise.threshold}dB</span>
            </div>
            <div className="studio-tool-knob">
              <label>Reduction</label>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={denoise.reduction}
                disabled={!denoise.enabled}
                onChange={(e) => setDenoise({ ...denoise, reduction: parseInt(e.target.value) })}
                className="console-slider"
              />
              <span className="studio-tool-value">{denoise.reduction}dB</span>
            </div>
            <div className="studio-tool-knob">
              <label>High-Pass</label>
              <input
                type="range"
                min="20"
                max="300"
                step="10"
                value={denoise.highPass}
                disabled={!denoise.enabled}
                onChange={(e) => setDenoise({ ...denoise, highPass: parseInt(e.target.value) })}
                className="console-slider"
              />
              <span className="studio-tool-value">{denoise.highPass}Hz</span>
            </div>
            <p className="studio-tool-hint">Removes background noise and low-frequency rumble using spectral subtraction.</p>
          </div>
        )}
      </div>
    </div>
  );
}
