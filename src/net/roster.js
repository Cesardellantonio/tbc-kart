// Who is who in a room, decided by the host (pure, unit-tested): each newcomer's player id, a name no
// one else in the room has, a three-letter timing-tower code, a livery and number; and at START the
// race roster — every human plus AI rivals to fill the grid, each in a grid slot.

import { sanitizeName } from '../ui/lobbyText.js';
import { NAME_MAX, MAX_PLAYERS } from '../config/lobby.js';
import { HOST_LIVERY, HUMAN_LIVERIES } from '../config/net.js';
import { RIVALS } from '../config/race.js';

const RESERVED_CODES = [...RIVALS.map((r) => r.code), 'YOU']; // rivals may join the grid later
const same = (a, b) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

// The lowest free human id p0…p5, or null when the room is full.
export function nextPlayerId(players) {
  for (let n = 0; n < MAX_PLAYERS; n++) if (!players.some((p) => p.id === `p${n}`)) return `p${n}`;
  return null;
}

// "Max" → "Max 2" when a Max is already here (the suffix fits inside NAME_MAX).
export function uniqueName(raw, players) {
  const name = sanitizeName(raw).trim() || 'Driver';
  const taken = (n) => players.some((p) => same(p.name, n));
  if (!taken(name)) return name;
  for (let k = 2; k <= MAX_PLAYERS + 1; k++) {
    const tail = ` ${k}`;
    const candidate =
      [...name]
        .slice(0, NAME_MAX - tail.length)
        .join('')
        .trimEnd() + tail;
    if (!taken(candidate)) return candidate;
  }
  return name;
}

// First three letters, accents dropped ("Émile" → "EMI"); a clash swaps the last one for a digit.
export function driverCode(name, players) {
  const letters = name
    .normalize('NFD')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const base = (letters + 'DRV').slice(0, 3);
  const taken = (c) => RESERVED_CODES.includes(c) || players.some((p) => p.code === c);
  if (!taken(base)) return base;
  for (let d = 2; d <= 99; d++) {
    const c = base.slice(0, 3 - String(d).length) + d;
    if (!taken(c)) return c;
  }
  return base;
}

// The host keeps the player's yellow #07; everyone else gets the first free HUMAN_LIVERIES entry.
export function liveryFor(id, players) {
  if (id === 'p0') return HOST_LIVERY;
  return HUMAN_LIVERIES.find((l) => !players.some((p) => p.livery === l.body)) ?? HUMAN_LIVERIES[0];
}

// A newcomer's lobby entry: { id, name, code, livery (body colour), number, host }.
export function seat(id, rawName, players) {
  const name = uniqueName(rawName, players);
  const { body, number } = liveryFor(id, players);
  return { id, name, code: driverCode(name, players), livery: body, number, host: id === 'p0' };
}

// A full livery (suit, stripe…) from the body colour a lobby / roster entry carries.
export const liveryByBody = (body) =>
  [HOST_LIVERY, ...HUMAN_LIVERIES, ...RIVALS].find((l) => l.body === body) ?? HOST_LIVERY;

// humans + AI rivals (RIVALS[0…]) to MAX_PLAYERS karts, in a random grid order.
export function buildRoster(players, rand = Math.random) {
  const slots = [...Array(MAX_PLAYERS).keys()];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const humans = [...players].sort((a, b) => a.id.localeCompare(b.id));
  const roster = humans.map(({ id, name, code, livery, number }) => ({
    id,
    kind: 'human',
    name,
    code,
    livery,
    number,
  }));
  for (let r = 0; roster.length < MAX_PLAYERS; r++) {
    const { name, code, body, number } = RIVALS[r];
    roster.push({ id: `a${r}`, kind: 'ai', name, code, livery: body, number, rival: r });
  }
  roster.forEach((entry, k) => (entry.slot = slots[k]));
  return roster;
}
