"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Cloud, X } from "lucide-react";
import type { CategoryKey } from "@/lib/brand";
import { CATEGORY_MAP } from "@/lib/brand";

interface Track {
  id: string;
  title: string;
  artist: string;
  source: "upload" | "youtube";
  cover_image?: string | null;
}

interface PickerModalProps {
  isOpen: boolean;
  category: CategoryKey | null;
  tracks: Track[];
  onClose: () => void;
  onSelectTrack: (trackId: string) => void;
  onStream: (url: string) => void;
  onImport: (url: string) => void;
}

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  music: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
    </svg>
  ),
  podcast: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line>
    </svg>
  ),
  live: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M19.1 4.9c3.9 3.9 3.9 10.2 0 14.1M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M12 12h.01"></path>
    </svg>
  ),
  stream: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  ),
};

export default function PickerModal({
  isOpen,
  category,
  tracks,
  onClose,
  onSelectTrack,
  onStream,
  onImport,
}: PickerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [streamLoading, setStreamLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setYoutubeUrl("");
      setError(null);
    }
  }, [isOpen]);

  const config = category ? CATEGORY_MAP[category] : null;

  const handleStream = () => {
    if (!youtubeUrl.trim()) { setError("Enter a YouTube URL"); return; }
    setStreamLoading(true); setError(null);
    onStream(youtubeUrl.trim());
    setStreamLoading(false);
  };

  const handleImport = () => {
    if (!youtubeUrl.trim()) { setError("Enter a YouTube URL"); return; }
    setImportLoading(true); setError(null);
    onImport(youtubeUrl.trim());
    setImportLoading(false);
  };

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
                Select {config.label} Target Track
              </div>
              <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">
                <X size={20} />
              </button>
            </div>

            {/* Track list */}
            {tracks.length > 0 ? (
              <div className="flex flex-col gap-2 mb-4">
                {tracks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTrack(t.id)}
                    className="flex items-center justify-between bg-white/[0.04] border border-border rounded-[10px] p-3 cursor-pointer hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={t.cover_image || (category ? CATEGORY_MAP[category].photo : "")} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-text ellipsis">{t.title}</div>
                        <div className="text-[11px] text-muted">{t.artist}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {t.source === "youtube" && <Cloud size={14} className="text-accent" />}
                      <Play size={14} className="text-gold" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted mb-4">
                No saved tracks in this category.
              </p>
            )}

            {/* YouTube section */}
            <div className="relative h-px bg-border my-6">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 text-[11px] font-bold text-muted uppercase tracking-wider">
                Or Stream from YouTube
              </span>
            </div>

            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube URL..."
              className="w-full bg-input-bg border border-border text-text font-mono text-[13px] p-3 rounded-[10px] mb-4 outline-none focus:border-border-hover transition-colors"
            />

            {error && (
              <p className="text-[12px] text-red-400 mb-3">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleStream}
                disabled={streamLoading || !youtubeUrl.trim()}
                className="bg-gold text-black rounded-r-full p-3 text-[13px] font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-1.5"
              >
                {streamLoading ? "Starting..." : "Stream & Mix"}
              </button>
              <button
                onClick={handleImport}
                disabled={importLoading || !youtubeUrl.trim()}
                className="bg-transparent text-text border border-border rounded-r-full p-3 text-[13px] font-bold hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                {importLoading ? "Importing..." : "Import & Mix"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
