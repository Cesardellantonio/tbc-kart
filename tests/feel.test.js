// Game feel (pure parts): kerb contact table, engine rpm / centrifugal clutch, braking zones for the
// tyre marks (checked against a real rival's laps), vibration that can't alias, and the cockpit
// head spring staying small and settling.

import { describe, it, expect } from 'vitest';
import tbc from '../src/tracks/tbc.js';
import { pathOf } from '../src/track/validate.js';
import { cornerRuns } from '../src/track/curbRuns.js';
import { curbTable, wheelsOnCurb, wheelLayout } from '../src/track/curbTable.js';
import { brakingZones, spanIndices } from '../src/track/brakingZones.js';
import { EngineRpm } from '../src/audio/engineRpm.js';
import { HeadMotion } from '../src/core/HeadMotion.js';
import { ENGINE } from '../src/config/audio.js';
import { BRAKE_MARKS, CURB_OVERLAP, BARRIER_THICKNESS } from '../src/config/track.js';
import { HEAD, VIBE } from '../src/config/camera.js';
import { KERB_RIDE } from '../src/config/kart.js';
import { FrameSines } from '../src/core/FrameSines.js';
import { trackById } from '../src/tracks/index.js';
import { barrierFaces } from '../src/track/barrierLines.js';
import { boundsOf, wallLoop } from '../src/track/bounds.js';
import { BarrierCollider } from '../src/physics/BarrierCollider.js';
import { advanceKart } from '../src/physics/advanceKart.js';
import { AiDriver } from '../src/race/AiDriver.js';
import { racingLine } from '../src/race/racingLine.js';
import { gridSpot } from '../src/race/grid.js';
import { AI } from '../src/config/race.js';
import { COLLISION_CELL } from '../src/config/physics.js';
import { VENUE_MARGIN } from '../src/config/venue.js';

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
  it('finds a few real braking zones on the home track, each leading into a corner', () => {
    const zones = brakingZones(path, BRAKE_MARKS);
    expect(zones.length).toBeGreaterThanOrEqual(2);
    for (const z of zones) {
      expect(z.drop).toBeGreaterThanOrEqual(BRAKE_MARKS.minDrop);
      const span = spanIndices(path, z.start, z.end);
      expect(span.length * path.spacing).toBeLessThan(60);
      let ahead = 0; // the drivers brake for the tightest bend in the next ~30 m
      for (let d = 0; d < 30 / path.spacing; d++) ahead = Math.max(ahead, Math.abs(path.curvature[path.wrap(z.start + d)]));
      expect(ahead).toBeGreaterThan(2 * Math.abs(path.curvature[z.start]));
    }
  });

  // A real computer driver (AiDriver + full physics + barriers, alone on track) lapping: nearly all
  // the track it brakes on, and nearly all the speed it sheds, should be under the marks.
  it.each(['tbc', 'monza'])('lays the marks where a rival actually brakes on %s', (id) => {
    const track = trackById(id);
    const p = pathOf(track);
    const faces = barrierFaces(p);
    const collider = new BarrierCollider([...faces, wallLoop(boundsOf(faces, VENUE_MARGIN + BARRIER_THICKNESS))], COLLISION_CELL);
    const g = gridSpot(p, p.nearest(...track.waypoints[track.startIndex]), 0);
    const driver = new AiDriver(p, racingLine(p, AI), { skill: 1, line: 0, react: 0 });
    driver.form = 1;
    const marked = new Uint8Array(p.count);
    for (const z of brakingZones(p, BRAKE_MARKS)) for (const i of spanIndices(p, z.start, z.end)) marked[i] = 1;
    let st = { x: g.x, z: g.z, yaw: g.yaw, vx: 0, vz: 0, steer: 0, yawRate: 0 };
    let [index, dist, onBrake, inMarks, lost, lostInMarks] = [g.i, 0, 0, 0, 0, 0];
    const dt = 1 / 60;
    while (dist < p.length * 2.5) {
      const v0 = Math.hypot(st.vx, st.vz);
      const c = driver.controls(st, v0, [], 1, dt, true);
      st = advanceKart(st, c, dt, collider).state;
      const v1 = Math.hypot(st.vx, st.vz);
      dist += v1 * dt;
      index = p.nearest(st.x, st.z, index);
      if (dist < p.length || c.brake <= 0) continue; // first lap is the standing start
      [onBrake, inMarks] = [onBrake + 1, inMarks + marked[index]];
      [lost, lostInMarks] = [lost + Math.max(0, v0 - v1), lostInMarks + Math.max(0, v0 - v1) * marked[index]];
    }
    expect(onBrake).toBeGreaterThan(0);
    expect(inMarks / onBrake).toBeGreaterThan(0.8);
    expect(lostInMarks / lost).toBeGreaterThan(0.85);
  });
});

describe('vibration partials (no aliasing at low frame rates)', () => {
  // Amplitude of the slow (< 5 Hz) content in per-frame samples: what a viewer sees as the camera
  // bobbing rather than juddering. Hann-windowed DFT over 2 s.
  const slow = (ys, fps) => {
    const w = ys.map((_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (ys.length - 1)));
    const norm = w.reduce((a, b) => a + b, 0) / 2;
    let peak = 0;
    for (let f = 0; f <= 5; f += 0.25) {
      let [re, im] = [0, 0];
      ys.forEach((y, n) => {
        re += w[n] * y * Math.cos((2 * Math.PI * f * n) / fps);
        im -= w[n] * y * Math.sin((2 * Math.PI * f * n) / fps);
      });
      peak = Math.max(peak, Math.hypot(re, im) / norm);
    }
    return peak;
  };
  const judder = (fps, hz, bandLimited) => {
    const sines = new FrameSines([1, 2.3], [0, 0.4], VIBE.kerbCeil);
    const ys = [];
    for (let f = 1; f <= fps * 2; f++) {
      const [a, b] = bandLimited ? sines.update(hz, 1 / fps) : [Math.sin((2 * Math.PI * hz * f) / fps), Math.sin((2 * Math.PI * 2.3 * hz * f) / fps)];
      ys.push(0.7 * a + 0.3 * b);
    }
    return slow(ys, fps);
  };

  it('keeps kerb judder out of the slow band at 30 and 60 fps over the real range of kerb speeds', () => {
    let naive = 0;
    for (const fps of [30, 60]) {
      for (let speed = 7; speed <= 16; speed += 0.25) {
        const hz = speed / KERB_RIDE.ridge;
        expect(judder(fps, hz, true)).toBeLessThan(0.06);
        naive = Math.max(naive, judder(fps, hz, false));
      }
    }
    expect(naive).toBeGreaterThan(0.5); // plain per-frame sines fold into a slow wobble
  });

  // Judder strength over a short kerb hit (0.4 s), for a kart arriving with any leftover phase.
  const hitRms = (fps, hz, phase0) => {
    const s = new FrameSines([1, 2.3, 0.5], [0, 0.4, 1.1], VIBE.kerbCeil);
    s.fps = fps;
    s.phase = [phase0, (phase0 * 2.3 + 1.7) % (2 * Math.PI), 0];
    let sum = 0;
    const n = Math.round(fps * 0.4);
    for (let f = 0; f < n; f++) {
      const [rib, over] = s.update(hz, 1 / fps);
      sum += (0.7 * rib + 0.3 * over) ** 2;
    }
    return Math.sqrt(sum / n);
  };

  it('gives every kerb hit the same judder strength, whatever phase it starts on', () => {
    const full = Math.sqrt((0.7 ** 2 + 0.3 ** 2) / 2);
    for (const fps of [30, 60, 144]) {
      for (let speed = 7; speed <= 16; speed += 1) {
        const r = Array.from({ length: 24 }, (_, k) => hitRms(fps, speed / KERB_RIDE.ridge, (k / 24) * 2 * Math.PI));
        expect(Math.min(...r)).toBeGreaterThan(full * 0.88);
        expect(Math.max(...r)).toBeLessThan(full * 1.12);
      }
    }
  });

  it('keeps capped partials that are summed apart, and off short repeats', () => {
    // [multiples, ceilings, partials summed on one camera axis]: buzz 0+1 (y), kerb rib+overtone (y).
    for (const [mults, ceil, [i, j]] of [[[1, 241 / 157, 199 / 157], VIBE.buzzCeil, [0, 1]], [[1, 2.3, 0.5], VIBE.kerbCeil, [0, 1]]]) {
      for (const fps of [30, 60]) {
        const s = new FrameSines(mults, undefined, ceil);
        const ys = [];
        for (let f = 0; f < fps * 2; f++) ys.push(s.update(60, 1 / fps).reduce((a, v, k) => a + v * (k + 1), 0));
        expect(s.hz[j] - s.hz[i]).toBeGreaterThan(0.04 * fps); // never merged into one tone
        const tail = ys.slice(-60);
        for (let p = 1; p <= 30; p++) expect(tail.slice(p).some((v, k) => Math.abs(v - tail[k]) > 1e-3)).toBe(true);
      }
    }
  });

  it('is the exact sine while the frame rate can show it', () => {
    const s = new FrameSines([1]);
    const hz = 5;
    let t = 0;
    for (let f = 0; f < 120; f++) {
      s.update(hz, 1 / 120);
      t += 1 / 120;
      expect(s.value[0]).toBeCloseTo(Math.sin(2 * Math.PI * hz * t), 6);
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
