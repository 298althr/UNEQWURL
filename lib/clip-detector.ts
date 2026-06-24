/**
 * ClipDetector — real-time clipping and DC offset detection.
 *
 * Phase 4: Live Production Mode
 *
 * Monitors an AnalyserNode for:
 * - Clipping: sample magnitude exceeds threshold (default -0.5 dB)
 * - DC offset: average sample value significantly non-zero
 * - Continuous peak hold with decay
 */

export interface ClipDetectorConfig {
  clipThresholdDb: number;   // dBFS threshold for clipping (default -0.5)
  dcOffsetThreshold: number; // absolute sample value for DC offset (default 0.05)
  peakHoldSeconds: number;   // how long to hold peak indicator (default 1.0)
  monitorIntervalMs: number; // polling interval (default 50)
}

export function getDefaultClipDetectorConfig(): ClipDetectorConfig {
  return {
    clipThresholdDb: -0.5,
    dcOffsetThreshold: 0.05,
    peakHoldSeconds: 1.0,
    monitorIntervalMs: 50,
  };
}

export interface ClipStatus {
  isClipping: boolean;
  isDCOffset: boolean;
  peakDb: number;
  rmsDb: number;
  clipCount: number;
  lastClipTime: number | null;
}

export class ClipDetector {
  private analyser: AnalyserNode;
  private config: ClipDetectorConfig;
  private intervalId: number | null = null;
  private clipCount = 0;
  private lastClipTime: number | null = null;
  private peakHoldUntil = 0;
  private listeners: ((status: ClipStatus) => void)[] = [];
  private buffer: Float32Array;

  constructor(analyser: AnalyserNode, config?: Partial<ClipDetectorConfig>) {
    this.analyser = analyser;
    this.config = { ...getDefaultClipDetectorConfig(), ...config };
    this.buffer = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
  }

  /**
   * Start monitoring. Calls listeners on each interval with current status.
   */
  start(): void {
    if (this.intervalId !== null) return;

    this.intervalId = window.setInterval(() => {
      const status = this.check();
      this.listeners.forEach((fn) => fn(status));
    }, this.config.monitorIntervalMs);
  }

  /**
   * Stop monitoring.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform a single check and return status.
   */
  check(): ClipStatus {
    this.analyser.getFloatTimeDomainData(this.buffer as any);

    let maxSample = 0;
    let sumSquares = 0;
    let sumSamples = 0;
    const len = this.buffer.length;

    for (let i = 0; i < len; i++) {
      const s = this.buffer[i];
      const abs = Math.abs(s);
      if (abs > maxSample) maxSample = abs;
      sumSquares += s * s;
      sumSamples += s;
    }

    const rms = Math.sqrt(sumSquares / len);
    const avg = sumSamples / len;
    const peakDb = 20 * Math.log10(maxSample + 1e-10);
    const rmsDb = 20 * Math.log10(rms + 1e-10);
    const now = performance.now();

    // Clipping detection
    const clipThresholdLinear = Math.pow(10, this.config.clipThresholdDb / 20);
    const isClippingNow = maxSample >= clipThresholdLinear;

    if (isClippingNow) {
      this.clipCount++;
      this.lastClipTime = now;
      this.peakHoldUntil = now + this.config.peakHoldSeconds * 1000;
    }

    const isClipping = now < this.peakHoldUntil;

    // DC offset detection
    const isDCOffset = Math.abs(avg) > this.config.dcOffsetThreshold;

    return {
      isClipping,
      isDCOffset,
      peakDb,
      rmsDb,
      clipCount: this.clipCount,
      lastClipTime: this.lastClipTime,
    };
  }

  /**
   * Subscribe to status updates.
   */
  onStatus(callback: (status: ClipStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  /**
   * Reset clip count and state.
   */
  reset(): void {
    this.clipCount = 0;
    this.lastClipTime = null;
    this.peakHoldUntil = 0;
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<ClipDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }
}
