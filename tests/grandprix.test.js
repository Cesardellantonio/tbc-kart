// Grand Prix systems: kart contacts, slipstream, race field order and gaps, racing line, ghost.

import { describe, it, expect } from 'vitest';
import { resolveContacts, drafts } from '../src/physics/kartContacts.js';
import { stepKart } from '../src/physics/kartPhysics.js';
import { RaceField } from '../src/race/RaceField.js';
import { racingLine } from '../src/race/racingLine.js';
import { GhostRecorder } from '../src/race/GhostRecorder.js';
import { TrackPath } from '../src/track/TrackPath.js';
import { WAYPOINTS } from '../src/config/trackWaypoints.js';
import { TRACK_SAMPLES, TRACK_WIDTH, TRACK_SPLINE } from '../src/config/track.js';
import { AI } from '../src/config/race.js';
import { formatGap, ordinal } from '../src/ui/format.js';

const kart = (x, z, vx = 0, vz = 0, yaw = 0) => ({ x, z, vx, vz, yaw });

describe('kart contacts', () => {
  it('pushes overlapping karts apart and exchanges closing speed', () => {
    const a = kart(0, 0, 0, -6); // driving forward (−Z) into b
    const b = kart(0, -1, 0, -2);
    const hits = resolveContacts([a, b], 0.8, 0.3);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeCloseTo(1.6, 5);
    expect(hits[0]).toBeCloseTo(4, 5);
    expect(a.vz).toBeGreaterThan(-6); // the rear kart is slowed
    expect(b.vz).toBeLessThan(-2); // the front kart is shoved on
    expect(a.vz + b.vz).toBeCloseTo(-8, 5); // momentum conserved (equal masses)
  });

  it('ignores karts that are apart', () => {
    const hits = resolveContacts([kart(0, 0), kart(5, 0)], 0.8, 0.3);
    expect(hits).toEqual([0, 0]);
  });
});

describe('slipstream', () => {
  it('drafts only close behind and in line', () => {
    const [behind, ahead] = drafts([kart(0, 0), kart(0, -4)], 9, 1.3); // yaw 0 faces −Z
    expect(behind).toBeGreaterThan(0.5);
    expect(ahead).toBe(0);
    expect(drafts([kart(0, 0), kart(2.5, -4)], 9, 1.3)[0]).toBe(0); // off to the side
  });

  it('raises top speed by cutting drag', () => {
    const run = (draft) => {
      let s = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, steer: 0 };
      for (let i = 0; i < 120 * 20; i++) s = stepKart(s, { throttle: 1, brake: 0, steer: 0, handbrake: false, draft }, 1 / 120);
      return Math.hypot(s.vx, s.vz);
    };
    expect(run(1)).toBeGreaterThan(run(0) + 0.4);
  });
});

describe('RaceField', () => {
  const N = 100;
  const drivers = [
    { code: 'YOU', isPlayer: true },
    { code: 'AAA', isPlayer: false },
  ];

  it('orders by progress, gives real time gaps, and finishes after the set laps', () => {
    const field = new RaceField(N, 0, 2, drivers);
    let t = 0;
    let finished = [];
    // YOU runs 1 sample / 0.1 s; AAA runs slower (1 sample / 0.12 s) from the same spot.
    for (let k = 0; k <= 2 * N + 5; k++) {
      const you = (k + N - 2) % N;
      const aaa = (Math.floor((k * 0.1) / 0.12) + N - 2) % N;
      finished = finished.concat(field.update([you, aaa], t));
      if (k === 60) {
        expect(field.position(field.player)).toBe(1);
        const gap = field.gap(field.entries[1], t);
        expect(gap).toBeGreaterThan(0.5);
        expect(gap).toBeLessThan(2.5);
      }
      t += 0.1;
    }
    expect(finished.map((e) => e.code)).toEqual(['YOU']);
    expect(field.player.finishTime).toBeCloseTo(20.2, 1); // 2 laps + 2 samples of run-up
    expect(field.order[0].code).toBe('YOU');
  });
});

describe('racing line', () => {
  const path = new TrackPath(WAYPOINTS, { samples: TRACK_SAMPLES, width: TRACK_WIDTH, spline: TRACK_SPLINE });
  const line = racingLine(path, AI);

  it('stays on the asphalt and leans to the inside of corners', () => {
    expect(Math.max(...line.map(Math.abs))).toBeLessThanOrEqual(AI.lineMax + 1e-6);
    let agree = 0;
    let corners = 0;
    for (let i = 0; i < path.count; i++) {
      if (Math.abs(path.curvature[i]) < 1 / 8) continue;
      corners++;
      if (Math.sign(line[i]) === Math.sign(path.curvature[i])) agree++;
    }
    expect(corners).toBeGreaterThan(0);
    expect(agree / corners).toBeGreaterThan(0.85);
  });
});

describe('ghost recorder', () => {
  it('records the lap in progress and hands it over on a lap change', () => {
    const rec = new GhostRecorder();
    for (let t = 0; t < 2; t += 1 / 60) rec.update(1, t, { x: t, z: 0, yaw: 0 });
    const lap = rec.take();
    expect(lap.length % 4).toBe(0);
    expect(lap.length / 4).toBeGreaterThan(35);
    rec.update(2, 0, { x: 0, z: 0, yaw: 0 });
    expect(rec.frames.length).toBe(4); // a fresh recording for lap 2
  });
});

describe('format', () => {
  it('formats gaps and positions', () => {
    expect(formatGap(1.2345)).toBe('+1.234');
    expect(formatGap({ laps: 1 })).toBe('+1 LAP');
    expect(formatGap({ laps: 2 })).toBe('+2 LAPS');
    expect(formatGap(null)).toBe('—');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1ST', '2ND', '3RD', '4TH', '11TH', '12TH', '13TH', '21ST', '22ND']);
  });
});
