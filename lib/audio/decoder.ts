/**
 * Audio decoder — uses ffmpeg to extract raw PCM data from any audio file.
 * Outputs mono 44.1kHz Float32 samples for analysis.
 */
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";

export interface DecodedAudio {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  channels: number;
}

/**
 * Decode an audio file (local path or URL) to mono Float32 PCM at 44.1kHz.
 * Uses ffmpeg to convert to raw PCM, then reads the bytes.
 */
export function decodeAudio(input: string, maxDurationSec: number = 120): DecodedAudio {
  const sampleRate = 44100;
  const isUrl = input.startsWith("http://") || input.startsWith("https://");

  // For URLs, ffmpeg can read directly
  const tmpPath = join(tmpdir(), `298eq_decode_${Date.now()}.f32`);

  try {
    const args: string[] = [];

    if (isUrl) {
      args.push("-timeout", "30000000", "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5");
    }

    args.push(
      "-y",
      "-i", input,
      "-ac", "1",
      "-ar", String(sampleRate),
      "-f", "f32le",
      "-t", String(maxDurationSec),
      tmpPath,
    );

    execFileSync("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
    });

    if (!existsSync(tmpPath)) {
      throw new Error("ffmpeg did not produce output file");
    }

    const buf = readFileSync(tmpPath);
    const samples = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

    return {
      samples,
      sampleRate,
      duration: samples.length / sampleRate,
      channels: 1,
    };
  } finally {
    if (existsSync(tmpPath)) {
      try { unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }
}

/**
 * Get audio file duration without full decode (using ffprobe).
 */
export function getDuration(input: string): number {
  try {
    const output = execFileSync("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      input,
    ], { encoding: "utf-8", timeout: 15000 }).trim();

    return parseFloat(output) || 0;
  } catch {
    return 0;
  }
}
