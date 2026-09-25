// Messages between host and clients: one constructor per type (so senders can't misspell a field),
// and parse(), the only way a received message gets in. parse() drops — returns null for — anything
// oversized, not JSON, of an unknown type, or not exactly the shape messages.js gives that type.
// Direction: hello / ping / kart / finish / bye go client → host; the rest host → client
// (the host relays finish, and both sides may say bye).

import { SHAPES } from './messages.js';
import { MAX_MESSAGE, PROTOCOL_VERSION } from '../config/net.js';

export const msg = {
  hello: (name, v = PROTOCOL_VERSION) => ({ type: 'hello', v, name }),
  welcome: (you, room, lobby) => ({ type: 'welcome', v: PROTOCOL_VERSION, you, room, lobby }),
  refuse: (reason) => ({ type: 'refuse', reason }),
  lobby: ({ players, track, level }) => ({ type: 'lobby', players, track, level }),
  ping: (t0) => ({ type: 'ping', t0 }),
  pong: (t0, th) => ({ type: 'pong', t0, th }),
  start: ({ track, level, laps, roster, countdownAt, hold }) => ({
    type: 'start',
    track,
    level,
    laps,
    roster,
    countdownAt,
    hold,
  }),
  kart: (state) => ({ type: 'kart', ...state }),
  snap: (th, karts) => ({ type: 'snap', th, karts }),
  finish: (id, time, best) => ({ type: 'finish', id, time, best }),
  results: (entries) => ({ type: 'results', entries }),
  left: (id) => ({ type: 'left', id }),
  bye: (reason) => (reason ? { type: 'bye', reason } : { type: 'bye' }),
};

// raw: a JSON string, or the object PeerJS already decoded. Returns the message, or null.
export function parse(raw) {
  let data = raw;
  try {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (typeof text !== 'string' || text.length > MAX_MESSAGE) return null; // checked before parsing
    if (typeof raw === 'string') data = JSON.parse(raw);
  } catch {
    return null; // not JSON (or a cyclic / BigInt object that never came off the wire)
  }
  const check = data && Object.hasOwn(SHAPES, data.type) ? SHAPES[data.type] : null;
  return check && check(data) ? data : null;
}
