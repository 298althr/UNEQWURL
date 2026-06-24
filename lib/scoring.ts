import type { EQSettings } from "./types";

const RANGE = 24;

export function computeScore(
  user: EQSettings,
  benchmark: EQSettings,
  weights: EQSettings
): {
  score: number;
  breakdown: Record<string, { diff: number; weighted: number }>;
} {
  const breakdown: Record<string, { diff: number; weighted: number }> = {};
  let penalty = 0;

  for (const key of Object.keys(benchmark) as (keyof EQSettings)[]) {
    const diff = Math.abs(user[key] - benchmark[key]);
    const normalizedPenalty = (diff / RANGE) * 100;
    const weighted = normalizedPenalty * weights[key];
    breakdown[key] = { diff, weighted };
    penalty += weighted;
  }

  return {
    score: Math.max(0, Math.round((100 - penalty) * 100) / 100),
    breakdown,
  };
}

export function isValidSettings(value: unknown): value is EQSettings {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const keys: (keyof EQSettings)[] = ["low", "mid", "high", "gain", "eq298"];
  return keys.every(
    (k) => typeof obj[k] === "number" && obj[k] >= -12 && obj[k] <= 12
  );
}
