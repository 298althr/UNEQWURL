"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import type { SongAdmin } from "@/lib/types";
import { Music, Radio, Mic, Cloud, Download, Play, Pause, Trash2, FlaskConical, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type YouTubeStreamResult = {
  success: boolean;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  streamUrl: string;
  message: string;
};

type YouTubeUpload = {
  id: string;
  upload_type: "music" | "podcast" | "voice";
  source: "upload" | "youtube";
  youtube_url: string | null;
  title: string;
  artist: string;
  b2_file_name: string;
  file_size_bytes: number;
  file_url: string;
  uploaded_at: string;
};

const UPLOAD_TYPES: { key: "music" | "podcast" | "voice"; label: string; color: string }[] = [
  { key: "music", label: "Music", color: "#6B8CFF" },
  { key: "podcast", label: "Podcast", color: "#FFB347" },
  { key: "voice", label: "Voice", color: "#00D4AA" },
];

export default function AdminSongsPage() {
  // Existing song library
  const [songs, setSongs] = useState<SongAdmin[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // Add song form
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [adding, setAdding] = useState(false);

  // Bulk upload
  const [bulkJson, setBulkJson] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);

  // YouTube import
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeType, setYoutubeType] = useState<"music" | "podcast" | "voice">("music");
  const [streamResult, setStreamResult] = useState<YouTubeStreamResult | null>(null);
  const [streamingLoading, setStreamingLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [youtubeImports, setYoutubeImports] = useState<YouTubeUpload[]>([]);
  const [loadingImports, setLoadingImports] = useState(true);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Audio analysis state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, { qualityScore: number; notes: string[]; benchmarks: Record<string, { settings: any; weights: any; qualityScore: number }> }> | null>(null);
  const [showAnalysisFor, setShowAnalysisFor] = useState<string | null>(null);

  function loadSongs() {
    fetch("/api/admin/songs")
      .then((r) => r.json())
      .then(setSongs)
      .finally(() => setLoadingSongs(false));
  }

  function loadImports() {
    fetch("/api/admin/uploads")
      .then((r) => r.json())
      .then((data: YouTubeUpload[]) => {
        setYoutubeImports(data.filter((u) => u.source === "youtube"));
      })
      .catch(() => setYoutubeImports([]))
      .finally(() => setLoadingImports(false));
  }

  useEffect(() => {
    loadSongs();
    loadImports();
  }, []);

  // Clean up preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = "";
      }
    };
  }, [previewAudio]);

  async function saveBenchmark(id: string) {
    try {
      const benchmark_settings = JSON.parse(draft);
      const res = await fetch(`/api/admin/songs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benchmark_settings, benchmark_ready: true }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditingId(null);
      setMessage("Benchmark saved");
      loadSongs();
    } catch {
      setMessage("Invalid JSON or save failed");
    }
  }

  async function addSong(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newFileUrl.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          artist: newArtist.trim() || null,
          file_url: newFileUrl.trim(),
          duration_seconds: newDuration ? parseInt(newDuration, 10) : null,
        }),
      });
      if (!res.ok) throw new Error("Add failed");
      setNewTitle("");
      setNewArtist("");
      setNewFileUrl("");
      setNewDuration("");
      setMessage("Song added");
      loadSongs();
    } catch {
      setMessage("Failed to add song");
    } finally {
      setAdding(false);
    }
  }

  async function addBulkSongs(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkJson.trim()) return;
    setBulkAdding(true);
    try {
      const parsed = JSON.parse(bulkJson);
      const songsArray = Array.isArray(parsed) ? parsed : parsed.songs;
      if (!Array.isArray(songsArray)) {
        setMessage("JSON must be an array or an object with a 'songs' array");
        return;
      }
      const res = await fetch("/api/admin/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songs: songsArray }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk add failed");
      setBulkJson("");
      setMessage(`${data.created} song(s) added`);
      loadSongs();
    } catch (err: any) {
      setMessage(err?.message || "Invalid JSON or bulk add failed");
    } finally {
      setBulkAdding(false);
    }
  }

  // YouTube stream
  async function handleStream(e: React.FormEvent) {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      setMessage("Enter a YouTube URL");
      return;
    }
    setStreamingLoading(true);
    setMessage(null);
    setStreamResult(null);
    stopPreview();

    try {
      const res = await fetch("/api/admin/youtube/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Stream failed");
      setStreamResult(data);
    } catch (err: any) {
      setMessage(err?.message || "Failed to extract stream");
    } finally {
      setStreamingLoading(false);
    }
  }

  // Download to B2
  async function handleDownloadToB2() {
    if (!streamResult) return;
    setDownloading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/youtube/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          uploadType: youtubeType,
          title: streamResult.title,
          artist: streamResult.artist,
          duration_seconds: streamResult.duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Download failed");
      setMessage(`Downloaded: ${data.upload.title} (${data.upload.upload_type})`);
      setStreamResult(null);
      setYoutubeUrl("");
      loadImports();
    } catch (err: any) {
      setMessage(err?.message || "Failed to download to B2");
    } finally {
      setDownloading(false);
    }
  }

  function playPreview() {
    if (!streamResult?.streamUrl) return;
    stopPreview();
    const proxyUrl = `/api/admin/youtube/proxy?url=${encodeURIComponent(streamResult.streamUrl)}`;
    const audio = new Audio(proxyUrl);
    audio.play().catch(() => setMessage("Preview playback blocked"));
    setPreviewAudio(audio);
    setIsPreviewPlaying(true);
    audio.onended = () => setIsPreviewPlaying(false);
    audio.onpause = () => setIsPreviewPlaying(false);
    audio.onerror = () => {
      setIsPreviewPlaying(false);
      setMessage("Preview playback error");
    };
  }

  function stopPreview() {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = "";
      setPreviewAudio(null);
    }
    setIsPreviewPlaying(false);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function analyzeSong(id: string) {
    setAnalyzingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/songs/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Analysis failed");
      setAnalysisResult((prev) => ({ ...prev, [id]: data }));
      setShowAnalysisFor(id);
      setMessage(`Analysis complete — quality score: ${data.analysis ? "N/A" : "N/A"}`);
      loadSongs();
    } catch (err: any) {
      setMessage(err?.message || "Analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-mobile flex-col bg-surface">
      <header className="border-b border-white/10 px-4 py-6">
        <Link href="/admin" className="font-mono text-xs text-muted hover:text-accent">
          &larr; Dashboard
        </Link>
        <h1 className="font-display mt-2 text-3xl text-white">Sound Files</h1>
        <p className="mt-1 font-mono text-xs text-muted">Manage, edit, replace, and import your audio files.</p>
      </header>

      <main className="flex-1 px-4 py-4">
        {message && (
          <p className={`mb-4 rounded-lg border px-3 py-2 font-mono text-xs ${message.includes("Failed") || message.includes("error") || message.includes("blocked") ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-accent/20 bg-accent/10 text-accent"}`}>
            {message}
          </p>
        )}

        {/* Upload + YouTube Import Row */}
        <div className="mb-6 grid grid-cols-1 gap-4">
          {/* Upload File */}
          <div className="rounded-xl border border-white/10 bg-panel p-4">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white">Upload File</h2>
            <div className="flex gap-2 mb-3">
              {UPLOAD_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setYoutubeType(t.key)}
                  className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[10px] uppercase transition-all ${
                    youtubeType === t.key
                      ? "border font-semibold"
                      : "border border-white/10 text-muted hover:border-white/30 hover:text-white"
                  }`}
                  style={{
                    borderColor: youtubeType === t.key ? t.color : undefined,
                    color: youtubeType === t.key ? t.color : undefined,
                    backgroundColor: youtubeType === t.key ? `${t.color}15` : "transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary w-full justify-center text-xs"
            >
              + Select File
            </button>
          </div>

          {/* YouTube Import */}
          <div className="rounded-xl border border-white/10 bg-panel p-4">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white">Import from YouTube</h2>
            <form onSubmit={handleStream} className="flex flex-col gap-2">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube URL..."
                className="w-full rounded-md border border-white/10 bg-black/30 p-2.5 font-mono text-xs text-white placeholder:text-white/25 focus:border-accent focus:outline-none"
              />
              <div className="flex gap-2">
                {UPLOAD_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setYoutubeType(t.key)}
                    className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[10px] uppercase transition-all ${
                      youtubeType === t.key
                        ? "border font-semibold"
                        : "border border-white/10 text-muted hover:border-white/30 hover:text-white"
                    }`}
                    style={{
                      borderColor: youtubeType === t.key ? t.color : undefined,
                      color: youtubeType === t.key ? t.color : undefined,
                      backgroundColor: youtubeType === t.key ? `${t.color}15` : "transparent",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={streamingLoading || !youtubeUrl.trim()}
                className="btn btn-secondary w-full justify-center text-xs disabled:opacity-50"
              >
                {streamingLoading ? "Extracting stream..." : "Preview Stream"}
              </button>
            </form>

            {/* Stream preview */}
            {streamResult && (
              <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
                <div className="flex items-start gap-3">
                  {streamResult.thumbnail && (
                    <img
                      src={streamResult.thumbnail}
                      alt={streamResult.title}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm text-white">{streamResult.title}</p>
                    <p className="font-mono text-[10px] text-muted">{streamResult.artist}</p>
                    <p className="font-mono text-[10px] text-muted">
                      {formatDuration(streamResult.duration)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={isPreviewPlaying ? stopPreview : playPreview}
                    className="btn btn-secondary flex-1 justify-center gap-1 text-[10px]"
                  >
                    {isPreviewPlaying ? <Pause size={10} /> : <Play size={10} />}
                    {isPreviewPlaying ? "Stop" : "Play"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadToB2}
                    disabled={downloading}
                    className="btn btn-primary flex flex-1 items-center justify-center gap-1 text-[10px] disabled:opacity-50"
                  >
                    <Cloud size={10} />
                    {downloading ? "Saving..." : "Save to B2"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* YouTube Imports List */}
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white">
          Your Library ({youtubeImports.length} files)
        </h2>
        {loadingImports ? (
          <p className="mb-6 font-mono text-sm text-muted">Loading imports...</p>
        ) : youtubeImports.length === 0 ? (
          <p className="mb-6 font-mono text-sm text-muted">No YouTube imports yet.</p>
        ) : (
          <ul className="mb-6 flex flex-col gap-3">
            {youtubeImports.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-white/10 bg-panel p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase font-semibold"
                        style={{
                          border: `1px solid ${UPLOAD_TYPES.find((t) => t.key === item.upload_type)?.color ?? "#888"}50`,
                          color: UPLOAD_TYPES.find((t) => t.key === item.upload_type)?.color ?? "#888",
                          backgroundColor: `${UPLOAD_TYPES.find((t) => t.key === item.upload_type)?.color ?? "#888"}15`,
                        }}
                      >
                        {item.upload_type}
                      </span>
                      <Cloud size={12} className="text-accent" />
                    </div>
                    <h3 className="mt-1.5 font-display text-base text-white">{item.title}</h3>
                    <p className="font-mono text-[10px] text-muted">{item.artist}</p>
                    <p className="font-mono text-[10px] text-muted">
                      {formatSize(item.file_size_bytes)} &middot; {new Date(item.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <a
                      href={item.file_url}
                      download
                      className="btn btn-secondary gap-1 px-2 py-1 text-[10px]"
                    >
                      <Download size={10} />
                      Download
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Add Song Section */}
        <div className="mb-6 rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-white">
              {bulkMode ? "Bulk Add" : "Add Song"}
            </h2>
            <button
              type="button"
              onClick={() => { setBulkMode(!bulkMode); setMessage(null); }}
              className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-muted hover:border-white/30 hover:text-white transition-colors"
            >
              {bulkMode ? "Single" : "Bulk"}
            </button>
          </div>

          {bulkMode ? (
            <form onSubmit={addBulkSongs} className="flex flex-col gap-2">
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                rows={6}
                placeholder={`Paste JSON array of songs:\n[\n  { "title": "Song 1", "artist": "Artist", "file_url": "https://...", "duration_seconds": 180 },\n  { "title": "Song 2", "artist": "Artist", "file_url": "https://..." }\n]`}
                className="w-full rounded-md border border-white/10 bg-black/30 p-2 font-mono text-xs text-white placeholder:text-white/25 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={bulkAdding}
                className="btn btn-primary w-full justify-center text-xs disabled:opacity-50"
              >
                {bulkAdding ? "Adding…" : "Add Songs"}
              </button>
            </form>
          ) : (
            <form onSubmit={addSong} className="flex flex-col gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title *"
                required
                className="w-full rounded-md border border-white/10 bg-black/30 p-2.5 font-mono text-xs text-white placeholder:text-white/25 focus:border-accent focus:outline-none"
              />
              <input
                type="text"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                placeholder="Artist"
                className="w-full rounded-md border border-white/10 bg-black/30 p-2.5 font-mono text-xs text-white placeholder:text-white/25 focus:border-accent focus:outline-none"
              />
              <input
                type="url"
                value={newFileUrl}
                onChange={(e) => setNewFileUrl(e.target.value)}
                placeholder="File URL * (e.g. B2 public URL)"
                required
                className="w-full rounded-md border border-white/10 bg-black/30 p-2.5 font-mono text-xs text-white placeholder:text-white/25 focus:border-accent focus:outline-none"
              />
              <input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                placeholder="Duration (seconds)"
                className="w-full rounded-md border border-white/10 bg-black/30 p-2.5 font-mono text-xs text-white placeholder:text-white/25 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={adding}
                className="btn btn-primary w-full justify-center text-xs disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add Song"}
              </button>
            </form>
          )}
        </div>

        {/* Song List */}
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white">Library ({songs.length})</h2>
        {loadingSongs ? (
          <p className="font-mono text-sm text-muted">Loading…</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {songs.map((song) => (
              <li
                key={song.id}
                className="rounded-xl border border-white/10 bg-panel p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg text-white">{song.title}</h2>
                    {song.artist && (
                      <p className="font-mono text-xs text-muted">{song.artist}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase font-semibold ${
                      song.benchmark_ready
                        ? "border border-accent/30 bg-accent/10 text-accent"
                        : "border border-white/10 bg-white/5 text-muted"
                    }`}
                  >
                    {song.benchmark_ready ? "Ready" : "Pending"}
                  </span>
                </div>

                {song.benchmark_settings && editingId !== song.id && (
                  <pre className="mt-3 overflow-x-auto rounded-md bg-black/30 p-2 font-mono text-[10px] text-muted">
                    {JSON.stringify(song.benchmark_settings, null, 2)}
                  </pre>
                )}

                {editingId === song.id ? (
                  <div className="mt-3">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={6}
                      className="w-full rounded-md border border-white/10 bg-black/30 p-2 font-mono text-xs text-white placeholder:text-white/25 focus:border-accent focus:outline-none"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveBenchmark(song.id)}
                        className="btn btn-primary justify-center px-3 py-1 text-xs"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="btn btn-secondary justify-center px-3 py-1 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(song.id);
                        setDraft(
                          JSON.stringify(song.benchmark_settings ?? {}, null, 2)
                        );
                        setMessage(null);
                      }}
                      className="font-mono text-xs text-accent hover:text-accent-light transition-colors"
                    >
                      Edit benchmark
                    </button>
                    <button
                      type="button"
                      onClick={() => analyzeSong(song.id)}
                      disabled={analyzingId === song.id}
                      className="flex items-center gap-1 font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                    >
                      {analyzingId === song.id ? (
                        <><Loader2 size={12} className="animate-spin" /> Analyzing...</>
                      ) : (
                        <><FlaskConical size={12} /> Analyze Audio</>
                      )}
                    </button>
                    {analysisResult?.[song.id] && (
                      <button
                        type="button"
                        onClick={() => setShowAnalysisFor(showAnalysisFor === song.id ? null : song.id)}
                        className="flex items-center gap-1 font-mono text-xs text-green-400 hover:text-green-300 transition-colors"
                      >
                        <CheckCircle2 size={12} />
                        {showAnalysisFor === song.id ? "Hide results" : "Show results"}
                      </button>
                    )}
                  </div>
                )}

                {/* Analysis results panel */}
                {analysisResult?.[song.id] && showAnalysisFor === song.id && (
                  <div className="mt-3 rounded-md border border-white/10 bg-black/30 p-3 space-y-3">
                    {/* Quality score */}
                    {analysisResult[song.id].benchmarks?.headphone?.qualityScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase text-muted">Quality Score:</span>
                        <span className="font-display text-lg font-bold text-accent">
                          {analysisResult[song.id].benchmarks.headphone.qualityScore}/100
                        </span>
                      </div>
                    )}

                    {/* Analysis notes */}
                    {analysisResult[song.id].notes?.length > 0 && (
                      <div>
                        <span className="font-mono text-[10px] uppercase text-muted">Analysis Notes:</span>
                        <ul className="mt-1 space-y-0.5">
                          {analysisResult[song.id].notes.map((note, i) => (
                            <li key={i} className="flex items-start gap-1.5 font-mono text-[10px] text-white/70">
                              <AlertCircle size={10} className="mt-0.5 shrink-0 text-yellow-400" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Per-context benchmarks */}
                    {analysisResult[song.id].benchmarks && (
                      <div>
                        <span className="font-mono text-[10px] uppercase text-muted">Benchmark EQ per Context:</span>
                        <div className="mt-2 grid grid-cols-1 gap-2">
                          {Object.entries(analysisResult[song.id].benchmarks).map(([ctx, bm]: [string, any]) => (
                            <div key={ctx} className="rounded border border-white/10 bg-black/20 p-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] uppercase font-semibold text-white capitalize">{ctx}</span>
                                <span className="font-mono text-[10px] text-accent">{bm.qualityScore}/100</span>
                              </div>
                              <pre className="mt-1 overflow-x-auto font-mono text-[9px] text-muted">
                                {JSON.stringify(bm.settings)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
