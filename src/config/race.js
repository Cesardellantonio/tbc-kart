// Race flow: start-light timing, messages and persistence.

export const LIGHT_INTERVAL = 0.85; // seconds between each red light
export const LIGHTS_HOLD = [0.5, 1.3]; // random hold after all five are lit
export const GO_SHOW = 1.4; // seconds the gantry shows green
export const LIGHT_COUNT = 5;

export const TOAST_TIME = 2.4;
export const STORAGE_KEY = 'tbc-kart.v1';

// Computer drivers (attract mode, your kart after the flag, and the rivals' base pace).
export const AUTOPILOT = {
  lookAhead: 5, // m, pure-pursuit aim distance at rest…
  lookSpeed: 0.25, // s, …plus this many seconds of travel
  steerGain: 2.4, // steering input per rad of heading error
  yawDamp: 0.2, // steering input per rad/s of yaw rate beyond what the aim asks for
  maxSpeed: 16.5, // m/s, target on the straights (above the kart's ~16 m/s top, so skill 1 runs flat out)
  latAccel: 10, // m/s², lateral acceleration planned for in corners at skill 1 (race/speedPlan.js)…
  planChord: 0.7, // s, …on the line's curvature measured across this much travel (pure pursuit rounds
  planChordMin: 4.5, // m    off a quick flick far more than a slow hairpin), kept within these
  planChordMax: 14, // m     bounds
  planDecel: 5.5, // m/s², braking planned into each corner (full rear brakes give ~7)
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
// slot 0 = pole; the player starts 5th, the rivals fill the rest in a new order each race
export const GRID = { rowGap: 3.4, lateral: 1.45, playerSlot: 4 };
export const FINISH_COOLDOWN = { maxSpeed: 9 }; // m/s the autopilot drives your kart after the flag

// Rival drivers. skill scales the planned corner and braking speeds (by √skill) and the top-speed
// target; line = preferred offset from the racing line on the straights (m, + = right);
// react = start reaction (s).
export const RIVALS = [
  { code: 'ROS', name: 'M. Rossi', number: '11', body: 0xe63946, suit: 0x2b2d42, stripe: 0xffffff, skill: 1.02, line: -0.3, react: 0.18 },
  { code: 'OKA', name: 'T. Okafor', number: '23', body: 0x2bd97c, suit: 0x1b4332, stripe: 0x111111, skill: 1.0, line: 0.4, react: 0.24 },
  { code: 'LIN', name: 'E. Lindqvist', number: '5', body: 0x3a86ff, suit: 0x0b2545, stripe: 0xffd60a, skill: 0.985, line: 0.1, react: 0.2 },
  { code: 'TAN', name: 'K. Tanaka', number: '88', body: 0xff7b00, suit: 0x222222, stripe: 0x3a86ff, skill: 0.97, line: -0.5, react: 0.3 },
  { code: 'MOR', name: 'L. Moreau', number: '31', body: 0xb388ff, suit: 0x3c096c, stripe: 0xffffff, skill: 0.955, line: 0.6, react: 0.34 },
];
export const PLAYER = { code: 'YOU', name: 'You', number: '07' };

// Rival AI: racing-line shape, traffic awareness, recovery and a gentle pack-keeping pull.
export const AI = {
  lineGain: 9, // metres of inside offset per 1/m of curvature
  lineMax: 1.9, // never aim closer than this to the edge (m from centre)
  lineSmooth: 6, // metres either side used to smooth the line
  lineTaper: 25, // a driver's own line offset fades out in corners: gone at radius ≤ this many metres
  sightAhead: 9, // metres ahead a slower kart is picked as a pass target…
  sightLateral: 1.6, // …within this many metres sideways of me
  sightKeep: 11, // a target stays one until it is this far ahead…
  passClear: 1.5, // …or this far behind (pass done), or passOffset + lineMax sideways
  passOffset: 1.7, // metres sideways to pull out when passing (side latched per pass)…
  pullOutAhead: 7, // …once the target is this close (m); further back, tuck in for its slipstream
  attack: 0.06, // extra skill while pulled out alongside a kart (braking later to make the move stick)
  blockAhead: 2.6, // a kart this close ahead…
  blockLateral: 1.3, // …and this close sideways blocks my lane: hold its speed
  offsetRate: 2.2, // how fast the target line moves sideways (1/s)
  stuckTime: 1.6, // seconds nearly stationary before an AI kart is reset
  catchUp: 0.035, // skill added/removed at a catchUpGap gap to the player (race/pack.js)
  catchUpGap: 60, // m
  formSpread: 0.05, // random ± share of skill each race (with the shuffled grid, so the order changes)
};

// Slipstream: following within `range` metres, closely in line (see DRAFT_DRAG_CUT in physics).
export const DRAFT = { range: 9, lateral: 1.3 };
// Kart-to-kart contact (circles of this radius) and how bouncy it is.
export const CONTACT = { radius: 0.78, restitution: 0.35 };
// Best-lap ghost (time attack): seconds between recorded samples.
export const GHOST_STEP = 1 / 20;
