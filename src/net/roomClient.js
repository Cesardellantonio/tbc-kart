// A client's side of a Room: says hello once the channel to the host is up, takes the welcome (or the
// refusal), keeps the lobby as the host describes it, pings the host (a quick burst at first, then
// every PING_INTERVAL — the heartbeat and the clock samples in one), and passes race messages on.
// The host hanging up, saying bye or going silent for SILENCE_TIMEOUT closes the room ('closed').

import { msg } from './protocol.js';
import { PROTOCOL_VERSION, CONNECT_TIMEOUT, SILENCE_TIMEOUT } from '../config/net.js';
import { PING_BURST, PING_BURST_GAP, PING_INTERVAL } from '../config/net.js';

const toRace = (room, m) => room.bus.emit('race', { from: 'p0', msg: m });

const ON = {
  welcome(room, m) {
    if (room.state.phase !== 'connecting') return;
    if (m.v !== PROTOCOL_VERSION) return room.fail('version');
    room.set({ phase: 'room', you: m.you, room: m.room, ...m.lobby });
    room.pings = PING_BURST;
    room.nextPing = room.now();
  },
  refuse: (room, m) => room.fail(m.reason),
  lobby: (room, { players, track, level }) =>
    room.state.phase === 'room' && room.set({ players, track, level }),
  pong: (room, m) => room.clock.sample(m.t0, m.th, room.now()),
  start(room, m) {
    room.racing = true;
    room.bus.emit('start', m);
  },
  snap: toRace,
  finish: toRace,
  results(room, m) {
    room.racing = false; // the race is settled: the room is a lobby again until the next start
    toRace(room, m);
  },
  left: (room, m) => room.bus.emit('left', m.id),
  bye: (room) => room.fail('closed'),
};

export const CLIENT = {
  open(room, hostPeer) {
    room.hostPeer = hostPeer;
    room.heard.set('host', room.now());
    room.send(msg.hello(room.state.name));
  },

  close: (room) => room.fail(room.state.phase === 'room' ? 'closed' : 'network'),

  message(room, from, m) {
    if (from !== room.hostPeer) return;
    room.heard.set('host', room.now());
    ON[m.type]?.(room, m);
  },

  update(room, now) {
    if (room.state.phase === 'connecting' && now - room.since > CONNECT_TIMEOUT)
      return room.fail('timeout');
    if (room.state.phase !== 'room') return;
    if (now - room.heard.get('host') > SILENCE_TIMEOUT) return room.fail('closed');
    if (now < room.nextPing) return;
    room.send(msg.ping(now));
    room.nextPing = now + (room.pings-- > 1 ? PING_BURST_GAP : PING_INTERVAL);
  },
};
