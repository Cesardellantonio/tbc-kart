// The shape of every message type (see the online design's Protocol section). protocol.js checks
// each incoming message against its entry here and drops anything that doesn't fit.
// Times (t, t0, th, countdownAt, time, best) are seconds; t / th / countdownAt are on the host clock.

import { num, int, bool, oneOf, nullable, optional, str, tuple, list, shape } from './schema.js';
import { isCode } from './roomCode.js';
import { NAME_MAX, MAX_PLAYERS } from '../config/lobby.js';
import { DIFFICULTY } from '../config/race.js';
import { STATE_LEN, CONTROLS_LEN, WORLD_LIMIT, SPEED_LIMIT } from '../config/net.js';

export const REFUSALS = ['full', 'version', 'racing'];

const TIME = num(-1e9, 1e9);
const RACE_TIME = num(0, 1e5);
const playerId = str(2, /^p[0-5]$/);
const kartId = str(2, /^(p[0-5]|a[0-4])$/);
const name = str(NAME_MAX, /^[^\u0000-\u001f\u007f-\u009f<>]+$/u); // what lobbyText.sanitizeName leaves
const driverCode = str(3, /^[A-Z0-9]{3}$/);
const number = str(3, /^[0-9]{1,3}$/);
const livery = int(0, 0xffffff); // body colour
const track = str(24, /^[a-z0-9-]+$/);
const level = oneOf(Object.keys(DIFFICULTY));

// s: [x, z, yaw, vx, vz, steer, yawRate, slipAngle] — positions, angles (wrapped, rad), speeds.
export const STATE_MAX = [WORLD_LIMIT, WORLD_LIMIT, 4, SPEED_LIMIT, SPEED_LIMIT, 4, SPEED_LIMIT, 4];
const STATE_CHECKS = STATE_MAX.map((max) => num(-max, max));
const kartS = (v) =>
  Array.isArray(v) && v.length === STATE_LEN && v.every((x, i) => STATE_CHECKS[i](x));
const kart = {
  id: kartId,
  t: TIME, // host-clock time the state was sampled
  s: kartS,
  c: tuple(num(-1, 1), CONTROLS_LEN), // [throttle, brake]
  i: int(0, 100000), // nearest centreline sample
  p: num(-1e7, 1e7), // progress along the race, in centreline samples
  lap: int(0, 999),
};
const player = shape({ id: playerId, name, livery, number, code: driverCode, host: bool });
const lobby = { players: list(player, MAX_PLAYERS, 1), track, level };
const rosterEntry = shape({
  id: kartId,
  kind: oneOf(['human', 'ai']),
  name,
  code: driverCode,
  livery,
  number,
  slot: int(0, MAX_PLAYERS - 1),
  rival: optional(int(0, MAX_PLAYERS - 2)), // AI only: index into RIVALS
});
const result = shape({
  id: kartId,
  time: nullable(RACE_TIME),
  best: nullable(RACE_TIME),
  dnf: bool,
});

const withType = (fields) => shape({ type: str(8), ...fields });

export const SHAPES = {
  hello: withType({ v: int(0, 1e6), name }),
  welcome: withType({ v: int(0, 1e6), you: playerId, room: isCode, lobby: shape(lobby) }),
  refuse: withType({ reason: oneOf(REFUSALS) }),
  lobby: withType(lobby),
  ping: withType({ t0: TIME }),
  pong: withType({ t0: TIME, th: TIME }),
  start: withType({
    track,
    level,
    laps: int(1, 99),
    roster: list(rosterEntry, MAX_PLAYERS, 1),
    countdownAt: TIME,
    hold: num(0, 5),
  }),
  kart: withType(kart),
  snap: withType({ th: TIME, karts: list(shape(kart), MAX_PLAYERS) }),
  finish: withType({ id: kartId, time: RACE_TIME, best: nullable(RACE_TIME) }),
  results: withType({ entries: list(result, MAX_PLAYERS) }),
  left: withType({ id: playerId }),
  bye: withType({ reason: optional(str(16, /^[a-z-]+$/)) }),
};
