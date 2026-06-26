"use client";

import { forwardRef } from "react";
import ConsoleTransport from "./ConsoleTransport";
import ConsoleChannelStrip from "./ConsoleChannelStrip";
import ConsoleMasterSection from "./ConsoleMasterSection";
import ConsoleVisualizer from "./ConsoleVisualizer";
import MeterBridge from "./MeterBridge";
import SCADAMetricsBar from "./SCADAMetricsBar";
import MinimalPlayer from "./MinimalPlayer";
import ImperfectionPanel from "./ImperfectionPanel";
import type { EQBand, EQSettings, SoundClass } from "@/lib/types";
import type { ConsoleSettings } from "@/lib/audio-chain";
import type { ImperfectionConfig, ImperfectionMetrics } from "@/lib/imperfection-types";

type Props = {
  // Track
  songTitle: string;
  songArtist: string | null;
  songAlbum: string | null;
  songGenre: string | null;
  songCoverImage?: string | null;
  songUrl: string;
  uploadType: SoundClass;
  bpm?: number | null;
  musicalKey?: string | null;
  // Playback
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioElement: HTMLAudioElement | null;
  onTogglePlay: () => void;
  onStop: () => void;
  onRewind: () => void;
  onSeek: (time: number) => void;
  isEnhanced: boolean;
  onToggleAB: () => void;
  // EQ
  eqSettings: EQSettings;
  onEqChange: (band: EQBand, value: number) => void;
  // FX
  fxMacroValue: number;
  onFxMacroChange: (value: number) => void;
  // Console
  consoleSettings: ConsoleSettings;
  onConsoleChange: (settings: ConsoleSettings) => void;
  // Imperfections
  imperfectionConfig: ImperfectionConfig;
  onImperfectionChange: (config: ImperfectionConfig) => void;
  imperfectionMetrics: ImperfectionMetrics;
  onSaveImperfectionProfile?: () => void;
  onResetImperfectionProfile?: () => void;
  isSavingImperfectionProfile?: boolean;
  // Visualizers
  spectrumStatus: "off" | "ready" | "active";
  vuAnalyser: AnalyserNode | null;
  isLiveStream?: boolean;
  // Meters
  compressorGR: number;
  limiterGR: number;
  // Error
  error: string | null;
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  music: "https://images.unsplash.com/photo-1670978046-7cd3fab1f21d?w=120",
  podcast: "https://images.unsplash.com/photo-1581368135153-a5068a45f9a9?w=120",
  live: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120",
  stream: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120",
};

const LecturerConsole = forwardRef<HTMLCanvasElement, Props>(function LecturerConsole(
  {
    songTitle,
    songArtist,
    songAlbum,
    songGenre,
    songCoverImage,
    songUrl,
    uploadType,
    bpm,
    musicalKey,
    isPlaying,
    currentTime,
    duration,
    audioElement,
    onTogglePlay,
    onStop,
    onRewind,
    onSeek,
    isEnhanced,
    onToggleAB,
    eqSettings,
    onEqChange,
    fxMacroValue,
    onFxMacroChange,
    consoleSettings,
    onConsoleChange,
    imperfectionConfig,
    onImperfectionChange,
    imperfectionMetrics,
    onSaveImperfectionProfile,
    onResetImperfectionProfile,
    isSavingImperfectionProfile,
    spectrumStatus,
    vuAnalyser,
    isLiveStream = false,
    compressorGR,
    limiterGR,
    error,
  },
  canvasRef
) {
  return (
    <div className="lecturer-console">
      {/* Top bar: minimal player + transport + metrics */}
      <div className="console-top-bar">
        <MinimalPlayer
          audioElement={audioElement}
          coverImage={songCoverImage || CATEGORY_FALLBACK_IMAGES[uploadType] || CATEGORY_FALLBACK_IMAGES.music}
          title={songTitle}
          artist={songArtist}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={onTogglePlay}
          onStop={onStop}
          onRewind={onRewind}
          onSeek={onSeek}
        />
        <ConsoleTransport
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlay={onTogglePlay}
          onStop={onStop}
          onRewind={onRewind}
          isEnhanced={isEnhanced}
          onToggleAB={onToggleAB}
        />
        <SCADAMetricsBar
          analyser={vuAnalyser}
          isPlaying={isPlaying}
          bpm={bpm}
          musicalKey={musicalKey}
        />
      </div>

      {/* Main console grid */}
      <div className="console-main-grid">
        <div className="console-left-rack">
          <ConsoleChannelStrip
            settings={eqSettings}
            onChange={onEqChange}
            macroValue={fxMacroValue}
            onMacroChange={onFxMacroChange}
            uploadType={uploadType}
          />
        </div>

        <div className="console-center-rack">
          <ConsoleVisualizer
            ref={canvasRef}
            spectrumStatus={spectrumStatus}
            audioUrl={songUrl}
            audioElement={audioElement}
            currentTime={currentTime}
            duration={duration}
            isLiveStream={isLiveStream}
            onSeek={onSeek}
          />
        </div>

        <div className="console-right-rack">
          <ConsoleMasterSection
            settings={consoleSettings}
            onChange={onConsoleChange}
            outputDb={-6}
          />
          <MeterBridge
            leftAnalyser={vuAnalyser}
            vuAnalyser={vuAnalyser}
            isPlaying={isPlaying}
            compressorGR={compressorGR}
            limiterGR={limiterGR}
          />
          <ImperfectionPanel
            config={imperfectionConfig}
            onChange={onImperfectionChange}
            metrics={imperfectionMetrics}
            onSaveProfile={onSaveImperfectionProfile}
            onReset={onResetImperfectionProfile}
            isSaving={isSavingImperfectionProfile}
          />
        </div>
      </div>

      {error && (
        <div className="console-error">
          {error}
        </div>
      )}
    </div>
  );
});

export default LecturerConsole;
