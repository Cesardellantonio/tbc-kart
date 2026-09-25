// Headless race simulator (Node or Vitest, no DOM/THREE rendering): six AI karts race a track
// with the game's real physics, barriers, contacts, slipstream and race logic (shuffled grid, pack
// pull). Used by the track tests and tools/track-report.mjs to prove a layout is drivable. 'YOU' is
// an AI stand-in at skill 1, so positions and gaps are indicative, not a real race.

import { barrierFaces } from '../src/track/barrierLines.js';
import { curbTable } from '../src/track/curbTable.js';
import { SurfaceGrip } from '../src/track/surfaceGrip.js';
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
import { catchUpPace, rivalSlots, trackPace } from '../src/race/pack.js';
import { RIVALS, AI, DRAFT, CONTACT, GRID } from '../src/config/race.js';
import { COLLISION_CELL } from '../src/config/physics.js';
import { VENUE_MARGIN } from '../src/config/venue.js';
import { BARRIER_THICKNESS } from '../src/config/track.js';
import { wrapAngle } from '../src/core/math.js';

// opts: { laps, dt, maxTime, field: 'full' | 'solo', pace: 'game' (the game's pack pull from the gap
// to YOU) or a fixed rival skill multiplier (e.g. 1 + AI.catchUp, the worst case), random (grid
// shuffle, reactions, form), tweak (controls, kartIndex) → controls (e.g. a flat-out driver),
// you (profile overrides for the YOU stand-in, e.g. { skill, line }), trackPace (override the circuit's
// TRACK_PACE, e.g. 1 to calibrate it), difficulty (rival skill multiplier, config/race.js DIFFICULTY) }.
// Returns a report per kart and overall.
export function simulateRace(track, { laps = track.laps, dt = 1 / 60, maxTime = null, field = 'full', pace = 'game', random = Math.random, tweak = null, you = {}, trackPace: trackPaceOverride = null, difficulty = 1 } = {}) {
  const path = pathOf(track);
  const faces = barrierFaces(path);
  const collider = new BarrierCollider([...faces, wallLoop(boundsOf(faces, VENUE_MARGIN + BARRIER_THICKNESS))], COLLISION_CELL);
  const line = racingLine(path, AI);
  const surface = new SurfaceGrip(path, line, curbTable(path)); // same track grip as the game
  const startIndex = path.nearest(...track.waypoints[track.startIndex]);
  const profiles = [{ code: 'YOU', skill: 1, line: 0, react: 0.2, ...you }, ...RIVALS];
  const used = field === 'solo' ? profiles.slice(0, 1) : profiles;
  const slots = [GRID.playerSlot, ...rivalSlots(RIVALS.length, GRID.playerSlot, random)];
  const karts = used.map((profile, k) => {
    const g = gridSpot(path, startIndex, field === 'solo' ? 0 : slots[k]);
    const driver = new AiDriver(path, line, profile, trackPaceOverride ?? trackPace(track.id));
    driver.reset(random);
    if (k > 0) driver.difficulty = difficulty;
    return {
      profile,
      driver,
      state: { x: g.x, z: g.z, yaw: g.yaw, vx: 0, vz: 0, steer: 0, yawRate: 0 },
      index: g.i,
      draft: 0,
      grip: [1, 1, 1, 1],
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
  const paceOf = (i) => (i === 0 ? 1 : pace === 'game' ? catchUpPace((race.entries[0].progress - race.entries[i].progress) * path.spacing) : pace);
  while (t < limit && race.entries.some((e) => e.finishTime === null)) {
    for (const [i, k] of karts.entries()) {
      const speed = Math.hypot(k.state.vx, k.state.vz);
      const others = karts.filter((o) => o !== k).map((o) => ({ state: o.state, index: o.index, speed: Math.hypot(o.state.vx, o.state.vz) }));
      const raw = k.driver.controls(k.state, speed, trafficFor(path, k, others), paceOf(i), dt, true);
      const c = tweak ? tweak(raw, i) : raw;
      if (c.reset) {
        const i = path.nearest(k.state.x, k.state.z, k.index);
        const p = path.offset(i, line[i]);
        k.state = { x: p.x, z: p.z, yaw: path.heading(i), vx: 0, vz: 0, steer: 0, yawRate: 0 };
        k.driver.stuck = 0;
        k.resets++;
      } else {
        surface.wheels(k.state, k.index, k.grip);
        const r = advanceKart(k.state, { ...c, draft: k.draft, grip: k.grip }, dt, collider);
        k.state = r.state;
        surface.addDistance(Math.hypot(r.state.vx, r.state.vz) * dt);
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
      slot: field === 'solo' ? 0 : slots[i],
      pace: k.profile.skill * k.driver.form, // race-day skill (before the pack pull)
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
