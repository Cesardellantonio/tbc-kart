// One-shot input actions (start, pause, reset, camera, mute, quit, debug) mapped onto game state.

import { placeField } from './field.js';

// mode: 'race' (Grand Prix vs the field) | 'timeattack' (alone, with the best-lap ghost).
export function startRace(game, mode = game.session.mode) {
  game.audio.unlock();
  placeField(game, mode === 'race');
  game.field.reset();
  game.recorder.reset();
  game.ghost.set(game.record.ghost);
  game.camera.follow(game.kart);
  game.session.startCountdown(mode);
  game.screens.showTitle(false);
  game.screens.showPause(false);
  game.screens.showResults(false);
  game.hud.setMode(mode);
  game.hud.setVisible(true);
}

// Back to the title card: the whole field runs an attract-mode race behind it.
export function goTitle(game) {
  game.session.toTitle();
  placeField(game, true);
  game.autopilot.index = -1;
  game.camera.broadcast();
  game.screens.showPause(false);
  game.screens.showResults(false);
  game.screens.showTitle(true);
  game.hud.setVisible(false);
}

// Put the kart back on the centreline nearest to where it is, facing down the track.
export function respawn(game) {
  const { path } = game.world;
  const { x, z } = game.kart.state;
  const i = path.nearest(x, z, game.trackIndex);
  game.kart.place(path.x[i], path.z[i], path.heading(i));
  game.bus.emit('reset');
}

export function handleActions(game) {
  const { input, session, camera, bus, screens } = game;
  const state = session.state;
  if (state === 'title') {
    if (input.action('left') || input.action('right')) screens.cycleMode();
    if (input.action('start')) startRace(game, screens.mode);
  } else if (state === 'finished') {
    if (input.action('start') || input.action('reset')) startRace(game);
    if (input.action('pause') || input.action('quit')) goTitle(game);
  } else {
    if (input.action('pause')) session.togglePause();
    if (input.action('quit') && state === 'paused') return goTitle(game);
    if (input.action('reset')) {
      if (state === 'paused') startRace(game);
      else if (state === 'racing') respawn(game);
    }
  }
  if (state !== 'title' && input.action('camera')) bus.emit('camera', camera.cycleView());
  if (input.action('mute')) bus.emit('mute', game.audio.toggleMute());
  if (input.action('debug')) game.debug.toggle();
}
