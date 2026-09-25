// Kart dynamics v5: engine + centrifugal clutch, rear-only brakes, per-wheel load transfer and caster
// jacking, tyres with load sensitivity / combined slip / relaxation length, tyre temperature, the track
// surface — and the basics that must never break (standstill, zero step, no NaN).

import { describe, it, expect } from 'vitest';
import { stepKart } from '../src/physics/kartPhysics.js';
import { wheelLoads } from '../src/physics/wheelLoads.js';
import { frictionAt, tyreForce } from '../src/physics/tyreForce.js';
import { fullTorque, clutchCapacity, driveline } from '../src/physics/engine.js';
import { thermalGrip } from '../src/physics/thermal.js';
import { rampThrottle } from '../src/physics/controls.js';
import { SurfaceGrip } from '../src/track/surfaceGrip.js';
import { curbTable } from '../src/track/curbTable.js';
import { racingLine } from '../src/race/racingLine.js';
import { pathOf } from '../src/track/validate.js';
import tbc from '../src/tracks/tbc.js';
import { AI } from '../src/config/race.js';
import {
  MASS, GRAVITY, TYRE_OPTIMUM, AMBIENT_TEMP, BRAKE_ASSIST_SLIP, CLUTCH_TORQUE, TORQUE_CURVE,
} from '../src/config/physics.js';
import { seededRandom, wrapAngle } from '../src/core/math.js';

const DT = 1 / 240;
const rest = () => ({ x: 0, z: 0, yaw: 0, vx: 0, vz: 0, steer: 0, yawRate: 0 });
const rolling = (v) => ({ ...rest(), vz: -v });
const input = (o = {}) => ({ throttle: 0, brake: 0, steer: 0, handbrake: false, ...o });
const speed = (s) => Math.hypot(s.vx, s.vz);
function run(state, controls, seconds, each) {
  let s = state;
  for (let t = 0; t < seconds; t += DT) {
    s = stepKart(s, typeof controls === 'function' ? controls(s, t) : controls, DT);
    each?.(s, t);
  }
  return s;
}

describe('engine, clutch and driveline', () => {
  it('has a real torque curve: a plateau near 3000–3800 rpm, nothing past the limiter', () => {
    const peak = Math.max(...TORQUE_CURVE.map(([, t]) => t));
    expect(fullTorque(3400)).toBeCloseTo(peak, 5);
    expect(fullTorque(1500)).toBeLessThan(peak * 0.7);
    expect(fullTorque(6300)).toBe(0);
  });

  it('launches on a slipping centrifugal clutch near peak torque, then locks it up', () => {
    const early = run(rest(), input({ throttle: 1 }), 0.5);
    expect(early.rpm).toBeGreaterThan(2800);
    expect(early.rpm).toBeLessThan(3300);
    expect(early.clutch).toBeGreaterThan(0.5); // still slipping: engine faster than the road
    const later = run(early, input({ throttle: 1 }), 2);
    expect(later.clutch).toBe(0); // locked: revs tied to the rear axle
    expect(later.forwardSpeed * 3.6).toBeGreaterThan(40);
  });

  it('opens the clutch at walking pace and idles at a standstill', () => {
    expect(clutchCapacity(1700)).toBe(0);
    expect(clutchCapacity(3400)).toBeCloseTo(CLUTCH_TORQUE, 5);
    const idle = run(rest(), input(), 2);
    expect(idle.rpm).toBeGreaterThan(1500);
    expect(idle.rpm).toBeLessThan(1900);
    expect(speed(idle)).toBe(0);
  });

  it('gives engine braking on a closed throttle while the clutch is locked', () => {
    const d = driveline(4500, ((4500 / 60) * 2 * Math.PI) / 4.7, 0, DT);
    expect(d.coupled).toBe(true);
    expect(d.torque).toBeLessThan(0);
  });

  it('tops out around 60 km/h against the rev range and the air, faster in a slipstream', () => {
    const top = run(rest(), input({ throttle: 1 }), 20);
    expect(top.forwardSpeed * 3.6).toBeGreaterThan(58);
    expect(top.forwardSpeed * 3.6).toBeLessThan(65);
    const tow = run(rest(), input({ throttle: 1, draft: 1 }), 20);
    expect(tow.forwardSpeed - top.forwardSpeed).toBeGreaterThan(0.5);
  });
});

describe('rear-only brakes', () => {
  it('stops from 50 km/h in ~2.2–2.9 s: rear brakes at the limit, with the load thrown forward', () => {
    let t = null;
    run(rolling(50 / 3.6), input({ brake: 1 }), 5, (s, at) => void (t ??= speed(s) < 0.1 ? at : null)); // then it rolls back
    expect(t).toBeGreaterThan(2.1);
    expect(t).toBeLessThan(2.9);
  });

  it('holds the rear just short of a lock with the brake assist (threshold braking)', () => {
    const s = run(rolling(12), input({ brake: 1 }), 0.4);
    expect(s.wheelSpin).toBeLessThan(0);
    expect(s.wheelSpin).toBeGreaterThan(-BRAKE_ASSIST_SLIP - 0.03);
  });

  it('locks the rear axle on a drift-button stab, and it rolls again after', () => {
    let locked = false; // axle (nearly) stopped while the kart still moves: the rear tyres slide
    const s = run(rolling(12), input({ handbrake: true }), 0.25, (st) => void (locked ||= st.omega < 0.1 * (st.forwardSpeed / 0.14)));
    expect(locked).toBe(true);
    const free = run(s, input(), 0.5);
    expect(free.omega).toBeGreaterThan(0.9 * (free.forwardSpeed / 0.14));
  });

  it('pushes back slowly when stopped with the brake held (no reverse gear: the helper)', () => {
    const s = run(rest(), input({ brake: 1 }), 3);
    expect(s.forwardSpeed).toBeLessThan(-3);
    expect(s.forwardSpeed).toBeGreaterThanOrEqual(-4.0001);
  });
});

describe('load transfer and jacking', () => {
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const W = MASS * GRAVITY;

  it('keeps the weight, moves it forward under braking and outward in a corner', () => {
    const still = wheelLoads(0, 0, 0, [0, 0, 0, 0]);
    expect(sum(still)).toBeCloseTo(W, 6);
    const braking = wheelLoads(-6, 0, 0, [0, 0, 0, 0]);
    expect(braking[0] + braking[1]).toBeGreaterThan(still[0] + still[1] + 100);
    const leftTurn = wheelLoads(0, 9, 0, [0, 0, 0, 0]); // accelerating toward the left
    expect(leftTurn[1] + leftTurn[3]).toBeGreaterThan(leftTurn[0] + leftTurn[2]);
    expect(sum(leftTurn)).toBeCloseTo(W, 6);
  });

  it('unloads the inside rear with steering alone (caster jacking), and lifts it at the limit', () => {
    const straight = wheelLoads(0, 0, 0, [0, 0, 0, 0]);
    const lock = wheelLoads(0, 0, 0.35, [0, 0, 0, 0]); // turning left: inside = left
    expect(lock[2]).toBeLessThan(straight[2] - 100);
    expect(lock[3]).toBeGreaterThan(straight[3] + 100);
    const limit = wheelLoads(0, 12, 0.15, [0, 0, 0, 0]);
    expect(limit[2]).toBeLessThan(0.35 * straight[2]);
  });
});

describe('tyres', () => {
  it('lose friction coefficient as the load rises (load sensitivity)', () => {
    expect(frictionAt(1.4, 300)).toBeGreaterThan(frictionAt(1.4, 400));
    expect(frictionAt(1.4, 400)).toBeGreaterThan(frictionAt(1.4, 800));
  });

  it('share one friction ellipse: driving hard costs cornering force', () => {
    const out = { fx: 0, fy: 0, s: 0 };
    const pure = tyreForce(450, Math.tan(0.08), 0, 1.4, out).fy;
    const combined = tyreForce(450, Math.tan(0.08), 0.1, 1.4, out).fy;
    expect(combined).toBeLessThan(0.8 * pure);
  });

  it('build side force over a relaxation length, not instantly', () => {
    const s0 = rolling(14);
    const one = stepKart(s0, input({ steer: 1 }), DT);
    const later = run(s0, input({ steer: 1 }), 0.15);
    expect(Math.abs(one.latAccel)).toBeLessThan(0.2 * Math.abs(later.latAccel));
  });

  it('grip best in their temperature window: cold on lap one, warmer after hard running', () => {
    expect(thermalGrip(AMBIENT_TEMP)).toBeLessThan(thermalGrip(TYRE_OPTIMUM));
    expect(thermalGrip(TYRE_OPTIMUM + 60)).toBeLessThan(thermalGrip(TYRE_OPTIMUM));
    const hot = run(rolling(11), input({ steer: 1, throttle: 0.6 }), 20);
    expect(hot.tempF).toBeGreaterThan(AMBIENT_TEMP + 10);
  });
});

describe('handling', () => {
  it('holds a grippy line through a steady corner below the limit', () => {
    const s = run(rolling(10), (st) => input({ steer: 0.5, throttle: Math.min(1, Math.max(0, 0.3 + (10 - st.forwardSpeed))) }), 3);
    expect(s.yaw).toBeGreaterThan(1);
    expect(Math.abs(s.slipAngle)).toBeLessThan(0.1);
  });

  it('scrubs speed through a corner: the solid rear axle fights the turn', () => {
    const straight = run(rolling(12), input(), 1.5);
    const corner = run(rolling(12), input({ steer: 1 }), 1.5);
    expect(speed(corner)).toBeLessThan(speed(straight) - 0.5);
  });

  it('steps the rear out with full throttle at full lock in a slow corner (power oversteer)', () => {
    const coasted = run(rolling(8), input({ steer: 1 }), 1);
    let peak = 0;
    run(coasted, input({ steer: 1, throttle: 1 }), 1.5, (s) => void (peak = Math.max(peak, Math.abs(s.slipAngle))));
    expect(peak).toBeGreaterThan(0.3);
  });

  it('breaks the rear loose on a drift-button stab, and the assist catches the slide', () => {
    let peak = 0;
    const kicked = run(rolling(14), (s, t) => input({ steer: 1, throttle: 1, handbrake: t < 0.25 }), 0.8, (s) => void (peak = Math.max(peak, Math.abs(s.slipAngle))));
    expect(peak).toBeGreaterThan(0.15);
    const caught = run(kicked, input({ throttle: 0.5 }), 2);
    expect(Math.abs(caught.slipAngle)).toBeLessThan(0.05);
    expect(Math.abs(wrapAngle(caught.yawRate))).toBeLessThan(0.3);
  });

  it('does not rotate or creep when stationary, even at full lock', () => {
    const s = run(rest(), input({ steer: 1 }), 1);
    expect(s.yaw).toBeCloseTo(0, 6);
    expect(speed(s)).toBe(0);
  });

  it('treats a zero-length step as a no-op (no NaN — it once made the kart vanish)', () => {
    const moving = run(rest(), input({ throttle: 1 }), 1);
    const same = stepKart(moving, input({ throttle: 1, steer: 1 }), 0);
    for (const k of ['x', 'z', 'yaw', 'vx', 'vz', 'longAccel', 'latAccel', 'rpm']) expect(Number.isFinite(same[k])).toBe(true);
    expect(same.x).toBe(moving.x);
  });

  it('stays finite through a long run of random keyboard input', () => {
    const rnd = seededRandom(7);
    let s = rest();
    let [thr, keys] = [0, null];
    for (let k = 0; k < 240 * 60; k++) {
      if (k % 12 === 0) keys = { t: rnd() > 0.3 ? 1 : 0, b: rnd() > 0.85 ? 1 : 0, st: Math.round(rnd() * 2 - 1), h: rnd() > 0.95 };
      thr = rampThrottle(thr, keys.t, s.slipAngle, DT, speed(s));
      s = stepKart(s, input({ throttle: thr, brake: keys.b, steer: keys.st, handbrake: keys.h }), DT);
      for (const f of ['x', 'z', 'yaw', 'vx', 'vz', 'yawRate', 'omega', 'rpm', 'tempF', 'tempR']) expect(Number.isFinite(s[f]), f).toBe(true);
    }
  });
});

describe('track surface (a real road)', () => {
  const path = pathOf(tbc);
  const line = racingLine(path, AI);
  const make = () => new SurfaceGrip(path, line, curbTable(path));

  it('grips best on the rubbered racing line, less off it, least on a painted kerb', () => {
    const g = make();
    g.addDistance(path.length * 100);
    const i = 300;
    const onLine = g.at(i, line[i]);
    const offLine = g.at(i, line[i] + 2.5 * Math.sign(-line[i] || 1));
    expect(onLine).toBeGreaterThan(1);
    expect(offLine).toBeLessThan(onLine - 0.04);
    const k = g.curbs.side.findIndex((sd) => sd !== 0);
    const side = g.curbs.side[k];
    expect(g.at(k, side * (g.curbs.inner[k] + 0.2))).toBeLessThan(0.9);
  });

  it('rubbers in as karts lap it', () => {
    const g = make();
    const before = g.at(300, line[300]);
    g.addDistance(path.length * 20);
    expect(g.at(300, line[300])).toBeGreaterThan(before);
  });
});
