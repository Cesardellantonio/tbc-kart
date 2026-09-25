// The PeerJS wrapper against a fake Peer: the host's peer id, the channel options, PeerJS errors
// mapped onto the lobby's reasons, the connect timeout, the offline check, ?netlag shaping (both
// ways) and the goodbye linger on close.
// (The real broker is exercised in the browser: see the dev ?nettest=1 page.)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transport } from '../src/net/Transport.js';
import { LinkShaper, shaperFromQuery } from '../src/net/linkShaper.js';
import { CONNECT_TIMEOUT, CLOSE_LINGER } from '../src/config/net.js';

class Emitter {
  constructor() {
    this.handlers = {};
  }
  on(type, fn) {
    (this.handlers[type] ??= []).push(fn);
  }
  emit(type, ...args) {
    for (const fn of this.handlers[type] ?? []) fn(...args);
  }
}
class FakeConn extends Emitter {
  constructor(peer, options) {
    super();
    Object.assign(this, { peer, options, open: false, sent: [] });
  }
  send(data) {
    this.sent.push(data);
  }
  close() {
    this.open = false;
    this.emit('close');
  }
  up() {
    this.open = true;
    this.emit('open');
  }
}
class FakePeer extends Emitter {
  static last = null;
  constructor(id, options) {
    super();
    Object.assign(this, { id, options, conns: [], destroyed: false });
    FakePeer.last = this;
  }
  connect(id, options) {
    const conn = new FakeConn(id, options);
    this.conns.push(conn);
    return conn;
  }
  destroy() {
    this.destroyed = true;
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const make = (shaper = null) => {
  const t = new Transport({ shaper, loadPeer: async () => ({ Peer: FakePeer }) });
  const seen = [];
  for (const type of ['open', 'peer', 'message', 'close', 'error']) {
    t.on(type, (payload) => seen.push([type, payload]));
  }
  return { t, seen };
};

describe('transport', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('hosts under tbckart-<CODE> and hands over each client channel', async () => {
    const { t, seen } = make();
    t.host('K7QX2');
    await flush();
    const peer = FakePeer.last;
    expect(peer.id).toBe('tbckart-K7QX2');
    peer.emit('open', peer.id);
    const conn = new FakeConn('client-1');
    peer.emit('connection', conn);
    conn.up();
    conn.emit('data', { type: 'ping', t0: 1 });
    t.send('client-1', { type: 'pong' });
    t.broadcast({ type: 'lobby' });
    conn.close();
    expect(seen).toEqual([
      ['open', 'tbckart-K7QX2'],
      ['peer', 'client-1'],
      ['message', { from: 'client-1', data: { type: 'ping', t0: 1 } }],
      ['close', 'client-1'],
    ]);
    expect(conn.sent).toEqual([{ type: 'pong' }, { type: 'lobby' }]);
  });

  it('joins over one reliable JSON channel to the host', async () => {
    const { t, seen } = make();
    t.join('K7QX2');
    await flush();
    const peer = FakePeer.last;
    expect(peer.id).toBe(undefined); // a random id from the broker
    peer.emit('open', 'random-id');
    const [conn] = peer.conns;
    expect(conn.peer).toBe('tbckart-K7QX2');
    expect(conn.options).toEqual({ reliable: true, serialization: 'json' });
    conn.up();
    expect(seen).toEqual([['open', 'tbckart-K7QX2']]);
    peer.emit('error', { type: 'network' }); // after setup: not an error, 'close' / silence say it
    expect(seen).toHaveLength(1);
  });

  const cases = {
    'unavailable-id': 'taken',
    'peer-unavailable': 'not-found',
    network: 'network',
    'server-error': 'network',
    'socket-error': 'network',
    'socket-closed': 'network',
    'browser-incompatible': 'offline',
  };
  for (const [type, reason] of Object.entries(cases)) {
    it(`reports PeerJS '${type}' as '${reason}' and shuts down`, async () => {
      const { t, seen } = make();
      t.join('K7QX2');
      await flush();
      FakePeer.last.emit('error', { type });
      expect(seen).toEqual([['error', reason]]);
      expect(FakePeer.last.destroyed).toBe(true);
    });
  }

  it(`gives up after ${CONNECT_TIMEOUT} s with 'timeout'`, async () => {
    vi.useFakeTimers();
    const { t, seen } = make();
    t.join('K7QX2');
    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT * 1000 - 10);
    expect(seen).toEqual([]);
    await vi.advanceTimersByTimeAsync(20);
    expect(seen).toEqual([['error', 'timeout']]);
    expect(FakePeer.last.destroyed).toBe(true);
  });

  it("says 'offline' at once when the browser is offline, or goes offline while connecting", async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const a = make();
    a.t.host('K7QX2');
    await flush();
    expect(a.seen).toEqual([['error', 'offline']]);
    vi.stubGlobal('navigator', { onLine: true });
    const b = make();
    b.t.join('K7QX2');
    await flush();
    b.t.onOffline(); // the window 'offline' event
    expect(b.seen).toEqual([['error', 'offline']]);
  });

  it('delays what it sends by ?netlag, in order', async () => {
    vi.useFakeTimers();
    const shaper = shaperFromQuery('?netlag=120&netloss=0');
    expect(shaper).toBeInstanceOf(LinkShaper);
    expect(shaperFromQuery('?nothing=1')).toBe(null);
    const { t, seen } = make(shaper);
    t.host('K7QX2');
    await vi.advanceTimersByTimeAsync(0);
    const conn = new FakeConn('c');
    FakePeer.last.emit('connection', conn);
    conn.up();
    t.send('c', 1);
    t.send('c', 2);
    await vi.advanceTimersByTimeAsync(110);
    expect(conn.sent).toEqual([]);
    await vi.advanceTimersByTimeAsync(20);
    expect(conn.sent).toEqual([1, 2]);
    conn.emit('data', 'in'); // …and what it receives: the same lag the other way
    await vi.advanceTimersByTimeAsync(110);
    expect(seen.filter(([type]) => type === 'message')).toEqual([]);
    await vi.advanceTimersByTimeAsync(20);
    expect(seen.filter(([type]) => type === 'message')).toEqual([
      ['message', { from: 'c', data: 'in' }],
    ]);
  });

  it('lets a last goodbye leave before it closes open channels', async () => {
    vi.useFakeTimers();
    const { t } = make();
    t.host('K7QX2');
    await vi.advanceTimersByTimeAsync(0);
    const conn = new FakeConn('c');
    FakePeer.last.emit('connection', conn);
    conn.up();
    t.send('c', 'bye');
    t.close();
    expect([conn.open, FakePeer.last.destroyed]).toEqual([true, false]);
    await vi.advanceTimersByTimeAsync(CLOSE_LINGER * 1000 + 10);
    expect([conn.open, FakePeer.last.destroyed]).toEqual([false, true]);
    expect(conn.sent).toEqual(['bye']);
  });
});

describe('link shaper', () => {
  let rand;
  beforeEach(() => {
    const draws = [0.9, 0.01, 0.01, 0.9, 0.9]; // second message lost twice
    rand = () => draws.shift() ?? 0.9;
  });
  it('resends a lost message a round trip later and holds the next one behind it', () => {
    const s = new LinkShaper({ lag: 0.1, loss: 0.05, rand });
    expect(s.arrival('h', 0)).toBeCloseTo(0.1, 9);
    expect(s.arrival('h', 0.05)).toBeCloseTo(0.15 + 2 * 0.2, 9);
    expect(s.arrival('h', 0.1)).toBeCloseTo(0.55, 9); // not before the one ahead of it
    expect(s.arrival('other', 0.1)).toBeCloseTo(0.2, 9); // each destination is its own queue
  });
});
