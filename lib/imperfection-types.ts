export type CableFaultConfig = {
  enabled: boolean;
  noiseLevel: number; // 0-100
  humLevel: number; // 0-100
  crackleProbability: number; // 0-1
  frequencyCutoff: number; // 20-20000
};

export type SpeakerDamageConfig = {
  enabled: boolean;
  distortionAmount: number; // 0-100
  tornFreqLow: number; // 20-20000
  tornFreqHigh: number; // 20-20000
  healthPercent: number; // 0-100
};

export type AcousticsConfig = {
  enabled: boolean;
  rt60: number; // 0.1-10 seconds
  roomSize: number; // 1-100 m
  absorption: number; // 0-1
  reverbAmount: number; // 0-100
};

export type PositioningConfig = {
  enabled: boolean;
  leftDelayMs: number; // 0-50 ms
  rightDelayMs: number; // 0-50 ms
  angle: number; // -90 to 90 degrees
  distance: number; // 0.5-20 m
};

export type SpeakerHealthConfig = {
  enabled: boolean;
  lowFreqLoss: number; // 0-100
  highFreqLoss: number; // 0-100
  overallDegradation: number; // 0-100
};

export type InconsistencyConfig = {
  enabled: boolean;
  gainVariance: number; // 0-100
  dropoutsPerMin: number; // 0-60
  phaseVariance: number; // 0-180
};

export type AmplifierConfig = {
  enabled: boolean;
  saturation: number; // 0-100
  headroom: number; // -24 to 0 dB
  warmth: number; // 0-100
};

export type OutputConfig = {
  leftGain: number; // -60 to 12 dB
  rightGain: number; // -60 to 12 dB
  leftDelayMs: number; // 0-100 ms
  rightDelayMs: number; // 0-100 ms
  leftPolarity: boolean;
  rightPolarity: boolean;
  balance: number; // -1 to 1
};

export type ImperfectionConfig = {
  cable: CableFaultConfig;
  speakerDamage: SpeakerDamageConfig;
  acoustics: AcousticsConfig;
  positioning: PositioningConfig;
  speakerHealth: SpeakerHealthConfig;
  inconsistency: InconsistencyConfig;
  amplifier: AmplifierConfig;
  output: OutputConfig;
};

export type ImperfectionProfile = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  config: ImperfectionConfig;
  created_at: string;
  updated_at: string;
};

export type ImperfectionMetrics = {
  sti: number; // 0-1
  c80: number; // dB
  spl: number; // dB
  rt60: number; // seconds
  lufs: number; // LUFS
  frequencyResponse: number; // 0-100 quality score
  correlation: number; // -1 to 1
  leftLevel: number; // dB
  rightLevel: number; // dB
  thd: number; // total harmonic distortion %
  speakerHealth: number; // 0-100
};

export const DEFAULT_IMPERFECTION_CONFIG: ImperfectionConfig = {
  cable: {
    enabled: false,
    noiseLevel: 20,
    humLevel: 15,
    crackleProbability: 0.05,
    frequencyCutoff: 16000,
  },
  speakerDamage: {
    enabled: false,
    distortionAmount: 25,
    tornFreqLow: 200,
    tornFreqHigh: 2000,
    healthPercent: 80,
  },
  acoustics: {
    enabled: false,
    rt60: 1.2,
    roomSize: 25,
    absorption: 0.4,
    reverbAmount: 30,
  },
  positioning: {
    enabled: false,
    leftDelayMs: 0,
    rightDelayMs: 0,
    angle: 0,
    distance: 3,
  },
  speakerHealth: {
    enabled: false,
    lowFreqLoss: 10,
    highFreqLoss: 10,
    overallDegradation: 5,
  },
  inconsistency: {
    enabled: false,
    gainVariance: 10,
    dropoutsPerMin: 0,
    phaseVariance: 0,
  },
  amplifier: {
    enabled: false,
    saturation: 10,
    headroom: -6,
    warmth: 20,
  },
  output: {
    leftGain: 0,
    rightGain: 0,
    leftDelayMs: 0,
    rightDelayMs: 0,
    leftPolarity: true,
    rightPolarity: true,
    balance: 0,
  },
};
