"use client";

import TallMeter from "./TallMeter";

type Props = {
  leftAnalyser: AnalyserNode | null;
  rightAnalyser?: AnalyserNode | null;
  vuAnalyser: AnalyserNode | null;
  isPlaying: boolean;
  compressorGR?: number;
  limiterGR?: number;
  height?: number;
};

export default function MeterBridge({
  leftAnalyser,
  rightAnalyser,
  vuAnalyser,
  isPlaying,
  compressorGR = 0,
  limiterGR = 0,
  height = 260,
}: Props) {
  return (
    <div className="meter-bridge">
      <div className="meter-bridge-title">METERS</div>
      <div className="meter-bridge-bank">
        <TallMeter analyser={leftAnalyser ?? vuAnalyser} isPlaying={isPlaying} height={height} label="L" />
        {rightAnalyser && <TallMeter analyser={rightAnalyser} isPlaying={isPlaying} height={height} label="R" />}
        <TallMeter
          analyser={null}
          isPlaying={isPlaying}
          height={height}
          label="GR"
          type="gr"
          minDb={0}
          maxDb={20}
          value={Math.max(compressorGR + limiterGR, 0)}
        />
      </div>
    </div>
  );
}
