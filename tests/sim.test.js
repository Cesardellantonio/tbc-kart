// Sim features: replay recording and playback sampling, sector timing, and the driver aids really
// changing the physics (threshold braking, countersteer help).

import { describe, it, expect } from 'vitest';
import { ReplayRecorder, FIELDS } from '../src/race/replay.js';
import { LapTimer, SECTORS } from '../src/race/LapTimer.js';
import { advanceKart } from '../src/physics/advanceKart.js';
import { AIDS } from '../src/config/race.js';

const kart = (x, yaw = 0) => ({ state: { x, z: -x, yaw, steer: 0.1, vx: 1, vz: 2 }, telemetry: { forwardSpeed: 5, throttle: 1, rpm: 3000 } });

describe('replay recorder', () => {
  it('samples at its rate, interpolates between frames (angles the short way) and keeps the lights', () => {
    const r = new ReplayRecorder(10, 60);
    r.reset(2);
    for (let i = 0; i <= 30; i++) r.record(1 / 60, [kart(i / 60), kart(0, i < 15 ? 3.1 : -3.1)], i < 20 ? 3 : 5, i < 20 ? 'red' : 'go');
    expect(r.frames).toBe(Math.floor(0.5 * 10) + 1); // 0.5 s at 10 Hz, from the first frame
    const s = r.sample(0.25, 0);
    expect(s.x).toBeCloseTo(0.25, 1);
    expect(Object.keys(s)).toEqual(FIELDS);
    const yaw = r.sample(r.data[r.stride * 2] + 0.05, 1).yaw; // between 3.1 and −3.1: through ±π, not 0
    expect(Math.abs(yaw)).toBeGreaterThan(3);
    expect(r.lightsAt(0.1)).toEqual({ lights: 3, lightsMode: 'red' });
    expect(r.lightsAt(0.49)).toEqual({ lights: 5, lightsMode: 'go' });
  });

  it('grows as it records, stops at its limit, and ignores a frame with the wrong number of karts', () => {
    const r = new ReplayRecorder(30, 20);
    r.reset(1);
    for (let i = 0; i < 60 * 30; i++) r.record(1 / 60, [kart(i)]);
    expect(r.frames).toBe(20 * 30);
    expect(r.duration).toBeLessThanOrEqual(20.1);
    expect(r.record(1, [kart(0), kart(1)])).toBe(false);
  });
});

describe('sector timing', () => {
  it('times three sectors a lap, keeps the best of each, and ends the last at the line', () => {
    const t = new LapTimer(300, 0);
    const events = [];
    let time = 0;
    t.update(299, 0);
    for (let lap = 0; lap < 3; lap++) {
      for (let i = 0; i < 300; i++) {
        time += lap === 2 && i >= 200 ? 0.008 : 0.01; // lap 3: a quicker last sector
        const lapEvent = t.update(i, time);
        events.push(...t.sectorEvents);
        if (lapEvent) events.push(lapEvent);
      }
    }
    events.push(t.update(0, (time += 0.008)), ...t.sectorEvents); // across the line: lap 3 done
    const sectors = events.filter((e) => e.type === 'sector');
    expect(sectors.filter((e) => e.lap === 1).map((e) => e.sector)).toEqual([0, 1, 2]);
    const lap2 = sectors.filter((e) => e.lap === 2);
    expect(lap2.every((e) => Math.abs(e.delta) < 0.02)).toBe(true);
    expect(t.bestSectors).toHaveLength(SECTORS);
    expect(t.bestSectors[2]).toBeCloseTo(0.8, 1);
    const lastOf3 = sectors.filter((e) => e.lap === 3).at(-1);
    expect(lastOf3?.isBest).toBe(true);
  });
});

describe('driver aids', () => {
  const rolling = (v) => ({ x: 0, z: 0, yaw: 0, vx: 0, vz: -v, steer: 0, yawRate: 0 });
  const open = { resolve: () => 0, contact: null };
  const run = (s, input, seconds) => {
    for (let t = 0; t < seconds; t += 1 / 60) s = advanceKart(s, input, 1 / 60, open).state;
    return s;
  };

  it('OFF: no threshold-braking help — a stamp on the brake locks the rear', () => {
    const helped = run(rolling(12), { throttle: 0, brake: 1, steer: 0, brakeAssist: true }, 0.4);
    const bare = run(rolling(12), { throttle: 0, brake: 1, steer: 0, brakeAssist: false }, 0.4);
    expect(helped.wheelSpin).toBeGreaterThan(-0.2);
    expect(bare.wheelSpin).toBeLessThan(helped.wheelSpin - 0.2);
  });

  it('less countersteer help: the same stab of power at lock slides further', () => {
    const slide = (assist) => {
      let s = run(rolling(9), { throttle: 0, brake: 0, steer: 1, assist }, 0.6);
      let peak = 0;
      for (let t = 0; t < 0.8; t += 1 / 60) {
        s = advanceKart(s, { throttle: 1, brake: 0, steer: 1, assist }, 1 / 60, open).state;
        peak = Math.max(peak, Math.abs(s.slipAngle));
      }
      return peak;
    };
    expect(slide(AIDS.off.steer)).toBeGreaterThan(slide(AIDS.full.steer));
    expect(Object.keys(AIDS)).toEqual(['full', 'reduced', 'off']);
  });
});
