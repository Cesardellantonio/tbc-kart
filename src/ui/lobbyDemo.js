// Dev only (?lobbydemo=1): drives the online cards with made-up states, so their layout and flow
// can be checked without a network. Opens the lobby; CREATE fakes a room that friends join, JOIN
// fakes the refusals by code (ZZZZZ not found, FFFFF full, VVVVV version, TTTTT timeout, else in).
// window.__lobbyDemo.show(name) jumps straight to one screen (see SHOTS) for screenshots.

import { TRACKS } from '../tracks/index.js';

const FRIENDS = [
  { name: 'Cesar', code: 'CES', livery: 0xffc21a, number: '07' },
  { name: 'Marta Vieira', code: 'MAR', livery: 0xf4f6fb, number: '2' },
  { name: 'Jun', code: 'JUN', livery: 0x22d3ee, number: '3' },
  { name: 'Alexandrinas', code: 'ALE', livery: 0xff5fa2, number: '44' },
  { name: 'Ola K', code: 'OLA', livery: 0x9be15d, number: '63' },
  { name: 'Driver 318', code: 'DRI', livery: 0x1d3557, number: '77' },
];
const REFUSE = { ZZZZZ: 'not-found', FFFFF: 'full', VVVVV: 'version', TTTTT: 'timeout' };

export function lobbyDemo(game) {
  const screens = game.screens;
  const lobby = screens.lobby;
  let s = { phase: 'choose', track: game.track.id, level: game.difficulty };
  const players = (n, you) =>
    FRIENDS.slice(0, n).map((p, i) => ({
      ...p,
      id: `p${i}`,
      host: i === 0,
      name: i === you ? (s.name ?? p.name) : p.name,
    }));
  const set = (patch) => lobby.render((s = { ...s, ...patch }));
  const later = (ms, fn) => setTimeout(fn, ms);
  const join = (n) => set({ players: players(n, s.isHost ? 0 : 2) });

  lobby.bind({
    onCreate: (name) => {
      set({ name, phase: 'connecting', isHost: true, room: 'K7QX2', you: 'p0' });
      later(900, () => set({ phase: 'room', players: players(1, 0) }));
      for (const n of [2, 3, 4]) later(900 + (n - 1) * 1500, () => s.phase === 'room' && join(n));
    },
    onJoin: (code, name) => {
      set({ name, phase: 'connecting', isHost: false, room: code, you: 'p2' });
      later(900, () =>
        set(
          REFUSE[code]
            ? { phase: 'error', error: REFUSE[code] }
            : { phase: 'room', players: players(3, 2) }
        )
      );
    },
    onTrack: (offset) => {
      const i = TRACKS.findIndex((t) => t.id === s.track);
      set({ track: TRACKS[(i + offset + TRACKS.length) % TRACKS.length].id });
    },
    onLevel: (level) => set({ level }),
    onStart: () => show('pause'),
    onLeave: () => set({ phase: 'choose', room: null, players: [] }),
  });

  const room = (isHost, n) => ({
    phase: 'room',
    isHost,
    room: 'K7QX2',
    you: isHost ? 'p0' : 'p2',
    players: players(n, isHost ? 0 : 2),
  });
  const SHOTS = {
    choose: () => screens.openLobby(),
    connecting: () => set({ phase: 'connecting', isHost: false, room: 'K7QX2' }),
    'room-host': () => set(room(true, 3)),
    'room-client': () => set(room(false, 4)),
    'room-full': () => set(room(true, 6)),
    'room-alone': () => set(room(true, 1)),
  };
  function show(name) {
    screens.showOnlinePause(false);
    screens.showResults(false);
    screens.results.setOnline(null);
    if (name.startsWith('error-')) return set({ phase: 'error', error: name.slice(6) });
    if (name === 'pause' || name.startsWith('results-')) {
      screens.lobby.show(false);
      screens.showTitle(false);
      if (name === 'pause') return screens.showOnlinePause(true);
      screens.results.setOnline(name.slice(8));
      screens.results.update(game.field);
      return screens.showResults(true);
    }
    if (!lobby.visible) screens.openLobby();
    SHOTS[name]?.();
  }
  screens.setMode('online');
  screens.openLobby(new URLSearchParams(window.location.search).get('room') ?? '');
  return {
    show,
    shots: [...Object.keys(SHOTS), 'error-not-found', 'pause', 'results-host', 'results-client'],
  };
}
