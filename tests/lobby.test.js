// Online lobby card, the pure parts: what a name / room code may contain, the share link, the
// remembered name, and how a lobby state maps onto the card (panels, rows, errors, Enter / Esc).

import { describe, it, expect } from 'vitest';
import {
  sanitizeName,
  finalName,
  defaultName,
  sanitizeCode,
  isCompleteCode,
  shareLink,
  loadName,
  saveName,
} from '../src/ui/lobbyText.js';
import {
  lobbyView,
  playerRows,
  liveryCss,
  primaryAction,
  escapeAction,
} from '../src/ui/lobbyView.js';
import { errorView, ERRORS } from '../src/ui/lobbyErrors.js';
import { CODE_ALPHABET, NAME_KEY, MAX_PLAYERS } from '../src/config/lobby.js';

const memoryStorage = (init = {}) => {
  const data = { ...init };
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)), data };
};

describe('driver names', () => {
  it('drops control characters and markup brackets, squeezes spaces, caps at 12', () => {
    expect(sanitizeName('  Max\t\nVer<b>stappen</b> the Great')).toBe('Max Verbstap');
    expect(sanitizeName('A\u0000B\u007fC')).toBe('ABC');
    expect([...sanitizeName('x'.repeat(40))]).toHaveLength(12);
  });
  it('keeps a trailing space while typing, trims it when sent', () => {
    expect(sanitizeName('Max ')).toBe('Max ');
    expect(finalName('Max ', 'Driver 100')).toBe('Max');
  });
  it('never cuts an emoji in half', () => {
    const name = sanitizeName('🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️');
    expect(name.isWellFormed?.() ?? true).toBe(true);
    expect([...name].length).toBeLessThanOrEqual(12);
  });
  it('falls back to a default when empty', () => {
    expect(finalName('   ', 'Driver 427')).toBe('Driver 427');
    expect(defaultName(() => 0)).toBe('Driver 100');
    expect(defaultName(() => 0.999)).toBe('Driver 999');
  });
  it('is remembered in localStorage under tbc-kart.name', () => {
    const storage = memoryStorage();
    expect(loadName(storage, () => 0.5)).toBe('Driver 550');
    saveName(storage, 'Cesar');
    expect(storage.data[NAME_KEY]).toBe('Cesar');
    expect(loadName(storage)).toBe('Cesar');
    expect(loadName(memoryStorage({ [NAME_KEY]: '<script>' }), () => 0)).toBe('script');
    const broken = { getItem: () => { throw new Error('denied'); } }; // prettier-ignore
    expect(loadName(broken, () => 0)).toBe('Driver 100');
    expect(() => saveName({ setItem: () => { throw new Error('full'); } }, 'x')).not.toThrow(); // prettier-ignore
  });
});

describe('room codes', () => {
  it('upper-cases, keeps only the code alphabet (no I, O, 0, 1), caps at 5', () => {
    expect(sanitizeCode('k7qx2')).toBe('K7QX2');
    expect(sanitizeCode('k7-q x2!')).toBe('K7QX2');
    expect(sanitizeCode('IO01ab')).toBe('AB');
    expect(sanitizeCode('ABCDEFGH')).toBe('ABCDE');
    for (const c of sanitizeCode(CODE_ALPHABET.toLowerCase())) expect(CODE_ALPHABET).toContain(c);
  });
  it('takes the room from a pasted share link', () => {
    expect(sanitizeCode('https://x.github.io/tbc-kart-play/?room=k7qx2')).toBe('K7QX2');
    expect(sanitizeCode('http://localhost:5173/?track=monza&room=ABCDE#x')).toBe('ABCDE');
  });
  it('is complete only at 5 valid characters', () => {
    expect(isCompleteCode('K7QX2')).toBe(true);
    expect(isCompleteCode('K7QX')).toBe(false);
    expect(isCompleteCode('K7QXO')).toBe(false);
  });
  it('share link: this page without query or hash, plus ?room=', () => {
    const loc = {
      origin: 'https://a.github.io',
      pathname: '/tbc-kart-play/',
      search: '?track=spa',
      hash: '#x',
    };
    expect(shareLink(loc, 'K7QX2')).toBe('https://a.github.io/tbc-kart-play/?room=K7QX2');
  });
});

describe('lobby state → card', () => {
  const players = [
    { id: 'p0', name: 'Cesar', livery: 0xffc21a, number: '07', code: 'CES', host: true },
    { id: 'p1', name: 'Jun', livery: { body: 0x22d3ee }, number: '3', code: 'JUN', host: false },
  ];
  it('picks the panel from the phase', () => {
    expect(lobbyView({ phase: 'choose' }).panel).toBe('choose');
    expect(lobbyView({ phase: 'connecting' }).panel).toBe('status');
    expect(lobbyView({ phase: 'error', error: 'full' }).panel).toBe('status');
    expect(lobbyView({ phase: 'room', players }).panel).toBe('room');
  });
  it('says what it is connecting to', () => {
    expect(lobbyView({ phase: 'connecting', isHost: true, room: 'K7QX2' }).status).toMatchObject({
      title: 'CREATING ROOM',
      busy: true,
    });
    expect(lobbyView({ phase: 'connecting', room: 'K7QX2' }).status.title).toBe('JOINING K7QX2');
  });
  it('fills six rows: humans first (you highlighted), then AI slots', () => {
    const rows = playerRows(players, 'p1');
    expect(rows).toHaveLength(MAX_PLAYERS);
    expect(rows[0]).toMatchObject({
      name: 'Cesar',
      host: true,
      you: false,
      color: '#ffc21a',
      number: '07',
    });
    expect(rows[1]).toMatchObject({ name: 'Jun', you: true, color: '#22d3ee' });
    expect(rows.slice(2).every((r) => r.ai)).toBe(true);
    const view = lobbyView({ phase: 'room', players, you: 'p1' });
    expect(view.count).toBe('2 / 6 DRIVERS');
    expect(view.aiNote).toBe('AI FILLS THE 4 EMPTY SLOTS');
  });
  it('a full grid has no AI slots', () => {
    const six = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const view = lobbyView({ phase: 'room', players: six });
    expect(view.rows.some((r) => r.ai)).toBe(false);
    expect(view.rows).toHaveLength(MAX_PLAYERS);
    expect(view.aiNote).toBe('FULL GRID');
  });
  it('only the host can start, and only with at least one player', () => {
    expect(lobbyView({ phase: 'room', isHost: true, players }).canStart).toBe(true);
    expect(lobbyView({ phase: 'room', isHost: true, players: [] }).canStart).toBe(false);
    expect(lobbyView({ phase: 'room', isHost: false, players }).canStart).toBe(false);
  });
  it('liveries: number, CSS string or { body }, grey when missing', () => {
    expect(liveryCss(0x07)).toBe('#000007');
    expect(liveryCss('#ff0000')).toBe('#ff0000');
    expect(liveryCss({ body: 0xffffff })).toBe('#ffffff');
    expect(liveryCss(undefined)).toBe('#9aa3b2');
  });
});

describe('lobby errors', () => {
  it('has clear words for every refusal / failure the design names', () => {
    for (const reason of ['not-found', 'full', 'version', 'network', 'timeout', 'taken']) {
      expect(ERRORS[reason].title).toMatch(/^[A-Z ]+$/);
    }
    expect(errorView('full').title).toBe('ROOM FULL');
    expect(errorView({ reason: 'not-found' }).retry).toBe(true);
    expect(errorView('version').retry).toBe(false); // needs a reload, not another try
    expect(errorView({ reason: 'weird', message: 'Broker said no' })).toMatchObject({
      title: 'SOMETHING WENT WRONG',
      text: 'Broker said no',
    });
  });
});

describe('lobby keys', () => {
  it('Enter creates from the name field, joins from a complete code, never half a code', () => {
    expect(primaryAction('choose', { focus: 'name', codeComplete: true })).toBe('create');
    expect(primaryAction('choose', { focus: 'code', codeComplete: true })).toBe('join');
    expect(primaryAction('choose', { focus: 'code', codeComplete: false })).toBe(null);
    expect(primaryAction('choose', { codeComplete: true })).toBe('join');
    expect(primaryAction('choose', {})).toBe('create');
  });
  it('Enter retries an error that can be retried, starts a room only for the host', () => {
    expect(primaryAction('error', { canRetry: true })).toBe('retry');
    expect(primaryAction('error', { canRetry: false })).toBe('leave');
    expect(primaryAction('room', { isHost: true, canStart: true })).toBe('start');
    expect(primaryAction('room', { isHost: false, canStart: false })).toBe(null);
    expect(primaryAction('connecting', {})).toBe(null);
  });
  it('Esc closes the card from the first panel, otherwise cancels / leaves', () => {
    expect(escapeAction('choose')).toBe('back');
    expect(escapeAction('connecting')).toBe('leave');
    expect(escapeAction('error')).toBe('leave');
    expect(escapeAction('room')).toBe('leave');
  });
});
