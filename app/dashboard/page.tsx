"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageLogo from "@/components/PageLogo";
import PickerModal from "@/components/PickerModal";
import { CATEGORIES, APP_NAME, APP_TAGLINE, type CategoryKey } from "@/lib/brand";
import { Music, Radio, Mic, Shield, Cloud, Download, Volume2, BookOpen } from "lucide-react";

/* ─── types ─── */
type UserSession = {
  id: string;
  song_title: string;
  session_start: string;
  session_end: string;
  average_298eq: number;
  final_settings: { eq298: number };
  ab_toggles: number;
  created_at: string;
};

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

type ActiveSession = {
  id: string;
  title: string;
  artist: string;
  type: CategoryKey;
  isStream: boolean;
  streamUrl?: string;
  youtubeUrl?: string;
};

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  music: <Music size={16} />,
  podcast: <Radio size={16} />,
  live: <Mic size={16} />,
  stream: <Cloud size={16} />,
};

const UPLOAD_TYPES = CATEGORIES.map(c => ({
  key: c.id,
  label: c.label,
  color: c.id === "music" ? "hsl(320,90%,55%)" : c.colorValue,
  icon: CATEGORY_ICONS[c.id],
  photo: c.photo,
}));

export default function SongsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [uploads, setUploads] = useState<Track[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Active session state
  const [activeByType, setActiveByType] = useState<Record<CategoryKey, ActiveSession | null>>({ music: null, podcast: null, live: null, stream: null });
  useEffect(() => {
    try { const raw = localStorage.getItem("298eq_active_sessions"); if (raw) setActiveByType(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);
  useEffect(() => { localStorage.setItem("298eq_active_sessions", JSON.stringify(activeByType)); }, [activeByType]);

  // Picker modal state
  const [pickerType, setPickerType] = useState<CategoryKey | null>(null);

  // YouTube engine state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeType, setYoutubeType] = useState<CategoryKey>("music");
  const [streamLoading, setStreamLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    Promise.all([
      fetch("/api/session-analytics").then(r => r.ok ? r.json() : []),
      fetch("/api/uploads").then(r => r.ok ? r.json() : []),
      fetch("/api/songs").then(r => r.ok ? r.json() : []),
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
    ]).then(([s, u, songs, m]) => {
      setSessions(s.slice(0, 5));
      // Merge user uploads with admin/default songs
      const mergedTracks = [
        ...songs.map((song: any) => ({
          ...song,
          source: "upload",
          upload_type: song.upload_type || "music",
          artist: song.artist || "Unknown Artist",
          file_size_bytes: 0,
          cover_image: null,
          album: null,
          genre: "Default",
          created_at: new Date().toISOString()
        })),
        ...u
      ];
      setUploads(mergedTracks);
      if (m?.role === "admin") setIsAdmin(true);
    })
      .catch(err => console.error("Background load failed:", err))
      .finally(() => setLoadingExtras(false));
  }, []);

  const tracksByType = (type: CategoryKey) => uploads.filter(u => u.upload_type === type);
  const latestByType = (type: CategoryKey) => tracksByType(type)[0] || null;

  function openPicker(type: CategoryKey) {
    setPickerType(type);
    setYoutubeType(type);
    setEngineMessage(null);
  }

  async function handleStreamAndMix() {
    if (!youtubeUrl.trim()) { setEngineMessage("Enter a YouTube URL"); return; }
    setStreamLoading(true); setEngineMessage(null);
    try {
      const res = await fetch("/api/youtube/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: youtubeUrl.trim() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Stream failed");
      const params = new URLSearchParams({ url: data.streamUrl, type: youtubeType, title: data.title, artist: data.artist, youtubeUrl: youtubeUrl.trim() });
      setActiveByType(prev => ({ ...prev, [youtubeType]: { id: `live-${Date.now()}`, title: data.title, artist: data.artist, type: youtubeType, isStream: true, streamUrl: data.streamUrl, youtubeUrl: youtubeUrl.trim() } }));
      setPickerType(null);
      router.push(`/room/stream?${params.toString()}`);
    } catch (err: any) { setEngineMessage(err?.message || "Failed to start stream"); }
    finally { setStreamLoading(false); }
  }

  async function handleImportAndMix() {
    if (!youtubeUrl.trim()) { setEngineMessage("Enter a YouTube URL"); return; }
    setImportLoading(true); setEngineMessage(null);
    try {
      const sRes = await fetch("/api/youtube/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: youtubeUrl.trim() }) });
      const sData = await sRes.json(); if (!sRes.ok) throw new Error(sData.error || "Metadata failed");
      const dRes = await fetch("/api/youtube/download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: youtubeUrl.trim(), uploadType: youtubeType, title: sData.title, artist: sData.artist, duration_seconds: sData.duration, thumbnail: sData.thumbnail }) });
      const dData = await dRes.json(); if (!dRes.ok) throw new Error(dData.error || "Download failed");
      setActiveByType(prev => ({ ...prev, [youtubeType]: { id: dData.upload.id, title: dData.upload.title, artist: dData.upload.artist, type: youtubeType, isStream: false } }));
      setPickerType(null);
      router.push(`/room/${dData.upload.id}`);
    } catch (err: any) { setEngineMessage(err?.message || "Failed to import"); }
    finally { setImportLoading(false); }
  }

  function formatSize(bytes: number) {
    if (!bytes) return "0 MB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  // Modal helpers
  const pickerTracks = pickerType ? tracksByType(pickerType).map(t => ({ id: t.id, title: t.title, artist: t.artist, source: t.source, cover_image: t.cover_image })) : [];
  const handleSelectTrack = (trackId: string) => {
    if (!pickerType) return;
    const t = uploads.find(u => u.id === trackId);
    if (!t) return;
    setActiveByType(prev => ({ ...prev, [pickerType]: { id: t.id, title: t.title, artist: t.artist, type: pickerType, isStream: false } }));
    setPickerType(null);
    router.push(`/room/${t.id}`);
  };

  return (
    <div className="container mx-auto min-h-screen dashboard-page-magenta">
      {/* Header — logo | nav | profile all on one row on desktop */}
      <header className="header header-with-profile header-desktop-row">
        <PageLogo page="songs" />
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
        <div className="page-hero-bg absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: "url('/assets/hero/dashboard.png')" }} />
        <div className="page-hero-overlay absolute inset-0 pointer-events-none z-[1]" />
        <div className="relative z-[2] p-10 md:p-14">
          <div className="hero-badge">{APP_TAGLINE}</div>
          <h1>Hear What <span className="gradient-text">Better Audio</span> Sounds Like</h1>
          <p>Tap a demo card to select a track or stream from YouTube. Mix live with the {APP_NAME} engine.</p>
          <div className="hero-actions">
            <Link href="/docs/console-guide" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <BookOpen size={16} />
              Console Guide
            </Link>
          </div>
        </div>
      </section>

      {/* Active Sessions */}
      {Object.values(activeByType).some(Boolean) && (
        <section className="px-4 pb-4">
          <div className="active-sessions-card border border-border rounded-2xl p-4">
            <div className="section-label mb-2">Active Sessions</div>
            <div className="flex flex-col gap-2">
              {(Object.keys(activeByType) as CategoryKey[]).map(key => {
                const active = activeByType[key]; if (!active) return null;
                const tc = UPLOAD_TYPES.find(t => t.key === key)!;
                const href = active.isStream
                  ? `/room/stream?url=${encodeURIComponent(active.streamUrl || "")}&type=${key}&title=${encodeURIComponent(active.title)}&artist=${encodeURIComponent(active.artist)}&youtubeUrl=${encodeURIComponent(active.youtubeUrl || "")}`
                  : `/room/${active.id}`;
                return (
                  <Link key={key} href={href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] no-underline transition-transform hover:-translate-y-px" style={{ background: `${tc.color}10`, border: `1px solid ${tc.color}20` }}>
                    <Volume2 size={14} style={{ color: tc.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{active.title}</div>
                      <div className="text-[11px] text-muted truncate">{active.artist} · {tc.label}{active.isStream ? " · Live Stream" : ""}</div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: tc.color }}>Resume</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Track Library */}
      <section className="px-4 pb-6">
        <div className="section-label mb-3">Track Library</div>
        {UPLOAD_TYPES.map(type => {
          const tracks = tracksByType(type.key);
          return (
            <div key={type.key} className="mb-5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: type.color }}>
                {type.icon}{type.label} ({tracks.length})
              </div>
              {loadingExtras ? <p className="text-[13px] text-muted">Loading...</p>
                : tracks.length === 0 ? <p className="text-[13px] text-muted">No {type.label.toLowerCase()} tracks yet.</p>
                : (
                  <div className="flex flex-col gap-1.5">
                    {tracks.map(t => {
                      const isActive = activeByType[type.key]?.id === t.id;
                      return (
                        <div key={t.id} className="track-row flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 cursor-pointer transition-colors" style={{ background: isActive ? `${type.color}10` : "var(--track-bg)", border: isActive ? `1px solid ${type.color}30` : "1px solid var(--track-border)" }} onClick={() => { setActiveByType(prev => ({ ...prev, [type.key]: { id: t.id, title: t.title, artist: t.artist, type: type.key, isStream: false } })); router.push(`/room/${t.id}`); }}>
                          <img src={t.cover_image || type.photo} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                          <Link href={`/room/${t.id}`} className="flex-1 min-w-0 no-underline" onClick={e => e.stopPropagation()}>
                            <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>{t.title}</div>
                            <div className="text-[11px] text-muted truncate">{t.artist}{t.album ? ` · ${t.album}` : ""}</div>
                          </Link>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {t.source === "youtube" && <Cloud size={12} className="text-accent" />}
                            {isActive && <Volume2 size={12} style={{ color: type.color }} />}
                            <a href={t.file_url} download className="text-muted hover:text-text transition-colors" onClick={e => e.stopPropagation()}><Download size={12} /></a>
                            <span className="text-[10px] text-muted font-mono">{formatSize(t.file_size_bytes)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          );
        })}
      </section>

      {/* Recent Sessions */}
      <section className="px-4 pb-6">
        <div className="submissions-panel">
          <div className="section-label">Recent Sessions</div>
          {loadingExtras && sessions.length === 0 ? <p className="text-[13px] text-muted py-2">Loading sessions...</p>
            : sessions.length === 0 ? <p className="text-[13px] text-muted py-2">No sessions yet. Tap a demo card to start mixing.</p>
            : sessions.map(s => (
              <div key={s.id} className="submission-item cursor-pointer">
                <div className="sub-meta">
                  <h4>{s.song_title}</h4>
                  <p>Enhanced {Math.round(((s.final_settings?.eq298 ?? 0) + 12) / 24 * 100)}%{s.ab_toggles > 0 ? ` · ${s.ab_toggles} A/B toggle${s.ab_toggles === 1 ? "" : "s"}` : ""}</p>
                </div>
                <div className="sub-date">
                  {mounted ? (
                    <>
                      {new Date(s.created_at).toLocaleDateString()}<br />{new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </>
                  ) : (
                    <>&nbsp;<br />&nbsp;</>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>

      <BottomNav />

      {/* Picker Modal */}
      <PickerModal
        isOpen={!!pickerType}
        category={pickerType}
        tracks={pickerTracks}
        onClose={() => setPickerType(null)}
        onSelectTrack={handleSelectTrack}
        onStream={(url) => { setYoutubeUrl(url); handleStreamAndMix(); }}
        onImport={(url) => { setYoutubeUrl(url); handleImportAndMix(); }}
      />
    </div>
  );
}
