// The Grand Prix field: rival karts + their drivers, grid placement, and per-frame AI, contacts
// and slipstream for every kart on track.

import { Kart } from '../entities/Kart.js';
import { KartFx } from '../fx/KartFx.js';
import { AiDriver } from '../race/AiDriver.js';
import { resolveContacts, drafts } from '../physics/kartContacts.js';
import { gridSpot } from '../race/grid.js';
import { spreadIndices } from '../race/qualifying.js';
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
    r.driver.level = DIFFICULTY[game.difficulty];
  }
  game.autopilot.setPath(path);
}

// layout: 'grid' (Grand Prix: the player 8th, the rivals shuffled), 'solo' (time attack: the player
// alone on the grid box), 'quali' (everyone spread round the lap, race/qualifying.js) or 'qualified'
// (the grid from qualifying: grid = driver codes, pole first). true / false are 'grid' / 'solo'.
export function placeField(game, layout, grid = null) {
  if (layout === true || layout === false) layout = layout ? 'grid' : 'solo';
  const { path, startIndex, gridIndex, line } = game.world;
  const count = game.rivals.length + 1;
  let spots;
  if (layout === 'quali') {
    const order = rivalSlots(game.rivals.length, -1); // every place round the lap, shuffled (you included)
    const at = spreadIndices(path, startIndex, count);
    spots = order.map((k) => {
      const i = at[k];
      const p = path.offset(i, line[i]);
      return { x: p.x, z: p.z, yaw: path.heading(i), i };
    });
  } else {
    const codes = layout === 'qualified' && grid ? grid : null;
    const playerSlot = codes ? Math.max(0, codes.indexOf('YOU')) : GRID.playerSlot;
    const shuffled = rivalSlots(game.rivals.length, playerSlot);
    const slotOf = (r, k) => (codes && codes.includes(r.profile.code) ? codes.indexOf(r.profile.code) : shuffled[k]);
    spots = [gridSpot(path, startIndex, playerSlot), ...game.rivals.map((r, k) => gridSpot(path, startIndex, slotOf(r, k)))];
  }
  const solo = layout === 'solo';
  const spot = solo ? { x: path.x[gridIndex], z: path.z[gridIndex], yaw: path.heading(gridIndex), i: gridIndex } : spots[0];
  game.kart.place(spot.x, spot.z, spot.yaw);
  game.trackIndex = spot.i;
  game.rivals.forEach((r, k) => {
    const g = spots[k + 1];
    r.kart.place(g.x, g.z, g.yaw);
    r.kart.object3d.visible = !solo;
    r.index = g.i;
    r.driver.reset();
    r.driver.qualifying = layout === 'quali'; // no defending in qualifying
    r.fx.reset();
    r.kerb.reset();
  });
  game.fx.reset();
  game.kerb.reset();
}

// Rivals drive; everyone on track bumps and drafts. go: false holds rivals on the grid.
// Online, `rivals` is the AI this browser runs (all of it on the host, none on a client) and `others`
// the karts driven elsewhere ({ state, index, speed }, read-only): traffic to the AI, and something to
// bump and draft, but only the karts simulated here are moved by it.
export function stepField(game, dt, go, rivals = game.rivals, others = []) {
  const { path } = game.world;
  const all = [{ kart: game.kart, index: game.trackIndex }, ...rivals];
  const view = (o) => ({ state: o.kart.state, index: o.index, speed: o.kart.telemetry.speed });
  const lead = game.field.player.progress;
  for (const r of rivals) {
    const s = r.kart.state;
    const traffic = trafficFor(path, r, [...all.filter((o) => o !== r).map(view), ...others]);
    const gap = (lead - (game.field.entries.find((e) => e.profile === r.profile)?.progress ?? lead)) * path.spacing;
    const entry = game.field.entries.find((e) => e.profile === r.profile);
    // Qualifying: everyone at their own pace, easing off once their session is over
    const pace = game.field.timed ? (entry?.finishTime != null ? 0.85 : 1) : catchUpPace(gap); // behind the player → a touch quicker
    const c = r.driver.controls(s, r.kart.telemetry.speed, traffic, pace, dt, go);
    if (c.reset) respawnRival(game, r);
    else r.kart.update(c, dt);
    r.index = path.nearest(r.kart.state.x, r.kart.state.z, r.index);
    r.kerb.update(r.kart, path, game.world.curbs, r.index, dt);
    r.fx.update(r.kart, dt, game.camera.three, game.renderer.three.domElement.height);
  }
  interact(
    all.map((o) => o.kart),
    others.map((o) => o.state),
  );
}

// fixed: states of karts simulated elsewhere; they push back, but take copies (their owner moves them).
function interact(karts, fixed) {
  const states = karts.map((k) => k.state);
  for (const s of fixed) states.push({ ...s });
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
