// Synthesised audio: levels and engine voice tuning (all sound is generated, no files).

export const MASTER_VOLUME = 0.7;
// Page hidden: master fade time constant (s), then suspend the context after this many ms
export const LIFECYCLE = { fade: 0.012, suspendMs: 60 };
// Single-cylinder rental kart with a centrifugal clutch (rpm). Firing tone = rpm / 60 × hzPerRev.
export const ENGINE = {
  idleRpm: 1700,
  biteRpm: 2600, // clutch starts to grab
  lockRpm: 3000, // clutch fully locked; above this the engine is tied to the rear axle
  dropRpm: 2000, // off the throttle the clutch stays engaged (engine braking) down to here
  maxRpm: 5600, // top of the rev range the voice spans (the physics' engine reaches ~5500 at top speed)
  topSpeed: 17, // m/s the kart reaches at maxRpm (single fixed ratio; its flat-out top, config/physics.js)
  slipFlare: 650, // rpm added when the rear tyres spin / slide under power
  revRate: 9, // 1/s how fast free revs chase the throttle (clutch open)
  hzPerRev: 1.6, // fundamental Hz per rev/s (≈ 45 Hz at idle, 145 Hz flat out)
  cutoffIdle: 380,
  cutoffTop: 3400,
  idleGain: 0.07,
  loadGain: 0.12,
  rumbleDepth: 0.3, // firing-pulse amplitude modulation
  idleWobble: 22, // cents of lumpy-idle pitch wander
};
// Rival engines: the nearest karts get a voice each (pitch multipliers keep them apart), fading out
// by `hear` m; a voiced kart keeps its voice unless another is `hold` m closer (no swapping back and forth);
// a kart that moves more than `teleport` m in one frame was placed, so its revs restart from idle
export const PACK = { pitches: [1.08, 0.93], hear: 34, hold: 3, teleport: 4 };
// Pops and crackles on the overrun after lifting off at high revs
export const BACKFIRE = { minRpm: 0.62, lift: 0.5, pops: [3, 7], window: 0.55, gain: 0.16 };
// Tyres: squeal from how hard they work (lateral g + slip), brake scrub, barrier scrape
export const TYRES = {
  gripG: [7, 15], // m/s² lateral: squeal starts / full from cornering load alone
  slip: [1.4, 5], // m/s sideways: squeal starts / full from sliding
  squealGain: 0.19,
  squealHz: [1350, 2150], // two resonant tyre bands, pitch rises a little with slip
  brakeDecel: [6, 12], // m/s² braking: scrub starts / full
  brakeGain: 0.16,
  brakeHz: 520,
  judderHz: 19, // tyre/chassis hop under hard braking
  scrapeGain: 0.22,
  scrapeHz: 2600,
  scrapeHold: 0.18, // s the scrape lingers after the last wall contact
};
// Kerb rumble: filtered noise chopped at the rib rate plus a low buzz
export const KERB_RUMBLE = { gain: 0.3, lowpass: 420, buzz: 0.35 };
export const IMPACT = { minSpeed: 1.2, gain: 0.55 };
export const BEEP = { red: 660, go: 1320, gain: 0.22 };
export const CHIME = { lap: [880, 1320], best: [880, 1109, 1320, 1760], gain: 0.16 };
