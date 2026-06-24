/**
 * LiveInputProcessor — captures microphone/instrument input via getUserMedia
 * and routes it through the Web Audio API chain for real-time processing.
 *
 * Phase 4: Live Production Mode
 *
 * Signal chain:
 *   MediaStream → MediaStreamSource → [AdvancedFX] → WEQ8 → Compressor →
 *   Panner → Limiter → ChannelGain → MakeupGain → Destination
 */

import type { AdvancedFXChain } from "./effects/AdvancedFXChain";
import type { ConsoleSettings } from "./audio-chain";

export type LiveInputStatus = "idle" | "requesting" | "active" | "error";

export type LiveInputSource = "microphone" | "system" | "instrument";

export interface LiveInputConfig {
  source: LiveInputSource;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  channelCount: number;
}

export function getDefaultLiveInputConfig(): LiveInputConfig {
  return {
    source: "microphone",
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 2,
  };
}

export class LiveInputProcessor {
  ctx: AudioContext;
  stream: MediaStream | null = null;
  sourceNode: MediaStreamAudioSourceNode | null = null;
  analyser: AnalyserNode;
  status: LiveInputStatus = "idle";
  errorMsg: string | null = null;
  config: LiveInputConfig;

  constructor(ctx: AudioContext, config?: Partial<LiveInputConfig>) {
    this.ctx = ctx;
    this.config = { ...getDefaultLiveInputConfig(), ...config };
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
  }

  /**
   * Request microphone (or system audio) access and create source node.
   * Returns true on success.
   */
  async start(): Promise<boolean> {
    if (this.status === "active") return true;

    this.status = "requesting";
    this.errorMsg = null;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          channelCount: this.config.channelCount,
        },
        video: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.sourceNode = this.ctx.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyser);
      this.status = "active";
      return true;
    } catch (err: any) {
      this.status = "error";
      this.errorMsg = err?.message || "Failed to access microphone";
      console.error("[LiveInputProcessor] getUserMedia error:", err);
      return false;
    }
  }

  /**
   * Connect the live input to a destination node (e.g., AdvancedFX input or WEQ8).
   */
  connectTo(destination: AudioNode): void {
    if (this.sourceNode) {
      this.sourceNode.connect(destination);
    }
  }

  /**
   * Disconnect from a specific destination.
   */
  disconnectFrom(destination: AudioNode): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect(destination);
      } catch { /* not connected */ }
    }
  }

  /**
   * Stop the live input and release resources.
   */
  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch { /* already disconnected */ }
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.status = "idle";
  }

  /**
   * Update configuration (requires restart to take effect).
   */
  updateConfig(config: Partial<LiveInputConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current input level (RMS in dB).
   */
  getInputLevel(): number {
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumSquares += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    return 20 * Math.log10(rms + 1e-10);
  }

  /**
   * Get peak sample value (0-1).
   */
  getPeak(): number {
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    let maxSample = 0;
    for (let i = 0; i < bufferLength; i++) {
      const abs = Math.abs(dataArray[i]);
      if (abs > maxSample) maxSample = abs;
    }
    return maxSample;
  }

  destroy(): void {
    this.stop();
    try {
      this.analyser.disconnect();
    } catch { /* already disconnected */ }
  }
}
