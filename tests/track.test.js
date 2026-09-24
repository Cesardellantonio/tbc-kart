// Track geometry and barriers: centreline sampling, nearest-point queries, clean barrier lines,
// and a kart that cannot drive through them.

import { describe, it, expect } from 'vitest';
import { offsetChain } from '../src/track/offsetChain.js';
import { BarrierCollider } from '../src/physics/BarrierCollider.js';
import { stepKart } from '../src/physics/kartPhysics.js';
import tbc from '../src/tracks/tbc.js';
import { pathOf } from '../src/track/validate.js';
import { BARRIER_GAP } from '../src/config/track.js';
import { KART_RADIUS, WALL_RESTITUTION, WALL_SCRAPE } from '../src/config/physics.js';

const path = pathOf(tbc);
const hw = path.halfWidth;

describe('TrackPath', () => {
  it('is a ~250 m closed loop sampled every ~0.25 m', () => {
    expect(path.length).toBeGreaterThan(230);
    expect(path.length).toBeLessThan(270);
    expect(path.spacing).toBeLessThan(0.3);
  });

  it('finds the sample a point sits on, globally and with a local hint', () => {
    for (const i of [0, 123, 480, 777, 999]) {
      const p = path.offset(i, 1.5);
      expect(path.nearest(p.x, p.z)).toBe(i);
      expect(path.nearest(p.x, p.z, path.wrap(i + 20))).toBe(i);
      expect(path.lateral(p.x, p.z, i)).toBeCloseTo(1.5, 3);
    }
  });

  it('never folds the asphalt: every corner radius exceeds the half width', () => {
    const tightest = Math.min(...Array.from(path.curvature, (k) => 1 / Math.max(Math.abs(k), 1e-9)));
    expect(tightest).toBeGreaterThan(hw);
  });
});

describe('barriers', () => {
  const clearance = hw + 0.35;
  const faces = [-1, 1].flatMap((side) => offsetChain(path, side * (hw + BARRIER_GAP), clearance));

  it('stay clear of the driving surface everywhere', () => {
    for (const run of faces) for (const p of run) expect(path.within(p.x, p.z, clearance)).toBe(false);
  });

  it('stop a kart driven straight at them at full speed', () => {
    const collider = new BarrierCollider(faces, 4);
    const i = 250;
    const yaw = path.heading(i) + Math.PI / 2; // aim 90° off the track direction
    let s = { x: path.x[i], z: path.z[i], yaw, vx: 0, vz: 0, steer: 0 };
    for (let k = 0; k < 600; k++) {
      s = stepKart(s, { throttle: 1, brake: 0, steer: 0, handbrake: false }, 1 / 120);
      collider.resolve(s, KART_RADIUS, WALL_RESTITUTION, WALL_SCRAPE);
    }
    const lateral = Math.abs(path.lateral(s.x, s.z, path.nearest(s.x, s.z, i)));
    expect(lateral).toBeLessThan(hw + BARRIER_GAP);
  });
});
