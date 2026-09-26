// The lobby card ↔ the Room: the card's choices become room calls (create, join, track, level, START,
// leave), every room change is drawn on the card, and a ?room=CODE link opens the card and joins with
// the remembered name. online: the Online glue (its room, and start() for the host's START).

import { TRACKS, trackById } from '../tracks/index.js';

export function bindLobby(online, game) {
  const { room } = online;
  const { screens } = game;
  const { lobby } = screens;
  lobby.bind({
    onCreate: (name) => room.create(name, { track: game.track.id, level: game.difficulty }),
    onJoin: (code, name) => room.join(code, name),
    onStart: () => online.start(),
    onLeave: () => room.leave(),
    onTrack: (offset) => room.setLobby({ track: stepTrack(room.state.track, offset) }),
    onLevel: (level) => room.setLobby({ level }),
    onBack: () => screens.closeLobby(),
  });
  room.on('change', (state) => lobby.render(state));
  const params = new URLSearchParams(window.location.search);
  if (params.has('room') && !params.has('lobbydemo')) {
    screens.setMode('online');
    screens.openLobby(params.get('room'));
    if (lobby.choose.codeComplete) lobby.do('join');
  }
}

// The track `offset` places along the menu's list from `id` (wrapping round).
export function stepTrack(id, offset) {
  const i = TRACKS.indexOf(trackById(id));
  return TRACKS[(i + offset + TRACKS.length) % TRACKS.length].id;
}
