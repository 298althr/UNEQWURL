"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import ProfileDropdown from "@/components/ProfileDropdown";
import LoadingOverlay from "@/components/LoadingOverlay";
import ConfirmationModal from "@/components/ConfirmationModal";
import PageLogo from "@/components/PageLogo";
import { CATEGORIES, type CategoryKey } from "@/lib/brand";
import {
  Music, Mic, Radio, Play, Cloud, Download, Pause, Pencil, Trash2,
  FolderOpen, Loader2, Save, X, Search, ChevronDown
} from "lucide-react";

type Track = {
  id: string;
  upload_type: CategoryKey;
  source: "upload" | "youtube";
  youtube_url: string | null;
  original_filename: string;
  b2_file_name: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  cover_image: string | null;
  file_size_bytes: number;
  file_url: string;
  uploaded_at: string;
  created_at: string;
};

function normalizeType(type: string): CategoryKey {
  if (type === "voice") return "live";
  const valid: CategoryKey[] = ["music", "podcast", "live", "stream"];
  return valid.includes(type as CategoryKey) ? (type as CategoryKey) : "music";
}

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  music: <Music size={14} />,
  podcast: <Radio size={14} />,
  live: <Mic size={14} />,
  stream: <Play size={14} />,
};

const UPLOAD_TYPES = CATEGORIES.map(c => ({
  key: c.id,
  label: c.label,
  color: c.colorValue,
  icon: CATEGORY_ICONS[c.id],
}));

const CARD_BG: Record<CategoryKey, string> = {
  music: CATEGORIES[0].photo,
  podcast: CATEGORIES[1].photo,
  live: CATEGORIES[2].photo,
  stream: CATEGORIES[3].photo,
};

const MAX_SIZE_MB = 30;
const MIN_SIZE_KB = 100;

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "music", label: "Music" },
  { key: "podcast", label: "Podcast" },
  { key: "live", label: "Live" },
  { key: "stream", label: "Stream" },
  { key: "youtube", label: "YouTube" },
];

export default function SoundFilesPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", artist: "", album: "", genre: "", upload_type: "music" as CategoryKey });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload state
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ title: "", artist: "", album: "", genre: "", cover_image: "" });
  const [uploadType, setUploadType] = useState<CategoryKey>("music");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // YouTube import state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeType, setYoutubeType] = useState<CategoryKey>("music");
  const [youtubeImporting, setYoutubeImporting] = useState(false);

  // Playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter & search
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => { fetchTracks(); }, []);

  async function fetchTracks() {
    try {
      const res = await fetch("/api/uploads");
      if (!res.ok) throw new Error("Failed to load tracks");
      setTracks(await res.json());
    } catch { setStatusMsg("Could not load your sound files."); }
    finally { setLoading(false); }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function toggleExpanded(id: string) {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filteredTracks = tracks.filter(t => {
    const matchesFilter = activeFilter === "all"
      || activeFilter === "youtube" ? t.source === "youtube"
      : normalizeType(t.upload_type) === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q
      || t.title.toLowerCase().includes(q)
      || t.artist.toLowerCase().includes(q)
      || (t.album && t.album.toLowerCase().includes(q))
      || (t.genre && t.genre.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  function startEdit(t: Track) {
    setEditingId(t.id);
    setEditForm({ title: t.title, artist: t.artist, album: t.album || "", genre: t.genre || "", upload_type: t.upload_type });
  }

  async function saveEdit() {
    if (!editingId || !editForm.title.trim()) { setStatusMsg("Title is required."); return; }
    setSavingEdit(true); setStatusMsg(null);
    try {
      const res = await fetch(`/api/uploads/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatusMsg(d.error || "Update failed."); }
      else { setStatusMsg("File updated."); setEditingId(null); fetchTracks(); }
    } catch { setStatusMsg("Update failed."); }
    finally { setSavingEdit(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/uploads/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { setStatusMsg("File deleted."); if (playingId === deleteTarget.id) { audioRef.current?.pause(); setPlayingId(null); } fetchTracks(); }
      else setStatusMsg("Failed to delete file.");
    } catch { setStatusMsg("Failed to delete file."); }
    finally { setDeletingId(null); setDeleteTarget(null); }
  }

  function handleFileSelect(file: File | null) {
    if (!file) { setSelectedFile(null); return; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) { setStatusMsg(`File exceeds ${MAX_SIZE_MB} MB.`); return; }
    if (file.size < MIN_SIZE_KB * 1024) { setStatusMsg(`File below ${MIN_SIZE_KB} KB.`); return; }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (![".mp3",".wav",".ogg",".m4a",".mp4"].includes(ext)) { setStatusMsg("Only MP3, WAV, OGG, M4A allowed."); return; }
    setStatusMsg(null); setSelectedFile(file);
    if (!uploadForm.title) setUploadForm(p => ({ ...p, title: file.name.replace(/\.[^/.]+$/, "") }));
  }

  async function handleUpload() {
    if (!selectedFile || !uploadForm.title.trim()) { setStatusMsg("File and title required."); return; }
    setUploadingType(uploadType); setStatusMsg(null);
    const payload = new FormData();
    payload.append("file", selectedFile); payload.append("uploadType", uploadType);
    payload.append("title", uploadForm.title.trim()); payload.append("artist", uploadForm.artist.trim());
    if (uploadForm.album.trim()) payload.append("album", uploadForm.album.trim());
    if (uploadForm.genre.trim()) payload.append("genre", uploadForm.genre.trim());
    if (uploadForm.cover_image.trim()) payload.append("coverImage", uploadForm.cover_image.trim());
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: payload });
      const data = await res.json();
      if (!res.ok) setStatusMsg(data.error || "Upload failed.");
      else { setStatusMsg("Uploaded successfully!"); setSelectedFile(null); setUploadForm({ title: "", artist: "", album: "", genre: "", cover_image: "" }); fetchTracks(); }
    } catch { setStatusMsg("Upload failed."); }
    finally { setUploadingType(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  async function handleYouTubeImport() {
    if (!youtubeUrl.trim()) { setStatusMsg("Enter a YouTube URL."); return; }
    setYoutubeImporting(true); setStatusMsg(null);
    try {
      const sRes = await fetch("/api/youtube/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: youtubeUrl.trim() }) });
      const sData = await sRes.json(); if (!sRes.ok) throw new Error(sData.error || "Metadata failed");
      const dRes = await fetch("/api/youtube/download", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim(), uploadType: youtubeType, title: sData.title, artist: sData.artist, duration_seconds: sData.duration, thumbnail: sData.thumbnail }),
      });
      const dData = await dRes.json(); if (!dRes.ok) throw new Error(dData.error || "Download failed");
      setStatusMsg(`Imported "${dData.upload.title}".`); setYoutubeUrl(""); fetchTracks();
    } catch (err: any) { setStatusMsg(err?.message || "YouTube import failed."); }
    finally { setYoutubeImporting(false); }
  }

  function togglePlay(t: Track) {
    if (playingId === t.id) { audioRef.current?.pause(); audioRef.current = null; setPlayingId(null); }
    else { audioRef.current?.pause(); const a = new Audio(`/api/uploads/serve?id=${t.id}`); audioRef.current = a; a.play().catch(() => setStatusMsg("Could not play.")); setPlayingId(t.id); a.onended = () => setPlayingId(null); a.onerror = () => { setStatusMsg("Playback error."); setPlayingId(null); }; }
  }

  return (
    <div className="container mx-auto min-h-screen soundfiles-page-blue">
      <LoadingOverlay visible={!!uploadingType} message={`Uploading ${uploadingType}...`} />
      <ConfirmationModal open={!!deleteTarget} title="Delete File" message={`Remove "${deleteTarget?.title || deleteTarget?.original_filename}"?`} confirmLabel="Delete" cancelLabel="Keep" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} confirmVariant="danger" />
      <header className="header header-with-profile header-desktop-row">
        <PageLogo page="library" />
        <div className="header-desktop-nav">
          <DesktopNav />
        </div>
        <ProfileDropdown />
      </header>

      <main className="pb-32">
        <section className="hero relative overflow-hidden rounded-2xl mb-8">
          <div className="page-hero-bg absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: "url('/assets/hero/library.png')" }} />
          <div className="page-hero-overlay absolute inset-0 pointer-events-none z-[1]" />
          <div className="relative z-[2] p-10 md:p-14">
            <div className="hero-badge">Library</div>
            <h1>Sound <span className="gradient-text">Library</span></h1>
            <p>Browse, manage, and stream your uploaded audio tracks and YouTube imports.</p>
          </div>
        </section>

        {statusMsg && (
          <div className={`mb-4 px-4 py-3 rounded-[var(--r-md)] text-[13px] font-semibold ${statusMsg.includes("failed") || statusMsg.includes("Could not") || statusMsg.includes("error") ? "bg-red-500/10 text-red-400" : "text-accent"}`} style={{ background: statusMsg.includes("failed") || statusMsg.includes("Could not") || statusMsg.includes("error") ? undefined : "rgba(208,128,168,0.08)" }}>{statusMsg}</div>
        )}

        {/* Upload & Import Section */}
        <section className="px-4 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Card */}
            <div className="ingest-card">
              <div className="section-label mb-3 flex items-center gap-1.5"><FolderOpen size={14} /> Upload File</div>
              <div className="flex gap-2 mb-3">
                {UPLOAD_TYPES.map(t => (
                  <button key={t.key} onClick={() => setUploadType(t.key)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] border text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors" style={{ borderColor: uploadType === t.key ? t.color : "var(--border)", background: uploadType === t.key ? `${t.color}15` : "transparent", color: uploadType === t.key ? t.color : "var(--muted)" }}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
              <input type="file" accept=".mp3,.wav,.ogg,.m4a,.mp4,audio/*" ref={fileInputRef} onChange={e => handleFileSelect(e.target.files?.[0] || null)} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 rounded-[10px] border text-text text-xs font-bold cursor-pointer mb-3 transition-colors" style={{ borderColor: "var(--border)", background: "var(--track-bg)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--track-border)")} onMouseLeave={e => (e.currentTarget.style.background = "var(--track-bg)")}>
                {selectedFile ? selectedFile.name : "+ Select File"}
              </button>
              {selectedFile && (
                <div className="flex flex-col gap-2">
                  <input type="text" placeholder="Title *" value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-surface text-text text-[13px] outline-none focus:border-border-hover transition-colors" />
                  <input type="text" placeholder="Artist" value={uploadForm.artist} onChange={e => setUploadForm(p => ({ ...p, artist: e.target.value }))} className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-surface text-text text-[13px] outline-none focus:border-border-hover transition-colors" />
                  <input type="text" placeholder="Cover Image URL (optional)" value={uploadForm.cover_image} onChange={e => setUploadForm(p => ({ ...p, cover_image: e.target.value }))} className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-surface text-text text-[13px] outline-none focus:border-border-hover transition-colors" />
                  <button onClick={handleUpload} disabled={!!uploadingType} className="w-full py-3 rounded-[10px] border border-blue text-blue bg-transparent text-xs font-bold cursor-pointer hover:bg-blue/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {uploadingType ? "Uploading..." : "Upload to B2"}
                  </button>
                </div>
              )}
            </div>

            {/* YouTube Import Card */}
            <div className="ingest-card">
              <div className="section-label mb-3 flex items-center gap-1.5"><Play size={14} /> Import from YouTube</div>
              <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="Paste YouTube URL..." className="w-full bg-input-bg border border-border rounded-[10px] px-3.5 py-3 text-text text-[13px] font-mono mb-3 outline-none focus:border-blue transition-colors" />
              <div className="flex gap-2 mb-3">
                {UPLOAD_TYPES.map(t => (
                  <button key={t.key} onClick={() => setYoutubeType(t.key)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] border text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors" style={{ borderColor: youtubeType === t.key ? t.color : "var(--border)", background: youtubeType === t.key ? `${t.color}15` : "transparent", color: youtubeType === t.key ? t.color : "var(--muted)" }}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
              <button onClick={handleYouTubeImport} disabled={youtubeImporting || !youtubeUrl.trim()} className="w-full py-3 rounded-[10px] border border-blue text-blue bg-transparent text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-blue/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {youtubeImporting ? <Loader2 size={14} className="spin" /> : <Cloud size={14} />}
                {youtubeImporting ? "Importing..." : "Import to B2"}
              </button>
            </div>
          </div>
        </section>

        {/* Search + Filter + Grid */}
        <section className="px-4 pb-6">
          {/* Search */}
          <div className="relative flex items-center mb-4">
            <span className="absolute left-4 text-muted pointer-events-none"><Search size={16} /></span>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tracks..." className="w-full bg-input-bg border border-border rounded-full pl-11 pr-4 py-3 text-text text-sm outline-none focus:border-border-hover transition-colors" />
          </div>

          {/* Filter tabs */}
          <div className="library-filter-tabs mb-5">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)} className={`library-filter-tab ${activeFilter === f.key ? "active" : ""}`}>
                {f.label}{f.key === "all" ? ` (${tracks.length})` : ""}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="dashboard-loading"><div className="loading-spinner" /><p>Loading sound files...</p></div>
          ) : filteredTracks.length === 0 ? (
            <p className="text-[13px] text-muted">No sound files match your filter. Upload a file or import from YouTube above.</p>
          ) : (
            <div className="library-track-grid">
              {filteredTracks.map(t => {
                const nt = normalizeType(t.upload_type);
                const tc = UPLOAD_TYPES.find(x => x.key === nt)!;
                const editing = editingId === t.id;
                const isExpanded = expandedCards.has(t.id);
                const isPlaying = playingId === t.id;

                return (
                  <div key={t.id} className={`library-card ${isExpanded ? "actions-revealed" : ""} ${isPlaying ? "playing" : ""}`}>
                    {editing ? (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex gap-2 flex-wrap">
                          <input type="text" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Title *" className="flex-1 min-w-[120px] px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-surface text-text text-[13px] outline-none focus:border-border-hover transition-colors" />
                          <input type="text" value={editForm.artist} onChange={e => setEditForm(p => ({ ...p, artist: e.target.value }))} placeholder="Artist" className="flex-1 min-w-[120px] px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-surface text-text text-[13px] outline-none focus:border-border-hover transition-colors" />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <input type="text" value={editForm.album} onChange={e => setEditForm(p => ({ ...p, album: e.target.value }))} placeholder="Album" className="flex-1 min-w-[120px] px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-surface text-text text-[13px] outline-none focus:border-border-hover transition-colors" />
                          <input type="text" value={editForm.genre} onChange={e => setEditForm(p => ({ ...p, genre: e.target.value }))} placeholder="Genre" className="flex-1 min-w-[120px] px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-surface text-text text-[13px] outline-none focus:border-border-hover transition-colors" />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {UPLOAD_TYPES.map(x => (
                            <button key={x.key} onClick={() => setEditForm(p => ({ ...p, upload_type: x.key }))} className="flex-1 py-2 rounded-[10px] border text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors" style={{ borderColor: editForm.upload_type === x.key ? x.color : "var(--border)", background: editForm.upload_type === x.key ? `${x.color}15` : "transparent", color: editForm.upload_type === x.key ? x.color : "var(--muted)" }}>
                              {x.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end mt-1">
                          <button onClick={() => setEditingId(null)} className="px-3.5 py-2 rounded-lg border border-border bg-transparent text-muted text-xs font-semibold cursor-pointer flex items-center gap-1 hover:text-text transition-colors"><X size={12} /> Cancel</button>
                          <button onClick={saveEdit} disabled={savingEdit} className="px-3.5 py-2 rounded-lg border border-blue bg-transparent text-blue text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-blue/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {savingEdit ? <Loader2 size={12} className="spin" /> : <Save size={12} />} Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Thumbnail with play overlay */}
                        <div className="library-thumb" style={{ backgroundImage: `url('${t.cover_image || CARD_BG[nt]}')` }}>
                          <button className="thumb-play-overlay" onClick={() => togglePlay(t)} aria-label={isPlaying ? "Stop" : "Play"}>
                            <div className="thumb-play-icon">
                              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                            </div>
                          </button>
                        </div>

                        {/* Title + Category dot */}
                        <div className="library-card-title flex items-center gap-2">
                          <span className="library-cat-dot" style={{ backgroundColor: tc.color }} />
                          {t.title}
                        </div>

                        {/* Details */}
                        <div className="library-card-details">
                          {t.artist}{t.album ? ` · ${t.album}` : ""}{t.genre ? ` · ${t.genre}` : ""}
                          {t.source === "youtube" && <span className="ml-1"><Cloud size={10} className="inline text-accent" /></span>}
                        </div>

                        {/* Pills */}
                        <div className="library-card-pills">
                          <span className="library-stay-pill">{t.upload_type}</span>
                          <span className="library-stay-pill">{formatSize(t.file_size_bytes)}</span>
                        </div>

                        {/* Action region */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.03]">
                          <Link href={`/room/${t.id}`} className="text-[11px] font-bold uppercase tracking-wider text-blue hover:text-blue/80 transition-colors flex items-center gap-1">
                            <Play size={10} /> Mix
                          </Link>
                          <button onClick={() => toggleExpanded(t.id)} className="library-action-toggle" aria-label="Toggle actions">
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        {/* Expanded actions */}
                        <div className="library-actions-matrix">
                          <Link href={`/room/${t.id}`} className="library-crud-btn mix-btn">Mix</Link>
                          <button onClick={() => startEdit(t)} className="library-crud-btn">Edit</button>
                          <a href={t.file_url} download className="library-crud-btn no-underline">Download</a>
                          <button onClick={() => setDeleteTarget(t)} disabled={deletingId === t.id} className="library-crud-btn delete-btn">Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
