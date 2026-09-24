// Game feel (pure parts): kerb contact table, engine rpm / centrifugal clutch, braking zones for the
// tyre marks, and the cockpit head spring staying small and settling.

import { describe, it, expect } from 'vitest';
import tbc from '../src/tracks/tbc.js';
import { pathOf } from '../src/track/validate.js';
import { cornerRuns } from '../src/track/curbRuns.js';
import { curbTable, wheelsOnCurb, wheelLayout } from '../src/track/curbTable.js';
import { brakingZones, spanIndices } from '../src/track/brakingZones.js';
import { EngineRpm } from '../src/audio/engineRpm.js';
import { HeadMotion } from '../src/core/HeadMotion.js';
import { ENGINE } from '../src/config/audio.js';
import { BRAKE_MARKS, CURB_OVERLAP } from '../src/config/track.js';
import { HEAD } from '../src/config/camera.js';

const path = pathOf(tbc);
const table = curbTable(path);
const wheels = wheelLayout(1.05, 1.0, 1.12);

// A kart sitting at sample i, `lateral` m right of the centreline, pointing along the track.
function kartAt(i, lateral) {
  const p = path.offset(i, lateral);
  return { x: p.x, z: p.z, yaw: path.heading(i) };
}

describe('kerb contact', () => {
  const run = cornerRuns(path)[0];
  const mid = run.indices[Math.floor(run.indices.length / 2)];

  it('marks every curb sample with its side and extent', () => {
    const marked = table.side.reduce((n, s) => n + (s !== 0), 0);
    const inRuns = cornerRuns(path).reduce((n, r) => n + r.indices.length, 0);
    expect(marked).toBe(inRuns);
    expect(table.side[mid]).toBe(run.side);
    expect(table.inner[mid]).toBeCloseTo(path.halfWidth - CURB_OVERLAP, 5);
    expect(table.outer[mid]).toBeGreaterThan(table.inner[mid]);
  });

  it('puts one side of the kart on the kerb when it runs wide onto it, none in the middle', () => {
    const out = {};
    wheelsOnCurb(table, path, kartAt(mid, 0), mid, wheels, 0.09, out);
    expect(out.count).toBe(0);
    const onKerb = run.side * (path.halfWidth - 0.4); // right-hand kerb → kart shifted right
    wheelsOnCurb(table, path, kartAt(mid, onKerb), mid, wheels, 0.09, out);
    expect(out.count).toBe(2);
    expect(run.side > 0 ? out.right : out.left).toBe(2);
  });
});

describe('engine rpm (centrifugal clutch)', () => {
  const tel = (speed, slip = 0, sliding = false) => ({ speed, forwardSpeed: speed, slip, sliding });
  const settle = (e, t, throttle, s = 3) => {
    for (let k = 0; k < s * 60; k++) e.step(t, throttle, 1 / 60);
    return e.rpm;
  };

  it('idles when stopped and hangs near the bite point when launching', () => {
    const e = new EngineRpm();
    expect(settle(e, tel(0), 0)).toBeCloseTo(ENGINE.idleRpm, -1);
    const launch = settle(e, tel(1), 1);
    expect(launch).toBeGreaterThan(ENGINE.biteRpm);
    expect(launch).toBeLessThanOrEqual(ENGINE.lockRpm + 1);
  });

  it('follows road speed once the clutch locks, and flares when the rear slides', () => {
    const e = new EngineRpm();
    const fast = settle(e, tel(14), 1);
    expect(fast).toBeCloseTo((14 / ENGINE.topSpeed) * ENGINE.maxRpm, -1);
    expect(settle(e, tel(14, 4, true), 1)).toBeGreaterThan(fast + 200);
  });

  it('reports a lift-off at high revs once, not at idle', () => {
    const e = new EngineRpm();
    settle(e, tel(15), 1, 2);
    e.step(tel(15), 0, 1 / 60);
    expect(e.liftOff).toBeGreaterThan(0);
    e.step(tel(15), 0, 1 / 60);
    expect(e.liftOff).toBe(0);
    const idle = new EngineRpm();
    idle.step(tel(0), 1, 1 / 60);
    idle.step(tel(0), 0, 1 / 60);
    expect(idle.liftOff).toBe(0);
  });
});

describe('braking zones', () => {
  it('finds a few real braking zones on the home track, each ending in a corner', () => {
    const zones = brakingZones(path, BRAKE_MARKS);
    expect(zones.length).toBeGreaterThanOrEqual(2);
    for (const z of zones) {
      expect(z.drop).toBeGreaterThanOrEqual(BRAKE_MARKS.minDrop);
      const span = spanIndices(path, z.start, z.end);
      expect(span.length * path.spacing).toBeLessThan(60);
      expect(Math.abs(path.curvature[z.end])).toBeGreaterThan(Math.abs(path.curvature[z.start]));
    }
  });
});

describe('cockpit head motion', () => {
  it('stays within its limits under huge g and settles back when the load goes', () => {
    const head = new HeadMotion();
    const target = () => ({ pos: { x: 0, y: 0.9, z: 0 }, look: { set() {} }, roll: 0 });
    const state = { yaw: 0 };
    let t;
    for (let k = 0; k < 120; k++) t = head.apply(state, { latAccel: 60, longAccel: -60, steer: 1, speed: 15 }, 1 / 60, 12, 0.5, target());
    expect(Math.abs(t.pos.x)).toBeLessThan(HEAD.swayMax * 1.3);
    expect(Math.abs(t.roll)).toBeLessThan(HEAD.rollMax * 1.3);
    for (let k = 0; k < 240; k++) t = head.apply(state, { latAccel: 0, longAccel: 0, steer: 0, speed: 15 }, 1 / 60, 12, 0.5, target());
    expect(Math.abs(t.pos.x)).toBeLessThan(1e-3);
    expect(Math.abs(t.roll)).toBeLessThan(1e-3);
  });
});
