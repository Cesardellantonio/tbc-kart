// From the host's START roster to this browser's race (no THREE): the timing field with every kart in
// roster order, where each kart starts, which AI rivals this browser drives (the host runs them all,
// a client none), and the host's final classification written onto the field.

import { RaceField } from '../race/RaceField.js';
import { gridSpot } from '../race/grid.js';
import { RIVALS } from '../config/race.js';

// Timing-tower drivers: code, name and colour from the roster; AI entries carry their rival profile.
export function onlineDrivers(roster, you) {
  return roster.map((e) => ({
    id: e.id,
    code: e.code,
    name: e.name,
    color: e.livery,
    isPlayer: e.id === you,
    ...(e.kind === 'ai' ? { profile: RIVALS[e.rival] } : {}),
  }));
}

export function onlineField(world, roster, you, laps) {
  return new RaceField(world.path.count, world.startIndex, laps, onlineDrivers(roster, you));
}

// Puts your kart on your slot and the AI you run on theirs (the other rivals are hidden); returns
// { ai: the rivals you run, tagged with their roster id, spots: id → grid spot for everyone }.
export function placeGrid(game, roster, you, isHost) {
  const { path, startIndex } = game.world;
  const spots = new Map(roster.map((e) => [e.id, gridSpot(path, startIndex, e.slot)]));
  const own = spots.get(you);
  game.kart.place(own.x, own.z, own.yaw);
  game.trackIndex = own.i;
  const ai = [];
  game.rivals.forEach((r, k) => {
    const entry = isHost && roster.find((e) => e.kind === 'ai' && e.rival === k);
    r.kart.object3d.visible = !!entry;
    if (!entry) return;
    const g = spots.get(entry.id);
    r.kart.place(g.x, g.z, g.yaw);
    r.index = g.i;
    r.id = entry.id;
    ai.push(r);
  });
  return { ai, spots };
}

// entries: the host's results [{ id, time|null, best|null, dnf }] in final order. The field takes
// those times and that order, and stops timing (field.final).
export function applyResults(field, entries) {
  const byId = new Map(field.entries.map((e) => [e.id, e]));
  const order = entries.map((r) => byId.get(r.id)).filter(Boolean);
  for (const r of entries) {
    const e = byId.get(r.id);
    if (!e) continue;
    e.finishTime = r.time;
    e.bestLap = r.best ?? e.bestLap;
    e.dnf = r.dnf;
  }
  field.order = [...order, ...field.entries.filter((e) => !order.includes(e))];
  field.final = true;
}

// A flag the host relayed (another kart's exact finish): it replaces the time this browser guessed
// from where it drew that kart.
export function applyFlag(field, { id, time, best }) {
  const e = field.entries.find((d) => d.id === id);
  if (!e) return;
  e.finishTime = time;
  if (best != null) e.bestLap = best;
}
