"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import ProfileDropdown from "@/components/ProfileDropdown";
import LoadingOverlay from "@/components/LoadingOverlay";
import ConfirmationModal from "@/components/ConfirmationModal";
import { Pause, Play, Cloud, Download } from "lucide-react";

import { Music, Mic, Radio } from "lucide-react";
import { CATEGORIES, type CategoryKey } from "@/lib/brand";

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  music: <Music size={16} />,
  podcast: <Radio size={16} />,
  live: <Mic size={16} />,
  stream: <Play size={16} />,
};

const UPLOAD_TYPES = CATEGORIES.map(c => ({
  key: c.id,
  label: `${c.label} Upload`,
  icon: CATEGORY_ICONS[c.id],
}));

const CARD_BG: Record<CategoryKey, string> = {
  music: CATEGORIES[0].photo,
  podcast: CATEGORIES[1].photo,
  live: CATEGORIES[2].photo,
  stream: CATEGORIES[3].photo,
};

const BUTTON_BG = "https://images.unsplash.com/photo-1661736799587-f6990ee4f296?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

const MAX_SIZE_MB = 30;
const MIN_SIZE_KB = 100;

type UploadItem = {
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

type FormData = {
  title: string;
  artist: string;
  album: string;
  genre: string;
  cover_image: string;
};

export default function UploadsPage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<CategoryKey, File | null>>({ music: null, podcast: null, live: null, stream: null });
  const [formData, setFormData] = useState<Record<CategoryKey, FormData>>({
    music: { title: "", artist: "", album: "", genre: "", cover_image: "" },
    podcast: { title: "", artist: "", album: "", genre: "", cover_image: "" },
    live: { title: "", artist: "", album: "", genre: "", cover_image: "" },
    stream: { title: "", artist: "", album: "", genre: "", cover_image: "" },
  });
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchUploads();
  }, []);

  async function fetchUploads() {
    try {
      const res = await fetch("/api/uploads");
      if (!res.ok) throw new Error("Failed to load uploads");
      const data = await res.json();
      setUploads(data);
    } catch {
      setStatusMsg("Could not load your uploads.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(type: CategoryKey, file: File | null) {
    if (!file) {
      setSelectedFiles((prev) => ({ ...prev, [type]: null }));
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setStatusMsg(`File exceeds ${MAX_SIZE_MB} MB limit.`);
      return;
    }
    if (file.size < MIN_SIZE_KB * 1024) {
      setStatusMsg(`File is below ${MIN_SIZE_KB} KB minimum.`);
      return;
    }
    const allowedExts = [".mp3", ".wav", ".ogg", ".m4a", ".mp4"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setStatusMsg("Only MP3, WAV, OGG, and M4A files are allowed.");
      return;
    }
    setStatusMsg(null);
    setSelectedFiles((prev) => ({ ...prev, [type]: file }));
    // Auto-fill title from filename if empty
    setFormData((prev) => {
      const current = prev[type];
      if (!current.title) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        return { ...prev, [type]: { ...current, title: baseName } };
      }
      return prev;
    });
  }

  function handleFormChange(type: CategoryKey, field: keyof FormData, value: string) {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  }

  async function handleUpload(type: CategoryKey) {
    const file = selectedFiles[type];
    if (!file) {
      setStatusMsg("Please select a file first.");
      return;
    }
    const meta = formData[type];
    if (!meta.title.trim()) {
      setStatusMsg("Title is required.");
      return;
    }

    setUploadingType(type);
    setStatusMsg(null);

    try {
      // Step 1: Get presigned upload URL
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, uploadType: type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) { setStatusMsg(presignData.error || "Failed to get upload URL."); return; }

      // Step 2: Upload directly to B2
      const b2Res = await fetch(presignData.uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": presignData.uploadAuthToken,
          "X-Bz-File-Name": encodeURIComponent(presignData.b2FileName),
          "Content-Type": file.type || "audio/mpeg",
          "X-Bz-Content-Sha1": "do_not_verify",
          "X-Bz-Info-upload-type": type,
        },
        body: file,
      });
      const b2Data = await b2Res.json();
      if (!b2Res.ok) { setStatusMsg(`B2 upload failed: ${b2Data.message || b2Res.statusText}`); return; }

      // Step 3: Save metadata to database
      const completeRes = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          b2FileName: b2Data.fileName,
          b2FileId: b2Data.fileId,
          originalFilename: file.name,
          uploadType: type,
          title: meta.title.trim(),
          artist: meta.artist.trim(),
          album: meta.album.trim(),
          genre: meta.genre.trim(),
          coverImage: meta.cover_image.trim(),
          fileSize: file.size,
          mimeType: file.type || "audio/mpeg",
        }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        setStatusMsg(completeData.error || "Upload failed.");
      } else {
        setStatusMsg(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
        setSelectedFiles((prev) => ({ ...prev, [type]: null }));
        setFormData((prev) => ({ ...prev, [type]: { title: "", artist: "", album: "", genre: "", cover_image: "" } }));
        fetchUploads();
      }
    } catch (err: any) {
      setStatusMsg(`Upload failed: ${err?.message || "Please try again."}`);
    } finally {
      setUploadingType(null);
      const input = fileInputRefs.current[type];
      if (input) input.value = "";
    }
  }

  function togglePlay(upload: UploadItem) {
    if (playingId === upload.id) {
      // Stop
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingId(null);
    } else {
      // Start playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`/api/uploads/serve?id=${upload.id}`);
      audioRef.current = audio;
      audio.play().catch(() => {
        setStatusMsg("Could not play audio.");
      });
      setPlayingId(upload.id);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setStatusMsg("Audio playback error.");
        setPlayingId(null);
      };
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/uploads/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setStatusMsg("Upload deleted.");
        if (playingId === deleteTarget.id) {
          if (audioRef.current) audioRef.current.pause();
          setPlayingId(null);
        }
        fetchUploads();
      } else {
        setStatusMsg("Failed to delete upload.");
      }
    } catch {
      setStatusMsg("Failed to delete upload.");
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  function getUploadForType(type: string) {
    return uploads.find((u) => u.upload_type === type) || null;
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="container mx-auto min-h-screen">
      <LoadingOverlay visible={!!uploadingType} message={`Uploading ${uploadingType}...`} />

      <ConfirmationModal
        open={!!deleteTarget}
        title="Delete Upload"
        message={`Remove "${deleteTarget?.original_filename}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmVariant="danger"
      />

      {/* Header */}
      <header className="header header-with-profile">
        <div className="logo">
          <div className="logo-mark">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="logo-text">298<span>EQ</span></span>
        </div>
        <ProfileDropdown />
      </header>

      <main style={{ paddingBottom: "120px" }}>
        <div className="hero" style={{ marginBottom: "32px", padding: "28px", position: "relative", overflow: "hidden" }}>
          <div
            className="hero-bg-dark"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "url('https://images.unsplash.com/photo-1670255022693-37f1be72bfcb?q=80&w=1265&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.8,
              filter: "blur(2px)",
              zIndex: 0,
            }}
          />
          <div className="hero-content" style={{ position: "relative", zIndex: 1 }}>
            <div className="hero-badge">Upload Manager</div>
            <h1>Your Uploads</h1>
            <p>
              Upload one file per category. Max {MAX_SIZE_MB} MB each.
              Supported: MP3, WAV, OGG, M4A.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div
            data-testid="upload-status"
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "var(--r-md)",
              background: statusMsg.includes("failed") || statusMsg.includes("Could not")
                ? "rgba(255, 59, 59, 0.1)"
                : "rgba(208, 128, 168, 0.08)",
              color: statusMsg.includes("failed") || statusMsg.includes("Could not")
                ? "#ff5555"
                : "var(--accent)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {statusMsg}
          </div>
        )}

        {loading ? (
          <div className="dashboard-loading">
            <div className="loading-spinner" />
            <p>Loading uploads...</p>
          </div>
        ) : (
          <div className="sources">
            {UPLOAD_TYPES.map((type) => {
              const existing = getUploadForType(type.key);
              const selectedFile = selectedFiles[type.key];
              const meta = formData[type.key];
              return (
                <div key={type.key} className="source-card" style={{ position: "relative" }}>
                  <div
                    className={`source-card-bg source-card-bg-${type.key}`}
                    style={{ backgroundImage: `url('${CARD_BG[type.key]}')` }}
                  />
                  <div className="source-icon">{type.icon}</div>
                  <div className="source-title">{type.label}</div>

                  {existing ? (
                    <>
                      <img src={existing.cover_image || CARD_BG[type.key]} alt="" className="w-16 h-16 rounded-lg object-cover mx-auto my-2" />
                      <div className="source-subtitle" style={{ fontWeight: 600 }}>{existing.title}</div>
                      <div className="source-subtitle" style={{ fontSize: "11px" }}>
                        {existing.artist}
                        {existing.album ? ` · ${existing.album}` : ""}
                        {existing.genre ? ` · ${existing.genre}` : ""}
                      </div>
                      <div className="source-subtitle" style={{ fontSize: "11px", marginTop: "4px" }}>
                        {existing.original_filename} · {formatSize(existing.file_size_bytes)}
                        {existing.source === "youtube" && (
                          <span style={{ marginLeft: 6, color: "var(--accent)" }}>
                            <Cloud size={10} style={{ display: "inline", verticalAlign: "middle" }} /> YouTube
                          </span>
                        )}
                      </div>

                      {/* Play / Stop */}
                      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ flex: 1, fontSize: "12px", padding: "8px 12px" }}
                          onClick={() => togglePlay(existing)}
                          disabled={!!deletingId}
                        >
                          {playingId === existing.id ? (
                            <>
                              <Pause size={12} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play size={12} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                              Play
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ flex: 1, fontSize: "12px", padding: "8px 12px" }}
                          onClick={() => {
                            setSelectedFiles((prev) => ({ ...prev, [type.key]: null }));
                          }}
                          disabled={!!deletingId || !!uploadingType}
                        >
                          Replace
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <a
                          href={existing.file_url}
                          download
                          className="btn btn-secondary"
                          style={{ flex: 1, fontSize: "12px", padding: "8px 12px", textAlign: "center", textDecoration: "none" }}
                        >
                          <Download size={12} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                          Download
                        </a>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ flex: 1, fontSize: "12px", padding: "8px 12px" }}
                          onClick={() => setDeleteTarget(existing)}
                          disabled={!!deletingId}
                        >
                          {deletingId === existing.id ? (
                            <span className="inline-spinner" style={{ marginRight: "6px" }} />
                          ) : null}
                          {deletingId === existing.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="source-subtitle">
                        {selectedFile ? selectedFile.name : "No file selected"}
                      </div>

                      {/* File picker */}
                      <label
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          cursor: "pointer",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        className="btn btn-secondary"
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: `url('${BUTTON_BG}')`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            opacity: 0.75,
                            filter: "blur(4px)",
                            zIndex: 0,
                          }}
                        />
                        <span style={{ position: "relative", zIndex: 1 }}>
                          {selectedFile ? "Change File" : "+ Select File"}
                        </span>
                        <input
                          type="file"
                          data-testid={`file-input-${type.key}`}
                          accept=".mp3,.wav,.ogg,.m4a,.mp4,audio/*"
                          style={{ display: "none" }}
                          ref={(el) => { fileInputRefs.current[type.key] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleFileSelect(type.key, file);
                          }}
                        />
                      </label>

                      {/* Metadata form */}
                      {selectedFile && (
                        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <input
                            type="text"
                            placeholder="Title *"
                            value={meta.title}
                            onChange={(e) => handleFormChange(type.key, "title", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "var(--r-md)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Artist"
                            value={meta.artist}
                            onChange={(e) => handleFormChange(type.key, "artist", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "var(--r-md)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Album"
                            value={meta.album}
                            onChange={(e) => handleFormChange(type.key, "album", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "var(--r-md)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Genre"
                            value={meta.genre}
                            onChange={(e) => handleFormChange(type.key, "genre", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "var(--r-md)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Cover Image URL (optional)"
                            value={meta.cover_image}
                            onChange={(e) => handleFormChange(type.key, "cover_image", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "var(--r-md)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ marginTop: "4px", fontSize: "13px", padding: "10px" }}
                            onClick={() => handleUpload(type.key)}
                            disabled={!!uploadingType}
                          >
                            {uploadingType === type.key ? "Uploading..." : "Upload Selected File"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
