"use client";

import { forwardRef } from "react";
import WaveformDisplay from "./WaveformDisplay";

type Props = {
  spectrumStatus: "off" | "ready" | "active";
  audioUrl: string;
  audioElement: HTMLAudioElement | null;
  currentTime: number;
  duration: number;
  isLiveStream: boolean;
  onSeek: (time: number) => void;
};

const ConsoleVisualizer = forwardRef<HTMLCanvasElement, Props>(
  function ConsoleVisualizer(
    { spectrumStatus, audioUrl, audioElement, currentTime, duration, isLiveStream, onSeek },
    canvasRef
  ) {
    return (
      <div className="console-visualizer">
        <div className="console-visualizer-header">
          <span className="console-visualizer-title">Resonance Matrix</span>
          <span
            className={`console-visualizer-badge ${
              spectrumStatus === "active" ? "active" : spectrumStatus === "ready" ? "ready" : "offline"
            }`}
          >
            {spectrumStatus === "active" ? "LIVE" : spectrumStatus === "ready" ? "STANDBY" : "OFFLINE"}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="console-visualizer-canvas"
          style={{ width: "100%", display: "block" }}
        />
        <div className="console-visualizer-waveform">
          <WaveformDisplay
            audioUrl={audioUrl}
            audioElement={audioElement}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            isLiveStream={isLiveStream}
          />
        </div>
      </div>
    );
  }
);

export default ConsoleVisualizer;
