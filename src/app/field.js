// The Grand Prix field: rival karts + their drivers, grid placement, and per-frame AI, contacts
// and slipstream for every kart on track.

import { Kart } from '../entities/Kart.js';
import { KartFx } from '../fx/KartFx.js';
import { AiDriver } from '../race/AiDriver.js';
import { resolveContacts, drafts } from '../physics/kartContacts.js';
import { gridSpot } from '../race/grid.js';
import { trafficFor } from '../race/traffic.js';
import { KerbFeel } from '../fx/KerbFeel.js';
import { catchUpPace, rivalSlots, trackPace } from '../race/pack.js';
import { RIVALS, GRID, DRAFT, CONTACT, DIFFICULTY } from '../config/race.js';

export function createRivals(scene) {
  return RIVALS.map((profile) => {
    const kart = new Kart(null, {
      number: profile.number,
      livery: { body: profile.body, suit: profile.suit, helmet: profile.body, helmetStripe: profile.stripe },
    });
    scene.add(kart.object3d);
    return { profile, kart, driver: new AiDriver(null, null, profile), fx: new KartFx(scene), kerb: new KerbFeel(), index: -1 };
  });
}

// Point every kart and driver at a newly built world.
export function setFieldTrack(game) {
  const { path, collider, line, track, surface } = game.world; // line: racing line built with the world
  game.kart.collider = collider;
  game.kart.surface = surface;
  for (const r of game.rivals) {
    r.kart.collider = collider;
    r.kart.surface = surface;
    r.driver.setTrack(path, line, trackPace(track.id));
    r.driver.difficulty = DIFFICULTY[game.difficulty].pace;
  }
  game.autopilot.setPath(path);
}

// race = true lines up the whole field; false (time attack) puts the player alone on the grid box.
export function placeField(game, race) {
  const { path, startIndex, gridIndex } = game.world;
  const spot = race ? gridSpot(path, startIndex, GRID.playerSlot) : { x: path.x[gridIndex], z: path.z[gridIndex], yaw: path.heading(gridIndex), i: gridIndex };
  game.kart.place(spot.x, spot.z, spot.yaw);
  game.trackIndex = spot.i;
  const slots = rivalSlots(game.rivals.length, GRID.playerSlot);
  game.rivals.forEach((r, k) => {
    const g = gridSpot(path, startIndex, slots[k]);
    r.kart.place(g.x, g.z, g.yaw);
    r.kart.object3d.visible = race;
    r.index = g.i;
    r.driver.reset();
    r.fx.reset();
    r.kerb.reset();
  });
  game.fx.reset();
  game.kerb.reset();
}

// Rivals drive; everyone on track bumps and drafts. go: false holds rivals on the grid.
export function stepField(game, dt, go) {
  const { path } = game.world;
  const all = [{ kart: game.kart, index: game.trackIndex }, ...game.rivals];
  const view = (o) => ({ state: o.kart.state, index: o.index, speed: o.kart.telemetry.speed });
  const lead = game.field.player.progress;
  for (const r of game.rivals) {
    const s = r.kart.state;
    const traffic = trafficFor(path, r, all.filter((o) => o !== r).map(view));
    const gap = (lead - (game.field.entries.find((e) => e.profile === r.profile)?.progress ?? lead)) * path.spacing;
    const pace = catchUpPace(gap); // behind the player → a touch quicker
    const c = r.driver.controls(s, r.kart.telemetry.speed, traffic, pace, dt, go);
    if (c.reset) respawnRival(game, r);
    else r.kart.update(c, dt);
    r.index = path.nearest(r.kart.state.x, r.kart.state.z, r.index);
    r.kerb.update(r.kart, path, game.world.curbs, r.index, dt);
    r.fx.update(r.kart, dt, game.camera.three, game.renderer.three.domElement.height);
  }
  interact(all.map((o) => o.kart));
}

function interact(karts) {
  const states = karts.map((k) => k.state);
  const hits = resolveContacts(states, CONTACT.radius, CONTACT.restitution);
  const draft = drafts(states, DRAFT.range, DRAFT.lateral);
  karts.forEach((k, i) => {
    k.draft = draft[i];
    if (hits[i] > k.telemetry.impact) {
      k.telemetry.impact = hits[i];
      Object.assign(k.contact, { x: k.state.x, z: k.state.z, nx: 0, nz: 0 });
    }
  });
}

function respawnRival(game, r) {
  const { path } = game.world;
  const i = path.nearest(r.kart.state.x, r.kart.state.z, r.index);
  const p = path.offset(i, r.driver.line[i]);
  r.kart.place(p.x, p.z, path.heading(i));
  r.driver.stuck = 0;
  r.index = i;
}
