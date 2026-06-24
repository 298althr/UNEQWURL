"use client";

import type { FXEffectParams } from "@/lib/types";

interface Props {
  params: FXEffectParams;
  onChange: (params: FXEffectParams) => void;
}

export default function PodcastFXControls({ params, onChange }: Props) {
  const update = (key: keyof FXEffectParams, val: unknown) => {
    onChange({ ...params, [key]: val });
  };

  return (
    <>
      {/* Noise Gate */}
      <div className="fx-module">
        <div className="fx-module-header">
          <span className="fx-module-title">Noise Gate</span>
          <div
            className={`fx-toggle${params.noiseGate?.enabled ? " active" : ""}`}
            onClick={() =>
              update("noiseGate", {
                ...params.noiseGate,
                enabled: !params.noiseGate?.enabled,
              })
            }
            role="switch"
            aria-checked={params.noiseGate?.enabled}
          />
        </div>
        {params.noiseGate?.enabled && (
          <div className="fx-params">
            <div className="fx-param">
              <label>Threshold</label>
              <input
                type="range"
                min={-60}
                max={0}
                step={1}
                value={params.noiseGate.threshold}
                onChange={(e) =>
                  update("noiseGate", {
                    ...params.noiseGate,
                    threshold: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.noiseGate.threshold}dB</span>
            </div>
            <div className="fx-param">
              <label>Attack</label>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={params.noiseGate.attack}
                onChange={(e) =>
                  update("noiseGate", {
                    ...params.noiseGate,
                    attack: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.noiseGate.attack}ms</span>
            </div>
            <div className="fx-param">
              <label>Release</label>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={params.noiseGate.release}
                onChange={(e) =>
                  update("noiseGate", {
                    ...params.noiseGate,
                    release: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.noiseGate.release}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* De-esser */}
      <div className="fx-module">
        <div className="fx-module-header">
          <span className="fx-module-title">De-esser</span>
          <div
            className={`fx-toggle${params.deesser?.enabled ? " active" : ""}`}
            onClick={() =>
              update("deesser", {
                ...params.deesser,
                enabled: !params.deesser?.enabled,
              })
            }
            role="switch"
            aria-checked={params.deesser?.enabled}
          />
        </div>
        {params.deesser?.enabled && (
          <div className="fx-params">
            <div className="fx-param">
              <label>Freq</label>
              <input
                type="range"
                min={4000}
                max={12000}
                step={100}
                value={params.deesser.frequency}
                onChange={(e) =>
                  update("deesser", {
                    ...params.deesser,
                    frequency: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.deesser.frequency}Hz</span>
            </div>
            <div className="fx-param">
              <label>Threshold</label>
              <input
                type="range"
                min={-40}
                max={0}
                step={1}
                value={params.deesser.threshold}
                onChange={(e) =>
                  update("deesser", {
                    ...params.deesser,
                    threshold: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.deesser.threshold}dB</span>
            </div>
            <div className="fx-param">
              <label>Reduction</label>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={params.deesser.reduction}
                onChange={(e) =>
                  update("deesser", {
                    ...params.deesser,
                    reduction: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">-{params.deesser.reduction}dB</span>
            </div>
          </div>
        )}
      </div>

      {/* Vocal Comp + EQ Chain */}
      <div className="fx-module">
        <div className="fx-module-header">
          <span className="fx-module-title">Vocal Comp + EQ</span>
          <div
            className={`fx-toggle${params.vocalChain?.enabled ? " active" : ""}`}
            onClick={() =>
              update("vocalChain", {
                ...params.vocalChain,
                enabled: !params.vocalChain?.enabled,
              })
            }
            role="switch"
            aria-checked={params.vocalChain?.enabled}
          />
        </div>
        {params.vocalChain?.enabled && (
          <div className="fx-params">
            <div className="fx-param">
              <label>HPF</label>
              <input
                type="range"
                min={40}
                max={200}
                step={5}
                value={params.vocalChain.hpfFreq}
                onChange={(e) =>
                  update("vocalChain", {
                    ...params.vocalChain,
                    hpfFreq: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.vocalChain.hpfFreq}Hz</span>
            </div>
            <div className="fx-param">
              <label>Presence</label>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={params.vocalChain.presenceBoost}
                onChange={(e) =>
                  update("vocalChain", {
                    ...params.vocalChain,
                    presenceBoost: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">+{params.vocalChain.presenceBoost}dB</span>
            </div>
            <div className="fx-param">
              <label>Threshold</label>
              <input
                type="range"
                min={-40}
                max={0}
                step={1}
                value={params.vocalChain.compThreshold}
                onChange={(e) =>
                  update("vocalChain", {
                    ...params.vocalChain,
                    compThreshold: Number(e.target.value),
                  })
                }
              />
              <span className="fx-param-value">{params.vocalChain.compThreshold}dB</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
