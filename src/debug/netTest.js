// Dev only (net-test.html): the real network stack — Transport over the PeerJS cloud, Room, NetRace —
// without the game, so two browsers can prove it end to end. window.__net:
//   create(name) / join(code, name) / leave() · state() · log (phase changes)
//   pings() → round trips measured by the clock sync (s) · offset() → estimated host-clock offset (s)
//   startRace() (host) → both sides run a NetRace with made-up karts whose true position is a
//   function of host time; raceStats() → messages per second and how far each remote view is off.

import { Room } from '../net/Room.js';
import { Transport } from '../net/Transport.js';
import { NetRace } from '../net/NetRace.js';

const room = new Room({ makeTransport: () => new Transport() });
const log = [];
const out = document.getElementById('out');
const counts = { kart: 0, snap: 0, finish: 0, results: 0 };
let race = null;
let raceFrom = 0;
let errors = [];

// Kart k's truth at host time t: 10 m/s along x from the race's start time, one lane per kart.
let t0 = 0;
const truth = (k, t) => ({
  s: [10 * (t - t0), 4 * k, 0.3, 10, 0, 0, 0, 0],
  c: [1, 0],
  i: 1,
  p: t,
  lap: 1,
});
const kartNumber = (id) => (id[0] === 'p' ? Number(id[1]) : 6 + Number(id[1]));

room.on('change', (s) => log.push(s.phase + (s.error ? `:${s.error}` : '')));
room.on('race', ({ msg }) => msg.type in counts && counts[msg.type]++);
room.on('start', (start) => {
  race = new NetRace({ room, start });
  t0 = start.countdownAt;
  raceFrom = performance.now() / 1000;
  errors = [];
  for (const k in counts) counts[k] = 0;
});

let last = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  room.update();
  if (race) {
    const t = room.hostNow();
    const ai = room.isHost ? ['a0', 'a1'].map((id) => ({ id, ...truth(kartNumber(id), t) })) : [];
    race.update(dt, { own: truth(kartNumber(race.you), t), ai });
    for (const [id, st] of race.remoteStates()) {
      if (!st.stale) errors.push(Math.abs(st.s[0] - truth(kartNumber(id), st.t).s[0]));
    }
  }
  const s = room.state;
  out.textContent = JSON.stringify({ ...s, log, rtt: room.clock?.rtt, counts }, null, 1);
}, 1000 / 60);

const pct = (v, q) =>
  v.length ? [...v].sort((a, b) => a - b)[Math.floor(q * (v.length - 1))] : null;

window.__net = {
  room,
  log,
  create: (name) => room.create(name, { track: 'monza', level: 'club' }),
  join: (code, name) => room.join(code, name),
  leave: () => room.leave(),
  state: () => room.state,
  pings: () => room.clock.samples.map((s) => s.rtt),
  offset: () => room.clock.offset,
  timeOrigin: () => performance.timeOrigin,
  startRace: () => room.start({ laps: 3, hold: 0.5 }),
  raceStats: () => {
    const secs = performance.now() / 1000 - raceFrom;
    return {
      seconds: secs,
      kartPerSec: counts.kart / secs,
      snapPerSec: counts.snap / secs,
      remote: race ? [...race.remoteStates().keys()] : [],
      errorMedian: pct(errors, 0.5),
      errorP99: pct(errors, 0.99),
      errorMax: pct(errors, 1),
      samples: errors.length,
    };
  },
};
