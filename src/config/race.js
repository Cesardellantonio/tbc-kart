// Race flow: start-light timing, messages and persistence.

import { NOVA } from './edition.js';

export const LIGHT_INTERVAL = 0.85; // seconds between each red light
export const LIGHTS_HOLD = [0.5, 1.3]; // random hold after all five are lit
export const GO_SHOW = 1.4; // seconds the gantry shows green
export const LIGHT_COUNT = 5;

export const TOAST_TIME = 2.4;
export const STORAGE_KEY = NOVA ? 'tbc-nova.v1' : 'tbc-kart.v1'; // NOVA keeps its own records

// Computer drivers (attract mode, your kart after the flag, and the rivals' base pace).
export const AUTOPILOT = {
  lookAhead: 5, // m, pure-pursuit aim distance at rest…
  lookSpeed: 0.25, // s, …plus this many seconds of travel
  steerGain: 2.4, // steering input per rad of heading error
  yawDamp: 0.2, // steering input per rad/s of yaw rate beyond what the aim asks for
  maxSpeed: 17.5, // m/s, target on the straights (above the kart's ~17 m/s top, so skill 1 runs flat out)
  latAccel: 7.5, // m/s², lateral acceleration planned for in corners at skill 1 (race/speedPlan.js)…
  planChord: 0.7, // s, …on the line's curvature measured across this much travel (pure pursuit rounds
  planChordMin: 4.5, // m    off a quick flick far more than a slow hairpin), kept within these
  planChordMax: 14, // m     bounds
  planDecel: 4.1, // m/s², braking planned into each corner at skill 1 (full rear brakes give ~7)
  planAhead: 0.25, // s, how far up the plan the target speed is read (brake / lift reaction)
  throttleBase: 0.5, // throttle share at the target speed (holds pace against drag)
  throttleGain: 0.8, // extra throttle per m/s below the target
  brakeMargin: 0.3, // m/s over the target before braking
  brakeGain: 1, // brake pressure per m/s beyond that margin
  lockSteer: 0.9, // steering beyond this share of lock is saturated…
  lockThrottle: 6.5, // …and throttle is cut by this much per unit of steer beyond it (on-power push)…
  lockThrottleMin: 0.35, // …down to this floor
  slipLiftStart: 0.06, // rad of body slip where the throttle starts coming off…
  slipLiftRange: 0.15, // …fully lifted this much further on…
  slipLiftMin: 0.15, // …to this floor
};

// Grand Prix: grid layout and the rival field (race distance is each track's `laps`).
// slot 0 = pole; the player starts 8th (a Grand Prix without qualifying), the rivals fill the rest in
// a new order each race. size: karts on the grid (you + RIVALS; online, humans + AI).
export const GRID = { rowGap: 3.4, lateral: 1.45, playerSlot: 7, size: 12 };
export const FINISH_COOLDOWN = { maxSpeed: 9 }; // m/s the autopilot drives your kart after the flag

// Rival drivers. skill scales the planned corner and braking speeds (the straights are flat out for
// everyone: same karts); line = preferred offset from the racing line on the straights (m, + = right;
// small, so it costs less than one 0.005 step of the skill ladder);
// react = start reaction (s); aggression 0..1 = odds of covering the inside when attacked, and how much
// later than usual they brake when alongside a kart.
export const RIVALS = [
  { code: 'VAL', name: 'S. Valente', number: '16', body: 0xd62ad0, suit: 0x240046, stripe: 0xffffff, skill: 1.02, line: 0.10, react: 0.19, aggression: 0.7 },
  { code: 'ROS', name: 'M. Rossi', number: '11', body: 0xe63946, suit: 0x2b2d42, stripe: 0xffffff, skill: 1.015, line: -0.10, react: 0.18, aggression: 0.85 },
  { code: 'BRA', name: 'A. Braga', number: '9', body: 0x8d1b3d, suit: 0xf4f4f4, stripe: 0xffc21a, skill: 1.01, line: -0.10, react: 0.21, aggression: 0.8 },
  { code: 'OKA', name: 'T. Okafor', number: '23', body: 0x2bd97c, suit: 0x1b4332, stripe: 0x111111, skill: 1.005, line: 0.15, react: 0.22, aggression: 0.55 },
  { code: 'SAN', name: 'D. Santos', number: '27', body: 0x0f9d8a, suit: 0x0b2545, stripe: 0xffffff, skill: 1.0, line: 0.10, react: 0.23, aggression: 0.6 },
  { code: 'LIN', name: 'E. Lindqvist', number: '5', body: 0x3a86ff, suit: 0x0b2545, stripe: 0xffd60a, skill: 0.995, line: 0.05, react: 0.2, aggression: 0.65 },
  { code: 'KOW', name: 'J. Kowalski', number: '14', body: 0x9aa3ad, suit: 0x1b1c20, stripe: 0xe63946, skill: 0.99, line: -0.15, react: 0.24, aggression: 0.5 },
  { code: 'TAN', name: 'K. Tanaka', number: '88', body: 0xff7b00, suit: 0x222222, stripe: 0x3a86ff, skill: 0.985, line: -0.20, react: 0.26, aggression: 0.4 },
  { code: 'MEI', name: 'L. Mei', number: '81', body: 0xc98b2b, suit: 0x2b2d42, stripe: 0x111111, skill: 0.98, line: 0.20, react: 0.25, aggression: 0.55 },
  { code: 'MOR', name: 'L. Moreau', number: '31', body: 0xb388ff, suit: 0x3c096c, stripe: 0xffffff, skill: 0.975, line: 0.25, react: 0.28, aggression: 0.75 },
  { code: 'OBR', name: "C. O'Brien", number: '55', body: 0x2a2b33, suit: 0xffc21a, stripe: 0x22d3ee, skill: 0.97, line: -0.05, react: 0.27, aggression: 0.45 },
];
export const PLAYER = { code: 'YOU', name: 'You', number: '07' };

// Championship: a round on every circuit in menu order — qualifying, then the race. Points to the top
// ten as in F1, plus one for the fastest lap (if its driver finishes in the points).
export const CHAMPIONSHIP = {
  points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  fastestLap: 1,
  key: NOVA ? 'tbc-nova.season' : 'tbc-kart.season',
};
// Qualifying: a session of about `laps` laps at `pace` m/s, within min–max s; the karts start spread round
// the lap from `lead` m past the line; after the flag each finishes the lap it is on (you get up to
// `overrun` s to take the flag before the session closes on you).
export const QUALI = { laps: 3.4, pace: 11.5, min: 90, max: 180, lead: 12, overrun: 60 };

// Rival AI: racing-line shape, traffic awareness, recovery and a gentle pack-keeping pull.
export const AI = {
  lineEdge: 1.1, // the racing line (least curvature, race/racingLine.js) keeps this far in from the edge…
  lineMax: 2.4, // …and never strays further than this from the centre (m)
  lineTaper: 25, // a driver's own line offset fades out in corners: gone at radius ≤ this many metres
  sightAhead: 9, // metres ahead a slower kart is picked as a pass target…
  sightLateral: 1.6, // …within this many metres sideways of me
  sightKeep: 11, // a target stays one until it is this far ahead…
  passClear: 1.5, // …or this far behind (pass done), or passOffset + lineMax sideways
  passOffset: 1.7, // metres sideways to pull out when passing (side latched per pass)…
  pullOutAhead: 7, // …once the target is this close (m); further back, tuck in for its slipstream
  passLook: 30, // m ahead scanned for the next corner: its inside is the side to pass on…
  passTurn: 0.35, // …if it turns at least this much (rad); else the side with more room
  passGiveUp: 8, // s pulled out without drawing alongside (within passAlongside m) before giving up…
  passAlongside: 1.5,
  passRetry: 1, // …and s back on the racing line before trying again
  attack: 0.03, // extra skill while pulled out alongside a kart (braking later to make the move stick),
  //                × (0.5 + the driver's aggression)
  blockAhead: 2.6, // a kart this close ahead…
  blockLateral: 1.3, // …and this close sideways blocks my lane: hold its speed
  offsetRate: 2.2, // how fast the target line moves sideways (1/s)
  stuckTime: 1.6, // seconds nearly stationary before an AI kart is reset
  catchUp: 0.025, // skill added to a rival catchUpGap behind the player (race/pack.js); ones ahead
  catchUpGap: 60, // m    race their own race (they never wait for you)
  formSpread: 0.03, // random ± share of skill each race (with the shuffled grid, so the order changes)
  // Corners (race/driverCraft.js): each slow point of the speed plan under cornerBelow × the top speed,
  // the slowest within ± cornerWindow m, is a corner, re-rolled (scatter, mistakes) on the way in.
  cornerBelow: 0.9,
  cornerWindow: 12, // m
  mistakeMin: 0.05, // a mistake changes the corner's planned speed by this share…
  mistakeMax: 0.11, // …up to this
  mistakeHot: 0.6, // share of mistakes that are in too hot (the rest brake too early)
  pressureMistakes: 2, // mistakes are this much likelier with a kart close behind
  // Defending: a kart within defendBehind m behind, within defendLateral m sideways and not dropping
  // back makes me cover the inside of the next corner (odds: defendOdds × my aggression, once per
  // corner): aim
  // defendInside m inside the centre for defendHold s, at defendPace of my corner speed (the tighter
  // line), then defendCool s before another move.
  defendOdds: 0.5,
  defendBehind: 5,
  defendLateral: 3,
  defendInside: 0.9,
  defendHold: 2.2,
  defendCool: 2.5,
  defendPace: 0.96,
  paceMargin: 0.075, // a skill-1 driver's lap is this share slower than the circuit's reference lap
};

// Per-circuit multiplier on the computer drivers' corner and braking pace (race/pack.js trackPace), so
// a skill-1 driver laps AI.paceMargin off the circuit's reference lap (the computer driver's best at
// any skill) everywhere: difficulty does not depend on the circuit. Regenerate with
// node tools/ai-pace.mjs after changing a layout, the physics or the driver.
export const TRACK_PACE = {
  tbc: 1.014,
  monaco: 0.996,
  monza: 1.032,
  silverstone: 1.013,
  spa: 1.022,
  interlagos: 0.998,
  montreal: 0.984,
  austin: 1.017,
  spielberg: 1.067,
  singapore: 0.992,
};

// Rival level, picked on the title card. pace scales every rival's corner and braking speeds (their
// straights are flat out whatever the level); sigma = the scatter from one corner to the next (sd of
// its planned speed); mistakes = the chance per corner of a real error (race/driverCraft.js). Set by
// lap time against the circuit's reference lap (the computer driver's best, tools/ai-pace.mjs): the
// fastest rival is ~14 / 9 / 4 / 1.5 % off it on average over the ten circuits (the field spans ~3 %
// more). Before the racecraft update the levels were 41 / 27 / 21 % off — a crawl through every
// corner. Re-derive after changing the physics, TRACK_PACE or the drivers.
export const DIFFICULTY = {
  amateur: { label: 'AMATEUR', pace: 0.88, sigma: 0.03, mistakes: 0.08 },
  club: { label: 'CLUB', pace: 0.97, sigma: 0.02, mistakes: 0.05 },
  pro: { label: 'PRO', pace: 1.05, sigma: 0.012, mistakes: 0.03 },
  elite: { label: 'ELITE', pace: 1.12, sigma: 0.006, mistakes: 0.015 },
};
export const DEFAULT_DIFFICULTY = 'club';

// Slipstream: following within `range` metres, closely in line (see DRAFT_DRAG_CUT in physics).
export const DRAFT = { range: 9, lateral: 1.3 };
// Kart-to-kart contact (circles of this radius) and how bouncy it is.
export const CONTACT = { radius: 0.78, restitution: 0.35 };
// Best-lap ghost (time attack): seconds between recorded samples.
export const GHOST_STEP = 1 / 20;

// Driver aids for your kart, picked on the title card (the rivals drive the same physics with full aids).
// steer: countersteer assist strength (physics/controls.js assisted); throttle: shape a key's on/off
// throttle (physics/throttle.js); brake: hold the rear at the edge of locking (physics/rearAxle.js).
export const AIDS = {
  full: { label: 'FULL', steer: 1, throttle: true, brake: true },
  reduced: { label: 'REDUCED', steer: 0.5, throttle: true, brake: true },
  off: { label: 'OFF', steer: 0, throttle: false, brake: false },
};
export const DEFAULT_AIDS = 'full';

// Replays (race/replay.js, app/replay.js): sample rate (Hz), longest recording (s), playback speeds, seek step
// (s); the director cuts to the closest fight within `battle` m, holding each shot directorHold s.
export const REPLAY = { rate: 30, maxSeconds: 900, speeds: [0.25, 0.5, 1, 2, 4], seek: 5, battle: 12, directorHold: [5, 9] };
