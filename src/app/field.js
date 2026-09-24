// The Grand Prix field: rival karts + their drivers, grid placement, and per-frame AI, contacts
// and slipstream for every kart on track.

import { Kart } from '../entities/Kart.js';
import { KartFx } from '../fx/KartFx.js';
import { AiDriver } from '../race/AiDriver.js';
import { racingLine } from '../race/racingLine.js';
import { resolveContacts, drafts } from '../physics/kartContacts.js';
import { RIVALS, GRID, AI, DRAFT, CONTACT } from '../config/race.js';
import { GRID_BACK } from '../config/track.js';
import { clamp } from '../core/math.js';

export function createRivals(scene, path, collider) {
  const line = racingLine(path, AI);
  return RIVALS.map((profile) => {
    const kart = new Kart(collider, {
      number: profile.number,
      livery: { body: profile.body, suit: profile.suit, helmet: profile.body, helmetStripe: profile.stripe },
    });
    scene.add(kart.object3d);
    return { profile, kart, driver: new AiDriver(path, line, profile), fx: new KartFx(scene), index: -1 };
  });
}

// Grid slot s (0 = pole): staggered two-wide rows behind the start line.
function gridSpot(path, startIndex, s) {
  const back = GRID_BACK + Math.floor(s / 2) * GRID.rowGap + (s % 2) * (GRID.rowGap / 2);
  const i = path.wrap(startIndex - Math.round(back / path.spacing));
  const p = path.offset(i, (s % 2 ? 1 : -1) * GRID.lateral);
  return { x: p.x, z: p.z, yaw: path.heading(i), i };
}

// race = true lines up the whole field; false (time attack) puts the player alone on the grid box.
export function placeField(game, race) {
  const { path, startIndex, gridIndex } = game.world;
  const spot = race ? gridSpot(path, startIndex, GRID.playerSlot) : { x: path.x[gridIndex], z: path.z[gridIndex], yaw: path.heading(gridIndex), i: gridIndex };
  game.kart.place(spot.x, spot.z, spot.yaw);
  game.trackIndex = spot.i;
  const slots = [0, 1, 2, 3, 4, 5].filter((s) => s !== GRID.playerSlot);
  game.rivals.forEach((r, k) => {
    const g = gridSpot(path, startIndex, slots[k]);
    r.kart.place(g.x, g.z, g.yaw);
    r.kart.object3d.visible = race;
    r.index = g.i;
    r.driver.reset();
    r.fx.reset();
  });
  game.fx.reset();
}

// Rivals drive; everyone on track bumps and drafts. go: false holds rivals on the grid.
export function stepField(game, dt, go) {
  const { path } = game.world;
  const all = [{ kart: game.kart, index: game.trackIndex }, ...game.rivals];
  const n = path.count;
  const lead = game.field.player.progress;
  for (const r of game.rivals) {
    const s = r.kart.state;
    const traffic = all.filter((o) => o !== r).map((o) => {
      let d = o.index - r.index;
      d = d > n / 2 ? d - n : d < -n / 2 ? d + n : d;
      return { ahead: d * path.spacing, lateral: path.lateral(o.kart.state.x, o.kart.state.z, o.index), speed: o.kart.telemetry.speed };
    });
    const gap = (lead - (game.field.entries.find((e) => e.profile === r.profile)?.progress ?? lead)) * path.spacing;
    const pace = 1 + clamp(gap / 60, -1, 1) * AI.catchUp; // behind the player → a touch quicker
    const c = r.driver.controls(s, r.kart.telemetry.speed, traffic, pace, dt, go);
    if (c.reset) respawnRival(game, r);
    else r.kart.update(c, dt);
    r.index = path.nearest(r.kart.state.x, r.kart.state.z, r.index);
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
