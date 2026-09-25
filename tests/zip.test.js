// Zip: how eagerly the kart answers a keyboard driver — launch and exit drive, instant throttle, crisp
// turn-in, quick direction changes — without giving up its stability, plus the camera's sense of
// speed. Driven like the game: 60 fps frames, the player's throttle shaping, fixed physics substeps.

import { describe, it, expect } from 'vitest';
import { advanceKart } from '../src/physics/advanceKart.js';
import { rampThrottle } from '../src/physics/controls.js';
import { followFov } from '../src/core/cameraModes.js';
import { FOV_BASE, FOV_ACCEL_MAX, FOV_BRAKE_MAX, SPEED_FULL } from '../src/config/camera.js';

const FRAME = 1 / 60;
const open = { resolve: () => 0, contact: null }; // no barriers
const kmh = (v) => v / 3.6;
const speedOf = (s) => Math.hypot(s.vx, s.vz);
const moving = (v) => ({ x: 0, z: 0, yaw: 0, vx: 0, vz: -v, steer: 0, yawRate: 0 });

// keys(state, t) → { throttle (key 0/1, or analog with analog: true), brake, steer }. onFrame(state, t)
// sees every frame and may return true to stop. Returns the last state.
function drive(s, keys, seconds, onFrame) {
  let thr = 0;
  for (let f = 1; f <= Math.round(seconds / FRAME); f++) {
    const k = keys(s, f * FRAME);
    thr = k.analog ? k.throttle : rampThrottle(thr, k.throttle || 0, s.slipAngle, FRAME, speedOf(s));
    s = advanceKart(s, { brake: 0, steer: 0, handbrake: false, ...k, throttle: thr }, FRAME, open).state;
    if (onFrame?.(s, f * FRAME) === true) break;
  }
  return s;
}
const timeTo = (s0, v, keys) => {
  let t = Infinity;
  drive(s0, keys, 10, (s, at) => speedOf(s) >= v && ((t = at), true));
  return t;
};
// A steady part-throttle that holds speed v, so steering is measured on its own.
const holding = (v, steer) => (s) => ({ steer, analog: true, throttle: Math.min(1, Math.max(0, 0.2 + (v - s.forwardSpeed) * 0.8)) });

describe('zip — engine and throttle', () => {
  it('launches hard but believably for a rental kart: 0–30 km/h in ~1.2 s, 0–50 in ~2.5 s', () => {
    expect(timeTo(moving(0), kmh(30), () => ({ throttle: 1 }))).toBeLessThan(1.3);
    const fifty = timeTo(moving(0), kmh(50), () => ({ throttle: 1 }));
    expect(fifty).toBeGreaterThan(2.2);
    expect(fifty).toBeLessThan(3);
  });

  it('drives out of a corner on a key press: 30 → 50 km/h in under 1.45 s', () => {
    expect(timeTo(moving(kmh(30)), kmh(50), () => ({ throttle: 1 }))).toBeLessThan(1.45);
  });

  it('answers the throttle key in the very next frame', () => {
    for (const v of [kmh(20), kmh(30), kmh(45)]) {
      const s = drive(moving(v), () => ({ throttle: 1 }), FRAME);
      expect(s.longAccel, `${(v * 3.6).toFixed(0)} km/h`).toBeGreaterThan(2);
    }
  });
});

describe('zip — steering', () => {
  // Time from the steer key going down until the yaw rate reaches 90 % of where it settles.
  function turnIn(v) {
    const s0 = drive(moving(v), holding(v, 0), 1);
    const log = [];
    drive(s0, holding(v, 1), 3, (s, t) => void log.push([t, s.yawRate]));
    const settled = log.slice(-30).reduce((a, [, r]) => a + r, 0) / 30;
    return log.find(([, r]) => r >= 0.9 * settled)[0];
  }

  it('turns in crisply at speed: 90 % of the yaw rate within 0.14 s at 50 km/h', () => {
    expect(turnIn(kmh(50))).toBeLessThan(0.14);
    expect(turnIn(kmh(30))).toBeLessThan(0.25); // grip-limited at full lock: the front is at its peak
  });

  it('flicks from full left to full right lock in ~0.2 s at 45 km/h, without a slide', () => {
    const v = kmh(45);
    const s0 = drive(moving(v), holding(v, 1), 2);
    let [t90, slip] = [Infinity, 0];
    drive(s0, holding(v, -1), 1.5, (s, t) => {
      slip = Math.max(slip, Math.abs(s.slipAngle));
      if (t90 === Infinity && s.yawRate <= -0.9 * s0.yawRate) t90 = t;
    });
    expect(t90).toBeLessThan(0.22);
    expect(slip).toBeLessThan(0.1);
  });

  it('stays planted through a flat-out keyboard slalom (0.4 s a side) — no snap from the quicker hands', () => {
    let worst = 0;
    const s = drive(moving(kmh(45)), (_, t) => ({ throttle: 1, steer: Math.floor(t / 0.4) % 2 ? -1 : 1 }), 6, (st) => {
      worst = Math.max(worst, Math.abs(st.slipAngle));
    });
    expect(worst).toBeLessThan(0.2);
    expect(s.forwardSpeed).toBeGreaterThan(kmh(35));
  });
});

describe('zip — sense of speed (camera)', () => {
  it('widens the view with speed and kicks it wider on a launch, a touch narrower under braking', () => {
    expect(followFov(0, 0)).toBe(FOV_BASE);
    expect(followFov(SPEED_FULL, 0)).toBeGreaterThan(FOV_BASE + 10);
    expect(followFov(3, 8)).toBeGreaterThan(followFov(3, 0) + 2); // launch surge
    expect(followFov(3, 50)).toBeCloseTo(followFov(3, 0) + FOV_ACCEL_MAX, 6); // capped (a shunt is no surge)
    expect(followFov(12, -7)).toBeLessThan(followFov(12, 0));
    expect(followFov(12, -50)).toBeCloseTo(followFov(12, 0) - FOV_BRAKE_MAX, 6);
  });
});
