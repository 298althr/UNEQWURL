/**
 * Audio decoder — uses ffmpeg to extract raw PCM data from any audio file.
 * Outputs mono 44.1kHz Float32 samples for analysis.
 */
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { unlinkSync, existsSync, readFileSync } from "fs";

export interface DecodedAudio {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  channels: number;
}

export function decodeAudio(input: string, maxDurationSec: number = 120): DecodedAudio {
  const sampleRate = 44100;
  const isUrl = input.startsWith("http://") || input.startsWith("https://");
  const tmpPath = join(tmpdir(), `298eq_decode_${Date.now()}.f32`);

  try {
    const args = [
      "-y",
      "-i", input,
      "-ac", "1",
      "-ar", String(sampleRate),
      "-f", "f32le",
      "-t", String(maxDurationSec),
      tmpPath,
    ];

    if (isUrl) {
      args.unshift("-timeout", "30000000");
    }

    execFileSync("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60000,
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
