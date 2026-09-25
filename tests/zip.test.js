// Zip: how eagerly the kart answers a keyboard driver — launch and exit drive, a quick shove at speed,
// crisp turn-in, quick direction changes — without giving up its stability (keyboard taps in slow
// corners, slaloms, a key pressed at the limit), plus the camera's sense of speed. Since the v5 physics
// (engine torque curve + centrifugal clutch + spinning rear axle) the targets are what a ~20 hp
// performance rental kart can really do: the old arcade launch (1 g) and instant shove are gone. Driven like
// the game: 60 fps frames, the player's throttle shaping, fixed physics substeps.

import { describe, it, expect } from 'vitest';
import { advanceKart } from '../src/physics/advanceKart.js';
import { rampThrottle } from '../src/physics/controls.js';
import { followFov } from '../src/core/cameraModes.js';
import { FollowCam } from '../src/core/FollowCam.js';
import { FOV_BASE, FOV_ACCEL_MAX, FOV_BRAKE_MAX, FOV_SURGE_DEAD, SPEED_FULL } from '../src/config/camera.js';

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
  it('launches like a strong rental kart: 0–30 km/h in ~1.5 s, 0–50 in ~2.7 s (the clutch slips at ~3000 rpm)', () => {
    expect(timeTo(moving(0), kmh(30), () => ({ throttle: 1 }))).toBeLessThan(1.6);
    const fifty = timeTo(moving(0), kmh(50), () => ({ throttle: 1 }));
    expect(fifty).toBeGreaterThan(2.4);
    expect(fifty).toBeLessThan(2.9);
  });

  // At 20 km/h the engine turns below the clutch's bite point: it must rev up before it drives (real).
  it('lifts and goes at walking pace on a straight: +8 km/h from 20 km/h in under 0.6 s', () => {
    expect(timeTo(moving(kmh(20)), kmh(28), () => ({ throttle: 1 }))).toBeLessThan(0.6);
    expect(timeTo(moving(kmh(20)), kmh(40), () => ({ throttle: 1 }))).toBeLessThan(1.25);
  });

  it('drives out of a corner on a key press: 30 → 50 km/h in under 1.55 s, 40 → 55 in under 1.75', () => {
    expect(timeTo(moving(kmh(30)), kmh(50), () => ({ throttle: 1 }))).toBeLessThan(1.55);
    expect(timeTo(moving(kmh(40)), kmh(55), () => ({ throttle: 1 }))).toBeLessThan(1.75);
  });

  // Net acceleration (m/s², drag and rolling resistance included) over the frame after a key press.
  const pull = (v, frames = 1) => (speedOf(drive(moving(v), () => ({ throttle: 1 }), frames * FRAME)) - v) / (frames * FRAME);

  // The rear axle (and the engine behind the locked clutch) must spin up before the tyres push: ~50 ms.
  it('shoves quickly at speed: net pull within 0.1 s at 50 km/h, still pulling at 55', () => {
    expect(pull(kmh(50), 6)).toBeGreaterThan(1.4); // coasting: ≈ −0.9
    expect(pull(kmh(55), 6)).toBeGreaterThan(0.5); // near the top of the rev range: little left
  });

  it('builds over ~0.2 s from 25 to 40 km/h, where keyboard taps must average into a feathered throttle', () => {
    for (const v of [kmh(27), kmh(33)]) {
      expect(pull(v), `${(v * 3.6).toFixed(0)} km/h`).toBeLessThan(0.5);
      const s = drive(moving(v), () => ({ throttle: 1 }), 0.2);
      expect(s.longAccel, `${(v * 3.6).toFixed(0)} km/h`).toBeGreaterThan(3.5);
    }
  });
});

describe('zip — steering', () => {
  // Time from the steer key going down until the yaw rate reaches 90 % of where it settles.
  function turnIn(v, share) {
    const s0 = drive(moving(v), holding(v, 0), 1);
    const log = [];
    drive(s0, holding(v, 1), 3, (s, t) => void log.push([t, s.yawRate]));
    const settled = log.slice(-30).reduce((a, [, r]) => a + r, 0) / 30;
    return log.find(([, r]) => r >= share * settled)[0];
  }

  // At 30 km/h full lock saturates the front; the last of the yaw then creeps in with the throttle that
  // holds the speed (a little power rotation), so the crispness there is its 63 % time.
  it('turns in crisply: 90 % of the yaw rate within 0.22 s at 50 km/h, 63 % within 0.25 s at 30', () => {
    expect(turnIn(kmh(50), 0.9)).toBeLessThan(0.22);
    expect(turnIn(kmh(30), 0.63)).toBeLessThan(0.25);
  });

  it('flicks from full left to full right lock in under 0.3 s at 45 km/h, without a slide', () => {
    const v = kmh(45);
    const s0 = drive(moving(v), holding(v, 1), 2);
    let [t90, slip] = [Infinity, 0];
    drive(s0, holding(v, -1), 1.5, (s, t) => {
      slip = Math.max(slip, Math.abs(s.slipAngle));
      if (t90 === Infinity && s.yawRate <= -0.9 * s0.yawRate) t90 = t;
    });
    expect(t90).toBeLessThan(0.3);
    expect(slip).toBeLessThan(0.1);
  });

  // Quicker hands (STEER_IN) let the slip build cycle by cycle here: 10 1/s reached 16–22°.
  it('stays planted through a sustained flat-out keyboard slalom at any rhythm (0.4–0.7 s a side)', () => {
    for (const half of [0.4, 0.5, 0.6, 0.7]) {
      let worst = 0;
      const s = drive(moving(16), (_, t) => ({ throttle: 1, steer: Math.floor(t / half) % 2 ? -1 : 1 }), 8, (st, t) => {
        if (t > 5) worst = Math.max(worst, Math.abs(st.slipAngle)); // settled: 3 s after the build-up
      });
      expect(worst, `${half} s a side`).toBeLessThan(0.215); // ~12°
      expect(s.forwardSpeed).toBeGreaterThan(kmh(35));
    }
  });
});

describe('zip — throttle at the limit', () => {
  // Coast a full-lock corner for 1 s, then press the key.
  const coasted = (v) => drive(moving(v), () => ({ steer: 1 }), 1);

  // The inside rear lifts, the outside one spins up (~40 % slip) and the tail comes round into a power
  // slide of ~20–25° that the countersteer assist holds — real, but with time to react first.
  it('leaves time to catch the rear when the key goes down with the lock held (it still steps out)', () => {
    for (const v of [8, 9]) {
      let t17 = Infinity;
      drive(coasted(v), () => ({ steer: 1, throttle: 1 }), 1.5, (s, t) => Math.abs(s.slipAngle) > 0.3 && ((t17 = t), true));
      expect(t17, `${v} m/s`).toBeGreaterThan(0.3);
      expect(t17, `${v} m/s`).toBeLessThan(1.5); // power oversteer is real
    }
  });

  // The pre-zip kart peaked at 0.50 / 0.26 rad here: the quicker walking-pace throttle and pull wait
  // for the kart to point straight, so a floored hairpin exit is no wilder than it was.
  it('keeps a typical keyboard corner exit tidy: key down, lock off 0.1 s later', () => {
    for (const [v, max] of [[8, 0.52], [10, 0.26]]) {
      let peak = 0;
      drive(coasted(v), (_, t) => ({ steer: t <= 0.1 ? 1 : 0, throttle: 1 }), 2, (s) => void (peak = Math.max(peak, Math.abs(s.slipAngle))));
      expect(peak, `${v} m/s`).toBeLessThan(max); // ~30° / 15°, caught without a spin
    }
  });
});

describe('zip — sense of speed (camera)', () => {
  it('widens the view with speed and kicks it wider on a surge, a touch narrower under braking', () => {
    expect(followFov(0, 0)).toBe(FOV_BASE);
    expect(followFov(SPEED_FULL, 0)).toBeGreaterThan(FOV_BASE + 10);
    expect(followFov(3, FOV_SURGE_DEAD)).toBe(followFov(3, 0)); // small surges are ignored
    expect(followFov(3, 6)).toBeGreaterThan(followFov(3, 0) + 2); // launch surge
    expect(followFov(3, 50)).toBeCloseTo(followFov(3, 0) + FOV_ACCEL_MAX, 6); // capped (a shunt is no surge)
    expect(followFov(12, -7)).toBeLessThan(followFov(12, 0));
    expect(followFov(12, -50)).toBeCloseTo(followFov(12, 0) - FOV_BRAKE_MAX, 6);
  });

  // The chase camera's FOV over `seconds` at a steady 10 m/s with longAccel(t) (m/s²).
  function fovTrace(longAccel, seconds) {
    const cam = new FollowCam();
    const out = { pos: { copy() {} }, look: { copy() {} }, roll: 0 };
    const state = { x: 0, z: 0, yaw: 0, vx: 0, vz: -10, steer: 0, yawRate: 0 };
    const fov = [];
    for (let f = 1; f <= Math.round(seconds / FRAME); f++) {
      fov.push(cam.update({ state, telemetry: { speed: 10, longAccel: longAccel(f * FRAME), latAccel: 0 } }, FRAME, out));
    }
    return fov;
  }

  it('shows a real surge but does not breathe with keyboard throttle taps', () => {
    const base = fovTrace(() => 0, 3).at(-1);
    const surge = fovTrace(() => 7, 2).at(-1); // a launch-like pull (a real launch peaks near +2.3° at ~1.8 s)
    expect(surge - base).toBeGreaterThan(1.5);
    const taps = fovTrace((t) => (Math.floor(t / 0.2) % 2 ? -1 : 6), 6).slice(-120); // on/off at 2.5 Hz
    expect(Math.max(...taps) - Math.min(...taps)).toBeLessThan(0.3);
  });
});
