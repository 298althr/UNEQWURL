"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Gauge, Target, Scale, ShieldAlert, Zap } from "lucide-react";
import type { LearningIndicators, IndicatorResult, BandKey } from "@/lib/indicators";
import { STATUS_COLORS, BAND_INFO } from "@/lib/indicators";
import type { EQSettings } from "@/lib/types";

type Props = {
  indicators: LearningIndicators;
  settings: EQSettings;
};

function IndicatorBar({ result, icon, title }: { result: IndicatorResult; icon: React.ReactNode; title: string }) {
  const colors = STATUS_COLORS[result.status];
  return (
    <div className="indicator-row">
      <div className="indicator-header">
        <span className="indicator-icon" style={{ color: colors.fg }}>{icon}</span>
        <span className="indicator-title">{title}</span>
        <span className="indicator-value" style={{ color: colors.fg }}>
          {Math.round(result.value)}%
        </span>
      </div>
      <div className="indicator-track">
        <div
          className="indicator-fill"
          style={{
            width: `${Math.max(2, result.value)}%`,
            background: colors.fg,
          }}
        />
      </div>
      <div className="indicator-label-row">
        <span className="indicator-label" style={{ color: colors.fg }}>{result.label}</span>
        {result.primaryBand && (
          <span className="indicator-band-tag">
            {BAND_INFO[result.primaryBand].label}
          </span>
        )}
      </div>
      <p className="indicator-hint">{result.hint}</p>
    </div>
  );
}

function BandContributionRow({ band, settings, contribution }: {
  band: BandKey;
  settings: EQSettings;
  contribution: { diff: number; impact: number; direction: "up" | "down" | "flat" };
}) {
  const info = BAND_INFO[band];
  const value = settings[band];
  const isOff = Math.abs(contribution.diff) < 0.5;
  const impactPct = Math.min(100, contribution.impact);

  let impactColor = "#71717a";
  if (!isOff) {
    if (impactPct < 15) impactColor = "#22c55e";
    else if (impactPct < 35) impactColor = "#eab308";
    else impactColor = "#ef4444";
  }

  const directionIcon = contribution.direction === "up" ? "↑" : contribution.direction === "down" ? "↓" : "—";

  return (
    <div className="band-contrib-row">
      <span className="band-contrib-label">{info.label}</span>
      <div className="band-contrib-bar">
        {/* Center line */}
        <div className="band-contrib-center" />
        {/* Value marker */}
        <div
          className="band-contrib-marker"
          style={{
            left: `${50 + (value / 12) * 50}%`,
            background: isOff ? "#71717a" : impactColor,
          }}
        />
      </div>
      <span className="band-contrib-value" style={{ color: isOff ? "#71717a" : impactColor }}>
        {value > 0 ? "+" : ""}{value.toFixed(1)}
      </span>
      <span className="band-contrib-dir" style={{ color: isOff ? "#71717a" : impactColor }}>
        {directionIcon}
      </span>
    </div>
  );
}

export default function LearningIndicators({ indicators, settings }: Props) {
  const { soundQuality, maxAttainable, spectralBalance, headroom, engagement, bandContributions, trend } = indicators;

  const trendIcon = useMemo(() => {
    if (trend === "improving") return <TrendingUp size={12} className="trend-icon improving" />;
    if (trend === "declining") return <TrendingDown size={12} className="trend-icon declining" />;
    return <Minus size={12} className="trend-icon stable" />;
  }, [trend]);

  return (
    <div className="learning-indicators">
      <div className="indicators-header">
        <span className="indicators-title">
          <Zap size={14} />
          Learning Indicators
        </span>
        {soundQuality && trendIcon}
      </div>

      {/* Dual indicator: Current vs Max Attainable */}
      {soundQuality && maxAttainable && (
        <div className="dual-indicator">
          <div className="dual-indicator-item">
            <div className="dual-indicator-label">Your Score</div>
            <div
              className="dual-indicator-value"
              style={{ color: STATUS_COLORS[soundQuality.status].fg }}
            >
              {Math.round(soundQuality.value)}%
            </div>
          </div>
          <div className="dual-indicator-divider" />
          <div className="dual-indicator-item">
            <div className="dual-indicator-label">Max Attainable</div>
            <div className="dual-indicator-value max-attainable">100%</div>
          </div>
          <div className="dual-indicator-divider" />
          <div className="dual-indicator-item">
            <div className="dual-indicator-label">Gap</div>
            <div className="dual-indicator-value gap">
              {(100 - soundQuality.value).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Individual indicators */}
      {soundQuality && (
        <IndicatorBar result={soundQuality} icon={<Gauge size={12} />} title="Sound Quality" />
      )}
      {maxAttainable && (
        <IndicatorBar result={maxAttainable} icon={<Target size={12} />} title="Max Attainable" />
      )}
      <IndicatorBar result={spectralBalance} icon={<Scale size={12} />} title="Spectral Balance" />
      <IndicatorBar result={headroom} icon={<ShieldAlert size={12} />} title="Headroom Safety" />
      <IndicatorBar result={engagement} icon={<Zap size={12} />} title="Engagement" />

      {/* Per-band contributions */}
      <div className="band-contributions">
        <div className="band-contrib-header">Per-Band Impact</div>
        {(Object.keys(BAND_INFO) as BandKey[]).map(band => (
          <BandContributionRow
            key={band}
            band={band}
            settings={settings}
            contribution={bandContributions[band]}
          />
        ))}
      </div>
    </div>
  );
}
