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
