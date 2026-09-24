// Synthesised audio: levels and engine voice tuning (all sound is generated, no files).

export const MASTER_VOLUME = 0.7;
export const ENGINE = {
  idleHz: 44,
  topHz: 150,
  cutoffIdle: 420,
  cutoffTop: 3200,
  idleGain: 0.06,
  throttleGain: 0.12,
  rumbleDepth: 0.25,
};
export const SCREECH = { threshold: 1.8, full: 5.5, gain: 0.2, freq: 1900 };
export const IMPACT = { minSpeed: 1.2, gain: 0.55 };
export const BEEP = { red: 660, go: 1320, gain: 0.22 };
export const CHIME = { lap: [880, 1320], best: [880, 1109, 1320, 1760], gain: 0.16 };
