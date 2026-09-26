// An online room, host or client side: who is in it, the track and level, the shared clock, and the
// step from lobby to race. Pure logic over a transport (Transport, or LoopbackTransport in tests); the
// lobby card draws room.state as it is, and NetRace takes over the race messages at START.
//   const room = new Room({ makeTransport, now, rand })   now: () => local seconds
//   room.create(name, { track, level }) · room.join(code, name) · room.leave() · room.update() per frame
//   host only: room.setLobby({ track?, level? }) · room.start({ laps, hold }) → start msg (or null
//   while a client's clock is still syncing: it goes out by itself once it is) · room.endRace()
//   room.state  { phase: 'choose'|'connecting'|'error'|'room', error, you, isHost, room, players,
//                 track, level } — exactly what the Lobby card renders
//   room.on(event, fn) → unsubscribe: 'change' (state) · 'start' (the start message, both sides) ·
//     'race' ({ from: player id, msg }: kart / snap / finish / results) · 'left' (player id) ·
//     'closed' (reason: the room went away while you were in it — 'closed' the host said goodbye,
//     'lost' the connection ended without one)
//   room.hostNow() host-clock s · room.send(msg) to the host · room.sendTo(id, msg) / room.broadcast(msg)
//   from the host · room.racing · room.clock (ClockSync; the host's own clock is the reference)
// A fresh transport per create / join (a closed PeerJS peer can't be reused); each side's message
// handling lives in roomHost.js / roomClient.js.

import { EventBus } from '../core/events.js';
import { ClockSync } from './ClockSync.js';
import { parse, msg } from './protocol.js';
import { makeCode } from './roomCode.js';
import { HOST } from './roomHost.js';
import { CLIENT } from './roomClient.js';
import { OWN_STALL } from '../config/net.js';

export class Room {
  constructor({ makeTransport, now = () => performance.now() / 1000, rand = Math.random }) {
    Object.assign(this, { makeTransport, now, rand, bus: new EventBus() });
    this.state = { phase: 'choose', players: [] };
    this.side = null; // HOST or CLIENT while in (or entering) a room
    this.heard = new Map(); // last time (local s) each peer was heard from (fresh per room: begin())
  }

  on(type, handler) {
    return this.bus.on(type, handler);
  }

  get isHost() {
    return this.side === HOST;
  }

  create(name, { track, level }) {
    const code = makeCode(this.rand);
    this.begin(HOST, { isHost: true, you: 'p0', name, room: code, track, level }).host(code);
  }

  join(code, name) {
    this.begin(CLIENT, { isHost: false, name, room: code }).join(code);
  }

  begin(side, fields) {
    this.transport?.close();
    const t = (this.transport = this.makeTransport());
    const on = (type, fn) => t.on(type, (e) => t === this.transport && this.side && fn(e));
    on('open', (hostPeer) => this.side.open(this, hostPeer));
    on('peer', (peer) => this.side.peer?.(this, peer));
    on('close', (peer) => this.side.close(this, peer));
    on('error', (reason) => this.fail(reason));
    on('message', ({ from, data }) => (data = parse(data)) && this.side.message(this, from, data));
    Object.assign(this, { side, racing: false, clock: new ClockSync(), since: this.now() });
    this.peers = new Map(); // host: transport peer id → player id (null until its hello)
    this.heard = new Map();
    this.pongs = new Map(); // host: pongs sent to each peer (its clock samples)
    this.waiting = null; // host: START options held until every client's clock is synced
    this.held = null; // client: a START that arrived before our clock was synced
    this.set({ phase: 'connecting', error: null, players: [], ...fields });
    return t;
  }

  leave() {
    if (this.side) this.isHost ? this.broadcast(msg.bye('closed')) : this.send(msg.bye());
    this.end({ phase: 'choose', error: null, players: [], room: null });
  }

  // Setup failed, or the room went away: the card shows why, and a race in progress hears 'closed'.
  fail(reason) {
    const wasIn = this.state.phase === 'room';
    this.end({ phase: 'error', error: reason });
    if (wasIn) this.bus.emit('closed', reason);
  }

  end(patch) {
    this.side = null; // first: closing the transport fires 'close' events this room must not act on
    this.transport?.close();
    this.racing = false;
    this.set(patch);
  }

  update() {
    const now = this.now();
    const gap = now - (this.stepped ?? now);
    this.stepped = now;
    // We were suspended (a phone app switch): nobody's silence counts while we weren't listening.
    if (gap > OWN_STALL) for (const [peer, t] of this.heard) this.heard.set(peer, t + gap);
    this.side?.update(this, now);
  }

  hostNow() {
    return this.isHost ? this.now() : this.clock.hostNow(this.now());
  }

  set(patch) {
    this.state = { ...this.state, ...patch };
    this.bus.emit('change', this.state);
  }

  send(message) {
    this.transport?.send(this.hostPeer, message);
  }

  sendTo(playerId, message) {
    for (const [peer, id] of this.peers) if (id === playerId) this.transport.send(peer, message);
  }

  broadcast(message) {
    for (const [peer, id] of this.peers) if (id) this.transport.send(peer, message);
  }

  setLobby(patch) {
    if (this.isHost) HOST.setLobby(this, patch);
  }

  // Host: → the start message, or null (already racing, or waiting for a client's clock: it goes
  // out by itself from update() once they are all synced; 'start' fires then).
  start(options) {
    return this.isHost && !this.racing ? HOST.start(this, options) : null;
  }

  endRace() {
    this.racing = false;
  }
}
