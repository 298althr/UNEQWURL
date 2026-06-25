"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageLogo from "@/components/PageLogo";
import ConsolePickerModal from "@/components/ConsolePickerModal";
import { CATEGORIES, APP_NAME, APP_TAGLINE, type CategoryKey } from "@/lib/brand";
import { Music, Radio, Mic, Cloud, SlidersHorizontal, Shield, BookOpen } from "lucide-react";

type Track = {
  id: string;
  upload_type: CategoryKey;
  source: "upload" | "youtube";
  youtube_url: string | null;
  original_filename: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  cover_image: string | null;
  file_size_bytes: number;
  file_url: string;
  created_at: string;
};

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  music: <Music size={20} />,
  podcast: <Radio size={20} />,
  live: <Mic size={20} />,
  stream: <Cloud size={20} />,
};

export default function ConsolePage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pickerType, setPickerType] = useState<CategoryKey | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/uploads").then(r => r.ok ? r.json() : []),
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
    ]).then(([u, m]) => {
      setUploads(u);
      if (m?.role === "admin") setIsAdmin(true);
    })
      .catch(err => console.error("Load failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const tracksByType = (type: CategoryKey) => uploads.filter(u => u.upload_type === type);

  function openPicker(type: CategoryKey) {
    setPickerType(type);
  }

  function handleSelectTrack(trackId: string) {
    setPickerType(null);
    router.push(`/room/${trackId}`);
  }

  const pickerTracks = pickerType
    ? tracksByType(pickerType).map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        source: t.source,
        cover_image: t.cover_image,
      }))
    : [];

  return (
    <div className="container mx-auto min-h-screen console-page">
      {/* Header */}
      <header className="header header-with-profile header-desktop-row">
        <PageLogo page="console" />
        <div className="header-desktop-nav">
          <DesktopNav />
        </div>
        <div className="flex items-center gap-3 header-desktop-actions">
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors">
              <Shield size={14} />Admin Panel
            </Link>
          )}
          <ProfileDropdown />
        </div>
      </header>

      {/* Hero */}
      <section className="hero relative overflow-hidden rounded-2xl mb-8">
        <div className="page-hero-bg absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: "url('/assets/hero/console.png')" }} />
        <div className="page-hero-overlay absolute inset-0 pointer-events-none z-[1]" />
        <div className="relative z-[2] p-10 md:p-14">
          <div className="hero-badge">{APP_TAGLINE}</div>
          <h1>Open the <span className="gradient-text">Console</span></h1>
          <p>Pick a track below to launch the {APP_NAME} mixing console. Tune the EQ, A/B your mix, and submit your settings.</p>
          <div className="hero-actions">
            <Link href="/docs/console-guide" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <BookOpen size={16} />
              Console Guide
            </Link>
          </div>
        </div>
      </section>

      {/* Category Cards */}
      <section className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => openPicker(cat.id)}
              className="rounded-2xl overflow-hidden"
              style={{ height: 200 }}
            >
              <img src={cat.photo} alt={cat.label} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </section>

      <BottomNav />

      {/* Console Picker Modal */}
      <ConsolePickerModal
        isOpen={!!pickerType}
        category={pickerType}
        tracks={pickerTracks}
        onClose={() => setPickerType(null)}
        onSelectTrack={handleSelectTrack}
      />
    </div>
  );
}
