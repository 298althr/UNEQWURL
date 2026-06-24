"use client";

import { motion } from "framer-motion";
import { Cloud, Volume2 } from "lucide-react";
import type { CategoryKey } from "@/lib/brand";
import { CATEGORY_MAP } from "@/lib/brand";

interface SourceCardProps {
  category: CategoryKey;
  latestTitle?: string | null;
  latestArtist?: string | null;
  isActive?: boolean;
  isYoutube?: boolean;
  onClick: () => void;
}

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  music: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <circle cx="18" cy="16" r="3"></circle>
    </svg>
  ),
  podcast: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" x2="12" y1="19" y2="22"></line>
    </svg>
  ),
  live: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M19.1 4.9c3.9 3.9 3.9 10.2 0 14.1M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M12 12h.01"></path>
    </svg>
  ),
  stream: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  ),
};

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  music: "hsl(27, 93%, 60%)",
  podcast: "#00a6ff",
  live: "#ff0056",
  stream: "#6500ff",
};

export default function SourceCard({
  category,
  latestTitle,
  latestArtist,
  isActive = false,
  isYoutube = false,
  onClick,
}: SourceCardProps) {
  const config = CATEGORY_MAP[category];
  const color = CATEGORY_COLORS[category];
  const hasLatest = !!latestTitle;

  return (
    <motion.div
      className={`source-card group relative overflow-hidden cursor-pointer flex flex-col justify-end items-start rounded-r-xl border border-border bg-surface transition-all duration-[250ms] ease-spring-custom hover:bg-white/[0.04] ${category}`}
      style={{
        minHeight: "calc(220px * var(--density-pad, 1))",
        padding: 0,
      }}
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -6 }}
      whileTap={{ scale: 0.98, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Full-bleed Album Art Photo */}
      <div
        className="absolute inset-0 bg-cover bg-center z-[1]"
        style={{ backgroundImage: `url(${config.photo})` }}
      />

      {/* Strong gradient overlay for text legibility */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Content Canvas */}
      <div
        className="relative z-[3] w-full"
        style={{ padding: "calc(24px * var(--density-pad, 1))" }}
      >
        {/* Small category icon — top-left, subtle */}
        <div
          className="flex items-center justify-center mb-4 rounded-[10px] border"
          style={{
            width: "32px",
            height: "32px",
            background: "rgba(0,0,0,0.35)",
            borderColor: "rgba(255,255,255,0.12)",
            color: color,
          }}
        >
          {CATEGORY_ICONS[category]}
        </div>

        <h3
          className="source-title font-bold text-white mb-1 transition-colors duration-200"
          style={{
            fontSize: "calc(18px * var(--density-font, 1))",
            textShadow: "0 2px 8px rgba(0,0,0,0.9)",
          }}
        >
          {config.label}
        </h3>
        <p
          className="source-subtitle text-white/90 leading-tight"
          style={{
            fontSize: "calc(13px * var(--density-font, 1))",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
          }}
        >
          {hasLatest
            ? `${latestTitle} · ${latestArtist}`
            : `Tap to select a ${config.label.toLowerCase()} track`}
        </p>

        {/* Top-right badges */}
        <div className="absolute top-0 right-0 flex gap-1">
          {isYoutube && (
            <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(0,0,0,0.45)", color, backdropFilter: "blur(4px)" }}>
              <Cloud size={12} /> YouTube
            </div>
          )}
          {isActive && (
            <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(0,0,0,0.45)", color, backdropFilter: "blur(4px)" }}>
              <Volume2 size={12} /> Active
            </div>
          )}
        </div>
      </div>

      {/* Spring Animated Edge Highlight Accent Line */}
      <div
        className="absolute bottom-0 left-0 w-full h-[3px] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-center z-[4]"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
}
