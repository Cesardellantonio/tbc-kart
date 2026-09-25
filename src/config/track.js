// Track dimensions, painted markings, curbs, barriers and sampling resolution. Metres.

export const TRACK_SAMPLE_SPACING = 0.25; // metres between centreline samples
export const TRACK_SPLINE = 'centripetal';
export const TRACK_WIDTH = 6.0; // default; a track may set its own `width`

// Driving surface + paint
export const ASPHALT_TILE = 5; // metres of track per asphalt texture repeat
export const SURFACE_Y = 0.012;
export const PAINT_Y = 0.02;
export const EDGE_LINE_WIDTH = 0.16;
export const EDGE_LINE_INSET = 0.2; // from the asphalt edge

// Curbs sit on the inside of corners and fill the gap up to the barrier
export const CURB_WIDTH = 0.9;
export const CURB_OVERLAP = 0.12; // how far the curb reaches onto the asphalt
export const CURB_MIN_CURVATURE = 1 / 22; // corners tighter than a 22 m radius
export const CURB_MIN_LENGTH = 5;
export const CURB_EXTEND = 2; // metres added before/after each corner
export const CURB_STRIPE = 0.9; // metres per coloured stripe
export const CURB_RED = '#d7263d';
export const CURB_WHITE = '#f2f2f2';

// Plastic barrier blocks
export const BARRIER_GAP = 0.8; // asphalt edge → barrier face
export const BARRIER_LENGTH = 1.5;
export const BARRIER_HEIGHT = 0.75;
export const BARRIER_THICKNESS = 0.5;
export const BARRIER_COLORS = [0xd7263d, 0xf2f2f2];

// Start / finish
export const START_LINE_DEPTH = 1.2;
export const GRID_BACK = 7; // metres behind the line for the kart's grid box
export const GANTRY_HEIGHT = 4.6;

// Rubbered-in racing line: a soft dark band along the AI line (see race/racingLine.js)
export const RUBBER_LINE = {
  width: 1.9, // m across (covers both tyre tracks of a kart on the line)
  tile: 9, // metres of track per streak-texture repeat
  opacity: 0.34, // peak darkening in the middle of the band
  cornerBoost: 0.45, // extra opacity where the line is loaded hardest (corners, braking)
  color: 0x0b0b0d,
  roughness: 0.62, // rubber polishes the asphalt a little
};
// Light tyre marks laid down where the computer drivers brake hard for a corner (track/brakingZones)
export const BRAKE_MARKS = {
  minBrake: 0.2, // peak brake pedal (0..1) that counts as braking hard enough to mark the concrete
  minDrop: 1, // m/s of speed lost before a zone counts (light dabs leave lighter marks: alpha follows the pedal)
  mergeGap: 3, // m of coasting between two brake applications that still counts as one zone
  streaks: 3, // karts' worth of marks per zone (2 wheels each)
  spread: 0.28, // m lateral scatter between karts
  width: 0.16, // m per tyre mark
  opacity: 0.22,
  rearTrack: 1.12, // m between the rear tyres (≈ config/kart.js REAR_TRACK)
};

// Track surface grip (track/surfaceGrip.js), like a sim's "real road": multipliers on tyre friction.
export const SURFACE = {
  green: 0.965, // whole-track grip before any rubber is down…
  rubberStart: 0.35, // …how rubbered-in a hall is when you arrive (0..1)…
  rubberLaps: 40, // …and kart-laps of running to rubber it in completely
  lineGain: 0.04, // extra grip on the rubbered racing line (at full rubber)…
  lineWidth: 0.9, // m, …falling off this far either side of it (gaussian)
  dust: 0.05, // grip lost off-line, where dust and rubber marbles collect…
  dustFrom: 1.6, // m from the racing line where it starts…
  dustFull: 2.8, // m …and where it is fully there
  kerb: 0.86, // painted kerb: smooth paint over ribs, and the tyre bounces over them
};
