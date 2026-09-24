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
