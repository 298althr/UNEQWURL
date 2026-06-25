"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Cloud, X } from "lucide-react";
import type { CategoryKey } from "@/lib/brand";
import { CATEGORY_MAP } from "@/lib/brand";

interface Track {
  id: string;
  title: string;
  artist: string;
  source: "upload" | "youtube";
  cover_image?: string | null;
}

interface ConsolePickerModalProps {
  isOpen: boolean;
  category: CategoryKey | null;
  tracks: Track[];
  onClose: () => void;
  onSelectTrack: (trackId: string) => void;
}

export default function ConsolePickerModal({
  isOpen,
  category,
  tracks,
  onClose,
  onSelectTrack,
}: ConsolePickerModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    }
  }, [isOpen]);

  const config = category ? CATEGORY_MAP[category] : null;

  return (
    <AnimatePresence>
      {isOpen && mounted && config && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/70 backdrop-blur-[8px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-[560px] bg-surface border-t border-border rounded-t-[20px] p-6 max-h-[80vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-[10px] text-base font-bold text-text">
                <span
                  className="w-3 h-3 inline-block rounded-[3px]"
                  style={{ backgroundColor: config.colorValue }}
                />
                {config.label} Tracks
              </div>
              <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">
                <X size={20} />
              </button>
            </div>

            {/* Track list */}
            {tracks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {tracks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-white/[0.04] border border-border rounded-[10px] p-3 transition-colors hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={t.cover_image || config.photo}
                        alt=""
                        className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-text truncate">{t.title}</div>
                        <div className="text-[11px] text-muted truncate flex items-center gap-1">
                          {t.source === "youtube" && <Cloud size={10} className="text-accent" />}
                          {t.artist}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectTrack(t.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-all hover:scale-105 flex-shrink-0"
                      style={{
                        backgroundColor: `${config.colorValue}15`,
                        color: config.colorValue,
                        border: `1px solid ${config.colorValue}30`,
                      }}
                    >
                      <SlidersHorizontal size={14} />
                      Console
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[13px] text-muted mb-4">
                  No {config.label.toLowerCase()} tracks yet.
                </p>
                <p className="text-[12px] text-muted">
                  Upload tracks from the Dashboard to get started.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
