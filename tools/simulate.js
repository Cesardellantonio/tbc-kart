// Headless race simulator (Node or Vitest, no DOM/THREE rendering): six AI karts race a track
// with the game's real physics, barriers, contacts, slipstream and race logic. Used by the track
// tests and tools/track-report.mjs to prove a layout is drivable.

import { barrierFaces } from '../src/track/barrierLines.js';
import { boundsOf, wallLoop } from '../src/track/bounds.js';
import { pathOf } from '../src/track/validate.js';
import { BarrierCollider } from '../src/physics/BarrierCollider.js';
import { advanceKart } from '../src/physics/advanceKart.js';
import { resolveContacts, drafts } from '../src/physics/kartContacts.js';
import { AiDriver } from '../src/race/AiDriver.js';
import { racingLine } from '../src/race/racingLine.js';
import { RaceField } from '../src/race/RaceField.js';
import { gridSpot } from '../src/race/grid.js';
import { trafficFor } from '../src/race/traffic.js';
import { RIVALS, AI, DRAFT, CONTACT } from '../src/config/race.js';
import { COLLISION_CELL } from '../src/config/physics.js';
import { VENUE_MARGIN } from '../src/config/venue.js';
import { BARRIER_THICKNESS } from '../src/config/track.js';
import { wrapAngle } from '../src/core/math.js';

// opts: { laps, dt, maxTime, field: 'full' | 'solo' }. Returns a report per kart and overall.
export function simulateRace(track, { laps = track.laps, dt = 1 / 60, maxTime = null, field = 'full' } = {}) {
  const path = pathOf(track);
  const faces = barrierFaces(path);
  const collider = new BarrierCollider([...faces, wallLoop(boundsOf(faces, VENUE_MARGIN + BARRIER_THICKNESS))], COLLISION_CELL);
  const line = racingLine(path, AI);
  const startIndex = path.nearest(...track.waypoints[track.startIndex]);
  const profiles = [{ code: 'YOU', skill: 1, line: 0, react: 0.2 }, ...RIVALS];
  const used = field === 'solo' ? profiles.slice(0, 1) : profiles;
  const karts = used.map((profile, k) => {
    const g = gridSpot(path, startIndex, field === 'solo' ? 0 : [4, 0, 1, 2, 3, 5][k]);
    return {
      profile,
      driver: new AiDriver(path, line, profile),
      state: { x: g.x, z: g.z, yaw: g.yaw, vx: 0, vz: 0, steer: 0, yawRate: 0 },
      index: g.i,
      draft: 0,
      resets: 0,
      wallHits: 0,
      spins: 0,
      spinning: false,
      topSpeed: 0,
    };
  });
  const race = new RaceField(path.count, startIndex, laps, used.map((p, k) => ({ code: p.code, isPlayer: k === 0 })));
  const limit = maxTime ?? laps * (path.length / 6) + 30; // generous: 6 m/s average
  let t = 0;
  while (t < limit && race.entries.some((e) => e.finishTime === null)) {
    for (const k of karts) {
      const speed = Math.hypot(k.state.vx, k.state.vz);
      const others = karts.filter((o) => o !== k).map((o) => ({ state: o.state, index: o.index, speed: Math.hypot(o.state.vx, o.state.vz) }));
      const c = k.driver.controls(k.state, speed, trafficFor(path, k, others), 1, dt, true);
      if (c.reset) {
        const i = path.nearest(k.state.x, k.state.z, k.index);
        const p = path.offset(i, line[i]);
        k.state = { x: p.x, z: p.z, yaw: path.heading(i), vx: 0, vz: 0, steer: 0, yawRate: 0 };
        k.driver.stuck = 0;
        k.resets++;
      } else {
        const r = advanceKart(k.state, { ...c, draft: k.draft }, dt, collider);
        k.state = r.state;
        if (r.impact > 1.5) k.wallHits++;
      }
      k.index = path.nearest(k.state.x, k.state.z, k.index);
      const v = Math.hypot(k.state.vx, k.state.vz);
      k.topSpeed = Math.max(k.topSpeed, v);
      const off = Math.abs(wrapAngle(k.state.yaw - path.heading(k.index)));
      if (!k.spinning && off > Math.PI / 2 && v > 2) (k.spins++, (k.spinning = true));
      if (off < Math.PI / 4) k.spinning = false;
    }
    const states = karts.map((k) => k.state);
    resolveContacts(states, CONTACT.radius, CONTACT.restitution);
    drafts(states, DRAFT.range, DRAFT.lateral).forEach((d, i) => (karts[i].draft = d));
    race.update(karts.map((k) => k.index), t);
    t += dt;
  }
  const results = karts.map((k, i) => {
    const e = race.entries[i];
    return {
      code: k.profile.code,
      finished: e.finishTime !== null,
      finishTime: e.finishTime,
      bestLap: e.bestLap,
      lapsDone: e.lapsDone,
      resets: k.resets,
      wallHits: k.wallHits,
      spins: k.spins,
      topSpeedKmh: Math.round(k.topSpeed * 3.6),
      position: race.position(e),
    };
  });
  const best = Math.min(...results.map((r) => r.bestLap ?? Infinity));
  return {
    track: track.id,
    length: path.length,
    laps,
    allFinished: results.every((r) => r.finished),
    resets: results.reduce((a, r) => a + r.resets, 0),
    spins: results.reduce((a, r) => a + r.spins, 0),
    wallHits: results.reduce((a, r) => a + r.wallHits, 0),
    bestLap: Number.isFinite(best) ? best : null,
    avgSpeedKmh: Number.isFinite(best) ? Math.round((path.length / best) * 3.6) : null,
    simTime: t,
    results,
  };
}
