// Kart dynamics: acceleration, top speed, braking, reverse, cornering grip, handbrake drift.

import { describe, it, expect } from 'vitest';
import { stepKart } from '../src/physics/kartPhysics.js';

const DT = 1 / 120;
const rest = () => ({ x: 0, z: 0, yaw: 0, vx: 0, vz: 0, steer: 0 });
const input = (o = {}) => ({ throttle: 0, brake: 0, steer: 0, handbrake: false, ...o });
function run(state, controls, seconds) {
  let s = state;
  for (let t = 0; t < seconds; t += DT) s = stepKart(s, controls, DT);
  return s;
}

describe('kartPhysics', () => {
  it('pulls away briskly and moves forward (−Z at yaw 0)', () => {
    const s = run(rest(), input({ throttle: 1 }), 1);
    expect(s.forwardSpeed).toBeGreaterThan(6);
    expect(s.z).toBeLessThan(0);
    expect(Math.abs(s.x)).toBeLessThan(1e-6);
  });

  it('tops out around 55–60 km/h', () => {
    const s = run(rest(), input({ throttle: 1 }), 15);
    expect(s.forwardSpeed * 3.6).toBeGreaterThan(55);
    expect(s.forwardSpeed * 3.6).toBeLessThan(60);
  });

  it('brakes from top speed to a stop in under 1.5 s, then reverses slowly', () => {
    const top = run(rest(), input({ throttle: 1 }), 15);
    const stopped = run(top, input({ brake: 1 }), 1.5);
    expect(stopped.forwardSpeed).toBeLessThanOrEqual(0.3);
    const reversing = run(stopped, input({ brake: 1 }), 3);
    expect(reversing.forwardSpeed).toBeLessThan(-3);
    expect(reversing.forwardSpeed).toBeGreaterThanOrEqual(-4.0001);
  });

  it('does not rotate when stationary', () => {
    const s = run(rest(), input({ steer: 1 }), 1);
    expect(s.yaw).toBeCloseTo(0, 6);
  });

  it('holds a grippy line at full lock (no slide)', () => {
    const s = run({ ...rest(), vz: -12 }, input({ throttle: 1, steer: 1 }), 3);
    expect(s.yaw).toBeGreaterThan(2); // turned left a long way
    expect(s.sliding).toBe(false);
    expect(s.slip).toBeLessThan(2.5);
  });

  it('treats a zero-length step as a no-op (no NaN — it once made the kart vanish)', () => {
    const moving = run(rest(), input({ throttle: 1 }), 1);
    const same = stepKart(moving, input({ throttle: 1, steer: 1 }), 0);
    for (const k of ['x', 'z', 'yaw', 'vx', 'vz', 'longAccel', 'latAccel']) expect(Number.isFinite(same[k])).toBe(true);
    expect(same.x).toBe(moving.x);
  });

  it('handbrake + steer breaks the rear loose, and grip returns after release', () => {
    const drifting = run({ ...rest(), vz: -14 }, input({ throttle: 1, steer: 1, handbrake: true }), 0.5);
    expect(drifting.slip).toBeGreaterThan(3);
    expect(drifting.sliding).toBe(true);
    const recovered = run(drifting, input({ throttle: 1 }), 1);
    expect(recovered.slip).toBeLessThan(0.5);
  });
});
