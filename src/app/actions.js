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
  game.hud.clearToasts(); // the last race's CHEQUERED FLAG must not sit over the new start lights
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
  game.hud.clearToasts();
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

// What the results card does this frame — at most one thing ('again' | 'next' | 'menu' | null):
// the pad's Start fires raceAgain and pause together, and must race again, not quit to the menu.
export function resultsChoice(input) {
  if (input.action('raceAgain') || input.action('reset')) return 'again';
  if (input.action('nextRace')) return 'next';
  if (input.action('pause') || input.action('quit')) return 'menu';
  return null;
}

export function handleActions(game) {
  const { input, camera, bus, screens } = game;
  const session = game.session;
  const state = session.state;
  if (state === 'title') {
    if (screens.lobby.visible) return; // the online lobby card owns the keys while it is open
    if (input.action('left')) screens.cycleMode(-1);
    if (input.action('right')) screens.cycleMode(1);
    if (input.action('level')) game.setDifficulty(screens.cycleLevel());
    if (input.action('prevTrack')) game.selectTrack(-1);
    if (input.action('nextTrack')) game.selectTrack(1);
    if (input.action('start')) {
      if (screens.mode === 'online') screens.openLobby();
      else startRace(game, screens.mode);
    }
  } else if (state === 'finished') {
    const choice = resultsChoice(input);
    if (choice === 'next') game.selectTrack(1);
    if (choice === 'again' || choice === 'next') startRace(game);
    else if (choice === 'menu') goTitle(game);
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
