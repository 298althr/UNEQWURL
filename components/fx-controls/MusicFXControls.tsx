"use client";

import type { FXEffectParams } from "@/lib/types";

interface Props {
  params: FXEffectParams;
  onChange: (params: FXEffectParams) => void;
}

export default function MusicFXControls({ params, onChange }: Props) {
  const update = (key: keyof FXEffectParams, val: unknown) => {
    onChange({ ...params, [key]: val });
  };

  return (
    <>
      {/* Multiband Compressor */}
      <div className="fx-module">
        <div className="fx-module-header">
          <span className="fx-module-title">Multiband Compressor</span>
          <div
            className={`fx-toggle${params.multiband?.enabled ? " active" : ""}`}
            onClick={() =>
              update("multiband", {
                ...params.multiband,
                enabled: !params.multiband?.enabled,
              })
            }
            role="switch"
            aria-checked={params.multiband?.enabled}
          />
        </div>
        {params.multiband?.enabled && (
          <div className="fx-params">
            <div className="fx-param">
              <label>Low Ratio</label>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={params.multiband.lowRatio}
                onChange={(e) =>
                  update("multiband", {
                    ...params.multiband,
                    lowRatio: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.multiband.lowRatio}:1</span>
            </div>
            <div className="fx-param">
              <label>Mid Ratio</label>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={params.multiband.midRatio}
                onChange={(e) =>
                  update("multiband", {
                    ...params.multiband,
                    midRatio: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.multiband.midRatio}:1</span>
            </div>
            <div className="fx-param">
              <label>High Ratio</label>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={params.multiband.highRatio}
                onChange={(e) =>
                  update("multiband", {
                    ...params.multiband,
                    highRatio: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.multiband.highRatio}:1</span>
            </div>
          </div>
        )}
      </div>

      {/* Reverb */}
      <div className="fx-module">
        <div className="fx-module-header">
          <span className="fx-module-title">Reverb</span>
          <div
            className={`fx-toggle${params.reverb?.enabled ? " active" : ""}`}
            onClick={() =>
              update("reverb", {
                ...params.reverb,
                enabled: !params.reverb?.enabled,
              })
            }
            role="switch"
            aria-checked={params.reverb?.enabled}
          />
        </div>
        {params.reverb?.enabled && (
          <div className="fx-params">
            <div className="fx-param">
              <label>Type</label>
              <select
                value={params.reverb.type}
                onChange={(e) =>
                  update("reverb", {
                    ...params.reverb,
                    type: e.target.value as "plate" | "hall",
                  })
                }
                style={{ background: "var(--surface)", color: "var(--fg)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "4px", fontSize: "11px" }}
              >
                <option value="plate">Plate</option>
                <option value="hall">Hall</option>
              </select>
            </div>
            <div className="fx-param">
              <label>Wet Mix</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={params.reverb.wetMix}
                onChange={(e) =>
                  update("reverb", {
                    ...params.reverb,
                    wetMix: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{Math.round(params.reverb.wetMix * 100)}%</span>
            </div>
          </div>
        )}
      </div>

    </>
  );
}
