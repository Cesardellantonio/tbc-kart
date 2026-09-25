// The network under the room: a thin wrapper round PeerJS (WebRTC data channels, brokered by the free
// PeerJS cloud server, 0.peerjs.com). The host registers the peer id tbckart-<CODE>; each client opens
// one reliable, ordered JSON channel to it (a star: clients only ever talk to the host).
//   const t = new Transport();          t.on(event, handler) → unsubscribe
//   t.host(code) / t.join(code)         start; events follow, never inside the call
//   'open'    (hostPeerId)              host: the broker holds our id; client: the channel is up
//   'peer'    (peerId)                  host: a client's channel opened
//   'message' ({ from, data })          raw data — Room checks it with protocol.parse
//   'close'   (peerId)                  a channel ended (either side, or dropped)
//   'error'   (reason)                  setup failed: 'taken' 'not-found' 'network' 'timeout' 'offline'
//   t.send(peerId, msg) · t.broadcast(msg) · t.drop(peerId) · t.close()
// peerjs is loaded on first use, so single-player never downloads it. ?netlag / ?netloss (dev) shape
// what this end sends (linkShaper.js). LoopbackTransport.js is the same API in memory, for tests.

import { EventBus } from '../core/events.js';
import { peerIdFor } from './roomCode.js';
import { shaperFromQuery } from './linkShaper.js';
import { CONNECT_TIMEOUT } from '../config/net.js';

const CHANNEL = { reliable: true, serialization: 'json' };
const REASONS = {
  'unavailable-id': 'taken',
  'peer-unavailable': 'not-found',
  'browser-incompatible': 'offline',
};
const reasonFor = (type) =>
  globalThis.navigator?.onLine === false ? 'offline' : (REASONS[type] ?? 'network');
const nowS = () => performance.now() / 1000;

export class Transport {
  constructor({ shaper = shaperFromQuery(), loadPeer = () => import('peerjs') } = {}) {
    Object.assign(this, { shaper, loadPeer, bus: new EventBus(), conns: new Map() });
    this.opened = this.closed = false;
    this.onOffline = () => this._fail('offline');
  }

  on(type, handler) {
    return this.bus.on(type, handler);
  }

  host(code) {
    this._start(peerIdFor(code), (peer) => this._opened(peer.id));
  }

  join(code) {
    this._start(undefined, (peer) => this._adopt(peer.connect(peerIdFor(code), CHANNEL), true));
  }

  async _start(id, onOpen) {
    if (globalThis.navigator?.onLine === false) return queueMicrotask(() => this._fail('offline'));
    this.timer = setTimeout(() => this._fail('timeout'), CONNECT_TIMEOUT * 1000);
    globalThis.addEventListener?.('offline', this.onOffline);
    let Peer;
    try {
      ({ Peer } = await this.loadPeer());
    } catch {
      return this._fail('network'); // the peerjs chunk didn't load
    }
    if (this.closed) return;
    const peer = (this.peer = new Peer(id, { debug: 0 }));
    peer.on('open', () => onOpen(peer));
    peer.on('connection', (conn) => this._adopt(conn, false));
    peer.on('error', (e) => this._fail(reasonFor(e.type)));
    // Lost the broker: open channels carry on; reconnect so new joiners can still find the room.
    peer.on('disconnected', () => !this.closed && !peer.destroyed && peer.reconnect());
  }

  _adopt(conn, toHost) {
    conn.on('open', () => {
      this.conns.set(conn.peer, conn);
      if (toHost) this._opened(conn.peer);
      else this.bus.emit('peer', conn.peer);
    });
    conn.on('data', (data) => this.bus.emit('message', { from: conn.peer, data }));
    conn.on('close', () => this.conns.delete(conn.peer) && this.bus.emit('close', conn.peer));
    conn.on('error', () => conn.close());
  }

  _opened(peerId) {
    clearTimeout(this.timer);
    if (this.opened || this.closed) return;
    this.opened = true;
    this.bus.emit('open', peerId);
  }

  _fail(reason) {
    if (this.opened || this.closed) return; // after setup, trouble shows up as 'close' / silence
    this.close();
    this.bus.emit('error', reason);
  }

  send(to, message) {
    const conn = this.conns.get(to);
    if (!conn?.open) return;
    if (!this.shaper?.active) return conn.send(message);
    const now = nowS();
    setTimeout(() => conn.open && conn.send(message), (this.shaper.arrival(to, now) - now) * 1000);
  }

  broadcast(message) {
    for (const to of this.conns.keys()) this.send(to, message);
  }

  drop(to) {
    const conn = this.conns.get(to);
    if (!conn || !this.conns.delete(to)) return;
    conn.close();
    queueMicrotask(() => this.bus.emit('close', to));
  }

  close() {
    this.closed = true;
    clearTimeout(this.timer);
    globalThis.removeEventListener?.('offline', this.onOffline);
    for (const conn of this.conns.values()) conn.close();
    this.conns.clear();
    this.peer?.destroy();
  }
}
