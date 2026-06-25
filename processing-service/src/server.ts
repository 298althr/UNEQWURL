/**
 * 298EQ Processing Service — Express server
 * Handles YouTube download/stream + audio analysis with system dependencies
 * (yt-dlp, ffmpeg, Python/librosa, libsonare WASM)
 */
import express from "express";
import cors from "cors";
import { execSync, execFileSync } from "child_process";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { query } from "./db";
import { uploadFile, deleteFile, getDownloadUrl } from "./b2-storage";
import { autoAnalyzeTrack } from "./audio/auto-analyze";

const app = express();
const PORT = parseInt(process.env.PORT || "3100", 10);

// Bump deployment marker v1
console.log("[298eq-processing] Starting server v2 (libsonare 1.4.0)");

// --- CORS ---
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// --- Helpers ---

function cleanYoutubeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const v = u.searchParams.get("v");
    if (v && u.hostname.includes("youtube.com")) {
      return `https://www.youtube.com/watch?v=${v}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
    }
  } catch {
    // ignore
  }
  return raw;
}

function getYtDlpBin(): string {
  const candidates = ["yt-dlp", "youtube-dl"];
  for (const bin of candidates) {
    try {
      execSync(`${bin} --version`, { stdio: "pipe" });
      return bin;
    } catch {
      continue;
    }
  }
  return "";
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
}

// --- Health check ---
app.get("/health", (_req, res) => {
  const ytDlp = getYtDlpBin();
  let ffmpegOk = false;
  let pythonOk = false;
  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
    ffmpegOk = true;
  } catch { /* not installed */ }
  try {
    execSync("python3 --version", { stdio: "pipe" });
    pythonOk = true;
  } catch { /* not installed */ }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    dependencies: {
      yt_dlp: ytDlp || "not found",
      ffmpeg: ffmpegOk ? "installed" : "not found",
      python3: pythonOk ? "installed" : "not found",
    },
  });
});

// --- YouTube stream (extract URL + metadata, no download) ---
app.post("/youtube/stream", async (req, res) => {
  try {
    const rawUrl = String(req.body?.url ?? "").trim();
    const url = cleanYoutubeUrl(rawUrl);

    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    if (!url.includes("youtube.com/") && !url.includes("youtu.be/")) {
      return res.status(400).json({ error: "Only YouTube URLs are supported" });
    }

    const ytDlp = getYtDlpBin();
    if (!ytDlp) {
      return res.status(500).json({ error: "yt-dlp is not installed" });
    }

    const streamArgs = ["-f", "bestaudio[ext=webm]/bestaudio/best", "--get-url", "--no-playlist", "--no-cache-dir", url];
    let streamUrl: string;
    try {
      streamUrl = execFileSync(ytDlp, streamArgs, { encoding: "utf-8", timeout: 30000 }).trim();
    } catch (err: any) {
      const errMsg = err?.stderr?.toString?.() || err?.message || String(err);
      console.error("[yt-dlp stream] error:", errMsg);
      return res.status(500).json({ error: "Failed to extract stream URL", detail: errMsg.slice(0, 500) });
    }

    const metaArgs = ["--dump-json", "--no-warnings", "--no-playlist", "--no-cache-dir", url];
    let metadata: any;
    try {
      const metaJson = execFileSync(ytDlp, metaArgs, { encoding: "utf-8", timeout: 30000 }).trim();
      metadata = JSON.parse(metaJson);
    } catch (err: any) {
      console.error("[yt-dlp metadata] error:", err?.stderr?.toString?.() || err?.message || String(err));
      return res.status(500).json({ error: "Failed to fetch video metadata" });
    }

    return res.json({
      success: true,
      title: metadata.title || "Unknown Title",
      artist: metadata.uploader || metadata.channel || "Unknown Artist",
      duration: metadata.duration || 0,
      thumbnail: metadata.thumbnail || "",
      streamUrl,
      message: "Stream extracted (no storage used)",
    });
  } catch (err: any) {
    console.error("[POST /youtube/stream] error:", err);
    return res.status(500).json({ error: "Server error", detail: err?.message || String(err) });
  }
});

// --- YouTube download (download audio, upload to B2, insert DB, trigger analysis) ---
app.post("/youtube/download", async (req, res) => {
  let tempFile: string | null = null;

  try {
    const rawUrl = String(req.body?.url ?? "").trim();
    const url = cleanYoutubeUrl(rawUrl);
    const userId = String(req.body?.userId ?? "").trim();
    const uploadType = String(req.body?.uploadType ?? "").trim() as "music" | "podcast" | "live" | "stream";
    const title = String(req.body?.title ?? "").trim();
    const artist = String(req.body?.artist ?? "").trim();
    const thumbnail = String(req.body?.thumbnail ?? "").trim() || null;
    const durationSeconds = req.body?.duration_seconds || null;

    if (!url) return res.status(400).json({ error: "URL required" });
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!["music", "podcast", "live", "stream"].includes(uploadType)) {
      return res.status(400).json({ error: "uploadType must be music, podcast, live, or stream" });
    }
    if (!title) return res.status(400).json({ error: "Title is required" });

    const ytDlp = getYtDlpBin();
    if (!ytDlp) {
      return res.status(500).json({ error: "yt-dlp is not installed" });
    }

    const baseName = sanitizeFileName(title);
    tempFile = join(tmpdir(), `${baseName}_${Date.now()}.mp3`);

    const downloadArgs = [
      "-x", "--audio-format", "mp3", "--audio-quality", "0",
      "--no-playlist", "--no-cache-dir",
      "-o", tempFile,
      url,
    ];
    console.log(`[yt-dlp download] starting: ${ytDlp} ${downloadArgs.join(" ")}`);

    try {
      execFileSync(ytDlp, downloadArgs, { encoding: "utf-8", stdio: "pipe", timeout: 120000 });
    } catch (err: any) {
      const errMsg = err?.stderr?.toString?.() || err?.message || String(err);
      console.error("[yt-dlp download] error:", errMsg);
      return res.status(500).json({ error: "Failed to download audio from YouTube", detail: errMsg.slice(0, 500) });
    }

    if (!existsSync(tempFile)) {
      return res.status(500).json({ error: "Download completed but temp file not found" });
    }

    const buffer = readFileSync(tempFile);
    const fileSize = buffer.length;

    const safeName = `${baseName}.mp3`;
    const b2Result = await uploadFile(userId, uploadType, safeName, buffer, "audio/mpeg");

    const skipReplace = req.body?.skipReplace === true;

    // Check for existing upload of same type and delete old B2 file + DB record
    if (!skipReplace) {
      const { rows: existing } = await query<{ id: string; b2_file_name: string; b2_file_id: string }>(
        `SELECT id, b2_file_name, b2_file_id FROM user_uploads WHERE user_id = $1 AND upload_type = $2`,
        [userId, uploadType]
      );

      if (existing.length > 0) {
        try {
          await deleteFile(existing[0].b2_file_name, existing[0].b2_file_id);
        } catch (err) {
          console.error("[B2] Failed to delete old file:", err);
        }
        await query(`DELETE FROM user_uploads WHERE id = $1`, [existing[0].id]);
      }
    }

    const { rows } = await query<{
      id: string; b2_file_name: string;
    }>(
      `insert into user_uploads
       (user_id, upload_type, source, youtube_url, original_filename, b2_file_name, b2_file_id,
        title, artist, cover_image, file_size_bytes, mime_type, duration_seconds)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       returning id, b2_file_name`,
      [
        userId, uploadType, "youtube", url, safeName,
        b2Result.fileName, b2Result.fileId,
        title, artist || "Unknown Artist", thumbnail,
        fileSize, "audio/mpeg", durationSeconds,
      ]
    );

    const upload = rows[0];
    const downloadUrl = getDownloadUrl(upload.b2_file_name);

    autoAnalyzeTrack({ id: upload.id, source: "upload", b2_file_name: upload.b2_file_name })
      .catch((e) => console.error("[autoAnalyze] youtube background error:", e?.message?.slice(0, 200)));

    return res.json({
      success: true,
      upload: { id: upload.id, b2_file_name: upload.b2_file_name },
      downloadUrl,
      message: "Downloaded from YouTube and saved to B2",
    });
  } catch (err: any) {
    console.error("[POST /youtube/download] error:", err);
    return res.status(500).json({ error: "Server error", detail: err?.message || String(err) });
  } finally {
    if (tempFile && existsSync(tempFile)) {
      try { unlinkSync(tempFile); } catch { /* ignore */ }
    }
  }
});

// --- Analyze a track by ID ---
app.post("/analyze", async (req, res) => {
  try {
    const trackId = String(req.body?.trackId ?? "").trim();
    const source = String(req.body?.source ?? "upload").trim() as "song" | "upload";

    if (!trackId) {
      return res.status(400).json({ error: "trackId required" });
    }

    let b2_file_name: string;

    if (source === "song") {
      const { rows } = await query<{ file_url: string }>(
        `SELECT file_url FROM songs WHERE id = $1`,
        [trackId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Song not found" });
      }
      b2_file_name = rows[0].file_url;
    } else {
      const { rows } = await query<{ b2_file_name: string }>(
        `SELECT b2_file_name FROM user_uploads WHERE id = $1`,
        [trackId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Upload not found" });
      }
      b2_file_name = rows[0].b2_file_name;
    }

    const success = await autoAnalyzeTrack({ id: trackId, source, b2_file_name });

    if (!success) {
      return res.status(500).json({ error: "Analysis failed — check server logs" });
    }

    const { rows: analysisRows } = await query(
      `SELECT * FROM audio_analysis WHERE track_id = $1 AND track_source = $2`,
      [trackId, source]
    );
    const { rows: featureRows } = await query(
      `SELECT * FROM audio_features WHERE track_id = $1 AND track_source = $2`,
      [trackId, source]
    );
    const { rows: benchmarkRows } = await query(
      `SELECT * FROM audio_benchmarks WHERE track_id = $1 AND track_source = $2`,
      [trackId, source]
    );

    if (source === "song" && benchmarkRows.length > 0) {
      const bm = benchmarkRows[0] as any;
      const feat = featureRows[0] as any;
      const defaultSettings = bm.optimal_eq?.headphone || bm.benchmarks?.headphone?.settings;
      const defaultWeights = bm.benchmarks?.headphone?.weights;
      await query(
        `UPDATE songs
         SET benchmark_settings = $1,
             benchmark_weights = $2,
             benchmark_ready = true,
             analysis_status = 'ready',
             bpm = $3,
             musical_key = $4,
             probe_data = $5
         WHERE id = $6`,
        [
          JSON.stringify(defaultSettings),
          JSON.stringify(defaultWeights),
          feat?.bpm ?? null,
          feat?.musical_key && feat?.key_mode ? `${feat.musical_key} ${feat.key_mode}` : null,
          JSON.stringify({
            genre: bm.detected_genre,
            genre_confidence: bm.genre_confidence,
            mastering_preset: bm.mastering_preset,
            lufs: (analysisRows[0] as any)?.lufs_integrated,
            bpm: feat?.bpm,
            key: feat?.musical_key,
            key_mode: feat?.key_mode,
            spectral_centroid: (analysisRows[0] as any)?.spectral_centroid_hz,
            quality_scores: {
              headphone: bm.quality_score_headphone,
              studio: bm.quality_score_studio,
              live: bm.quality_score_live,
            },
            contexts: bm.benchmarks,
            analyzedAt: new Date().toISOString(),
          }),
          trackId,
        ]
      );
    }

    return res.json({
      trackId,
      status: "complete",
      analysis: analysisRows[0] || null,
      features: featureRows[0] || null,
      benchmarks: benchmarkRows[0] || null,
    });
  } catch (err: any) {
    console.error("[POST /analyze] error:", err);
    return res.status(500).json({ error: "Analysis failed", detail: err?.message || String(err) });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`[298eq-processing] Server running on port ${PORT}`);
  console.log(`[298eq-processing] CORS origins: ${corsOrigins.join(", ")}`);
});
