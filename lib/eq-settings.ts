import type { EQBand, EQSettings } from "./types";

const RANDOM_BANDS: EQBand[] = ["low", "mid", "high", "gain"];
const MIN = -12;
const MAX = 12;
const STEP = 0.1;

function randomBandGain(): number {
  const steps = Math.round((MAX - MIN) / STEP);
  const pick = Math.floor(Math.random() * (steps + 1));
  return Math.round((MIN + pick * STEP) * 10) / 10;
}

/** Random starting mix for low/mid/high/gain; 298EQ always starts at 0. */
export function randomStartingSettings(): EQSettings {
  const settings: EQSettings = {
    low: 0,
    mid: 0,
    high: 0,
    gain: 0,
    eq298: 0,
  };
  for (const band of RANDOM_BANDS) {
    settings[band] = randomBandGain();
  }
  return settings;
}
