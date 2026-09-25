// The host's side of a Room: admits or refuses each newcomer (full / other version / mid-race), names
// them uniquely and hands out codes and liveries, answers pings (the host clock is the room's clock),
// passes race messages on, notices who has gone (hung up, said bye, or silent SILENCE_TIMEOUT) and
// tells everyone, and turns START into a roster everyone races with.

import { msg } from './protocol.js';
import { nextPlayerId, seat, buildRoster } from './roster.js';
import { PROTOCOL_VERSION, SILENCE_TIMEOUT, CONNECT_TIMEOUT, START_LEAD } from '../config/net.js';

const FROM_CLIENTS = ['kart', 'finish']; // race messages a client may send (about its own kart only)
const lobbyOf = ({ state: { players, track, level } }) => ({ players, track, level });
const publish = (room) => room.broadcast(msg.lobby(lobbyOf(room)));

export const HOST = {
  open(room) {
    room.set({ phase: 'room', players: [seat('p0', room.state.name, [])] });
  },

  peer(room, peer) {
    room.peers.set(peer, null); // says hello next, or is dropped after CONNECT_TIMEOUT
    room.heard.set(peer, room.now());
  },

  message(room, peer, m) {
    if (!room.peers.has(peer) && m.type === 'hello') HOST.peer(room, peer); // data beat 'peer'
    if (!room.peers.has(peer)) return;
    room.heard.set(peer, room.now());
    const id = room.peers.get(peer);
    if (m.type === 'hello') return id ? undefined : admit(room, peer, m);
    if (!id) return;
    if (m.type === 'ping') room.transport.send(peer, msg.pong(m.t0, room.now()));
    else if (m.type === 'bye') remove(room, peer);
    else if (FROM_CLIENTS.includes(m.type) && m.id === id)
      room.bus.emit('race', { from: id, msg: m });
  },

  close: (room, peer) => remove(room, peer),

  update(room, now) {
    for (const [peer, id] of room.peers) {
      if (now - room.heard.get(peer) > (id ? SILENCE_TIMEOUT : CONNECT_TIMEOUT)) remove(room, peer);
    }
  },

  setLobby(room, { track = room.state.track, level = room.state.level }) {
    room.set({ track, level });
    publish(room);
  },

  start(room, { laps, hold }) {
    const { track, level, players } = room.state;
    const roster = buildRoster(players, room.rand);
    const countdownAt = room.now() + START_LEAD;
    const start = msg.start({ track, level, laps, roster, hold, countdownAt });
    room.racing = true;
    room.broadcast(start);
    room.bus.emit('start', start);
    return start;
  },
};

function admit(room, peer, hello) {
  const { players } = room.state;
  const id = nextPlayerId(players);
  const refusal =
    hello.v !== PROTOCOL_VERSION ? 'version' : !id ? 'full' : room.racing ? 'racing' : null;
  if (refusal) return room.transport.send(peer, msg.refuse(refusal)); // it hangs up (or times out)
  room.peers.set(peer, id);
  room.set({ players: [...players, seat(id, hello.name, players)] });
  room.transport.send(peer, msg.welcome(id, room.state.room, lobbyOf(room)));
  publish(room);
}

function remove(room, peer) {
  const id = room.peers.get(peer);
  if (!room.peers.delete(peer)) return;
  room.heard.delete(peer);
  room.transport.drop(peer);
  if (!id) return;
  room.set({ players: room.state.players.filter((p) => p.id !== id) });
  room.broadcast(msg.left(id));
  publish(room);
  room.bus.emit('left', id);
}
