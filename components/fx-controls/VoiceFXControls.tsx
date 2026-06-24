"use client";

import type { FXEffectParams } from "@/lib/types";

interface Props {
  params: FXEffectParams;
  onChange: (params: FXEffectParams) => void;
}

export default function VoiceFXControls({ params, onChange }: Props) {
  const update = (key: keyof FXEffectParams, val: unknown) => {
    onChange({ ...params, [key]: val });
  };

  return (
    <>
      {/* Pitch Correction */}
      <div className="fx-module">
        <div className="fx-module-header">
          <span className="fx-module-title">Pitch Correction</span>
          <div
            className={`fx-toggle${params.pitchCorrection?.enabled ? " active" : ""}`}
            onClick={() =>
              update("pitchCorrection", {
                ...params.pitchCorrection,
                enabled: !params.pitchCorrection?.enabled,
              })
            }
            role="switch"
            aria-checked={params.pitchCorrection?.enabled}
          />
        </div>
        {params.pitchCorrection?.enabled && (
          <div className="fx-params">
            <div className="fx-param">
              <label>Speed</label>
              <input
                type="range"
                min={0.01}
                max={1}
                step={0.01}
                value={params.pitchCorrection.speed}
                onChange={(e) =>
                  update("pitchCorrection", {
                    ...params.pitchCorrection,
                    speed: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{Math.round(params.pitchCorrection.speed * 100)}%</span>
            </div>
            <div className="fx-param">
              <label>Amount</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={params.pitchCorrection.amount}
                onChange={(e) =>
                  update("pitchCorrection", {
                    ...params.pitchCorrection,
                    amount: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{Math.round(params.pitchCorrection.amount * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Parallel Compression */}
      <div className="fx-module">
        <div className="fx-module-header">
          <span className="fx-module-title">Parallel Comp</span>
          <div
            className={`fx-toggle${params.parallelComp?.enabled ? " active" : ""}`}
            onClick={() =>
              update("parallelComp", {
                ...params.parallelComp,
                enabled: !params.parallelComp?.enabled,
              })
            }
            role="switch"
            aria-checked={params.parallelComp?.enabled}
          />
        </div>
        {params.parallelComp?.enabled && (
          <div className="fx-params">
            <div className="fx-param">
              <label>Blend</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={params.parallelComp.blend}
                onChange={(e) =>
                  update("parallelComp", {
                    ...params.parallelComp,
                    blend: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{Math.round(params.parallelComp.blend * 100)}%</span>
            </div>
            <div className="fx-param">
              <label>Ratio</label>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={params.parallelComp.compressionRatio}
                onChange={(e) =>
                  update("parallelComp", {
                    ...params.parallelComp,
                    compressionRatio: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.parallelComp.compressionRatio}:1</span>
            </div>
          </div>
        )}
      </div>

      {/* Plate Reverb */}
      <div className="fx-module">
        <div className="fx-module-header">
          <span className="fx-module-title">Plate Reverb</span>
          <div
            className={`fx-toggle${params.plateReverb?.enabled ? " active" : ""}`}
            onClick={() =>
              update("plateReverb", {
                ...params.plateReverb,
                enabled: !params.plateReverb?.enabled,
              })
            }
            role="switch"
            aria-checked={params.plateReverb?.enabled}
          />
        </div>
        {params.plateReverb?.enabled && (
          <div className="fx-params">
            <div className="fx-param">
              <label>Wet Mix</label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={params.plateReverb.wetMix}
                onChange={(e) =>
                  update("plateReverb", {
                    ...params.plateReverb,
                    wetMix: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{Math.round(params.plateReverb.wetMix * 100)}%</span>
            </div>
            <div className="fx-param">
              <label>Decay</label>
              <input
                type="range"
                min={0.3}
                max={3}
                step={0.1}
                value={params.plateReverb.decay}
                onChange={(e) =>
                  update("plateReverb", {
                    ...params.plateReverb,
                    decay: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.plateReverb.decay}s</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
