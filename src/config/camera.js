// Camera rig: view modes, speed-driven FOV, damping and impact shake.

export const NEAR = 0.2;
export const FAR = 420;
export const FOV_BASE = 60;
export const SPEED_FULL = 17; // m/s treated as "full speed" by the camera effects (the kart's top, ~61 km/h)
export const FOV_SPEED_BOOST = 17; // extra degrees at full speed (~1° per m/s, so the quicker top speed shows)
// Sense of punch: the view widens while the kart surges and narrows a touch under braking (a lunge),
// on top of the speed widening. It follows a slow average of the longitudinal acceleration, past a
// dead zone, so a keyboard's on/off throttle taps don't make the view breathe; a real surge shows.
export const FOV_SURGE_DAMP = 1; // 1/s, how fast that average follows the acceleration (~1 s lag)
export const FOV_SURGE_DEAD = 2; // m/s², average surge ignored either way (lifts, part-throttle taps)
export const FOV_ACCEL_KICK = 0.8; // degrees per m/s² beyond the dead zone… (a launch peaks near +2.3°)
export const FOV_ACCEL_MAX = 3; // …at most under throttle…
export const FOV_BRAKE_MAX = 1.5; // …and taken off at most under braking
export const FOV_DAMP = 2.5; // 1/s, how fast the FOV follows its target (never snaps; the zippier pace swings the
// speed more, and this keeps the view's breathing where it was)

// distance: metres behind the kart, height: above ground, lookAhead/lookHeight: aim point
export const VIEWS = {
  chase: { distance: 5.2, height: 2.0, lookAhead: 4.5, lookHeight: 0.75 },
  far: { distance: 8.8, height: 3.6, lookAhead: 6, lookHeight: 0.4 },
  cockpit: { distance: 0.22, height: 0.9, lookAhead: 12, lookHeight: 0.5 }, // driver's eyes
};
export const VIEW_ORDER = ['chase', 'far', 'cockpit'];

export const POSITION_DAMP = 9;
export const YAW_DAMP = 7;
export const DRIFT_SWING = 0.45; // share of the slide angle the camera swings to show
export const SPEED_PULLBACK = 0.9; // extra distance at top speed

export const SHAKE_DECAY = 2.4;
export const SHAKE_AMPLITUDE = 0.32;

// Title-screen orbit around the kart
export const ORBIT = { radius: 9.5, height: 3.4, speed: 0.16 };

// Cockpit: the driver's head moves with g-forces (inputs in m/s², springs in 1/s)
export const HEAD = {
  sway: 0.0045, // m sideways per m/s² lateral g (pushed to the outside of the corner)
  swayMax: 0.06,
  surge: 0.004, // m forward per m/s² of braking (back under throttle)
  surgeMax: 0.05,
  nod: 0.012, // m the aim point drops per m/s² of braking (rises under throttle)
  nodMax: 0.22,
  roll: 0.0022, // rad head tilt per m/s² lateral g
  rollMax: 0.035,
  lookInto: 0.13, // rad the driver looks into the corner at full steering lock
  stiffness: 70, // spring: higher = snappier head
  damping: 13, // spring damping (≈ 1.6·√stiffness → a hint of overshoot, no wobble)
  gClamp: 22, // m/s² cap on inputs so wall hits don't whip the head
};
// Continuous vibration: engine buzz in the chase views, kerb judder in every driving view
export const VIBE = {
  engine: 0.0045, // m at full revs (chase / far)
  engineCockpit: 0.0015,
  speed: 0.004, // m of extra tremble at full speed, growing with speed³ so it is only felt flat out (chase / far)…
  speedCockpit: 0.002, // …and in the cockpit
  kerb: 0.028, // m at full kerb contact (chase / far)
  kerbCockpit: 0.014,
  aim: -2.5, // share of the offset applied to the aim point in reverse → a little angular judder
  nyquist: 0.4, // default ceiling: vibration partials stay below this share of the frame rate (no slow aliasing)
  // Per-partial ceilings (share of the frame rate, core/FrameSines): distinct and ordered like the partials,
  // so summed partials never merge into one tone; not simple fractions, so none repeats every few frames.
  buzzCeil: [0.331, 0.379, 0.353], // engine buzz: 25 Hz, ×1.54 and ×1.27 partials
  kerbCeil: [0.303, 0.397, 0.303], // kerb rib, its ×2.3 overtone (≥ 0.09 × fps above the rib), ×0.5 rock
  fpsSmoothing: 0.05, // per-frame blend of the frame-rate estimate that sets that cap
};
