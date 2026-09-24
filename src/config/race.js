// Race flow: start-light timing, messages and persistence.

export const LIGHT_INTERVAL = 0.85; // seconds between each red light
export const LIGHTS_HOLD = [0.5, 1.3]; // random hold after all five are lit
export const GO_SHOW = 1.4; // seconds the gantry shows green
export const LIGHT_COUNT = 5;

export const TOAST_TIME = 2.4;
export const STORAGE_KEY = 'tbc-kart.v1';

// Attract mode on the title screen: pure-pursuit lookahead (m), speed limits (m/s),
// and the lateral acceleration it allows itself in corners (m/s²).
export const AUTOPILOT = { lookAhead: 7, minSpeed: 6, maxSpeed: 15.5, latAccel: 13 };

// Grand Prix: laps, grid layout and the rival field.
export const RACE_LAPS = 5;
export const GRID = { rowGap: 3.4, lateral: 1.45, playerSlot: 4 }; // slot 0 = pole; player starts 5th
export const FINISH_COOLDOWN = { maxSpeed: 9 }; // m/s the autopilot drives your kart after the flag

// Rival drivers. skill scales corner speed and top speed (1 = autopilot pace);
// line = preferred offset from the racing line (m, + = right); react = start reaction (s).
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
  sightAhead: 9, // metres ahead that traffic is considered
  passOffset: 1.7, // metres sideways to pull out when passing
  offsetRate: 2.2, // how fast the target line moves sideways (1/s)
  stuckTime: 1.6, // seconds nearly stationary before an AI kart is reset
  catchUp: 0.035, // skill added/removed at a 60 m gap to the player
  formSpread: 0.03, // random ± share of skill each race, so the order changes
};

// Slipstream: following within `range` metres, closely in line (see DRAFT_DRAG_CUT in physics).
export const DRAFT = { range: 9, lateral: 1.3 };
// Kart-to-kart contact (circles of this radius) and how bouncy it is.
export const CONTACT = { radius: 0.78, restitution: 0.35 };
// Best-lap ghost (time attack): seconds between recorded samples.
export const GHOST_STEP = 1 / 20;
