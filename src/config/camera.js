// Camera rig: view modes, speed-driven FOV, damping and impact shake.

export const NEAR = 0.2;
export const FAR = 420;
export const FOV_BASE = 60;
export const FOV_SPEED_BOOST = 16; // extra degrees at top speed
export const FOV_DAMP = 3;

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
  kerb: 0.028, // m at full kerb contact (chase / far)
  kerbCockpit: 0.014,
  aim: -2.5, // share of the offset applied to the aim point in reverse → a little angular judder
};
