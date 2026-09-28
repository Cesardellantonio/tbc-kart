// One-shot input actions (start, pause, reset, camera, mute, quit, debug) mapped onto game state.

import { placeField } from './field.js';
import { startRound, startChampRace, finishRound, newSeasonNow } from './championship.js';
import { sessionLength } from '../race/qualifying.js';

// Modes with the whole field on track (the rest: time attack alone, online its own grid).
export const fieldMode = (mode) => mode === 'race' || mode === 'champ' || mode === 'quali';

// mode: 'race' (Grand Prix vs the field) | 'quali' / 'champ' (a championship round's qualifying and
// race, app/championship.js) | 'timeattack' (alone, with the best-lap ghost) | 'online' (app/onlineRace.js
// lines up the room's grid afterwards). hold: the lights' hold (online: the host's).
export function startRace(game, mode = game.session.mode, hold) {
  game.audio.unlock();
  const layout = mode === 'quali' ? 'quali' : mode === 'champ' ? 'qualified' : fieldMode(mode) ? 'grid' : 'solo';
  placeField(game, layout, game.qualiGrid);
  if (mode !== 'online') game.field = mode === 'quali' ? game.qualiField : game.soloField;
  game.field.reset();
  game.recorder.reset();
  game.ghost.set(game.record.ghost);
  game.camera.follow(game.kart);
  if (mode === 'online') game.replay.karts = null; // (online races are not recorded)
  else game.replay.begin(mode === 'timeattack');
  if (mode === 'quali') game.session.startSession(mode, sessionLength(game.world.path.length));
  else game.session.startCountdown(mode, hold);
  game.screens.showTitle(false);
  game.screens.showPause(false);
  game.screens.showResults(false);
  game.screens.showSeason(false);
  game.hud.setMode(mode);
  game.hud.clearToasts(); // the last race's CHEQUERED FLAG must not sit over the new start lights
  game.hud.setVisible(true);
}

// Back to the title card: the whole field runs an attract-mode race behind it.
export function goTitle(game) {
  game.session.toTitle();
  game.field = game.soloField;
  placeField(game, 'grid');
  game.autopilot.index = -1;
  game.camera.broadcast();
  game.screens.showPause(false);
  game.screens.showResults(false);
  game.screens.showSeason(false);
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
  if (game.replay.active) return game.replay.handle(input); // the replay owns the keys while it runs
  const session = game.session;
  const state = session.state;
  if (state === 'title') {
    if (screens.lobby.visible) return; // the online lobby card owns the keys while it is open
    if (input.action('left')) screens.cycleMode(-1);
    if (input.action('right')) screens.cycleMode(1);
    if (input.action('level')) game.setDifficulty(screens.cycleLevel());
    if (input.action('aids')) game.setAids(screens.cycleAids());
    if (input.action('graphics')) screens.graphics?.cycle();
    if (input.action('prevTrack')) game.selectTrack(-1);
    if (input.action('nextTrack')) game.selectTrack(1);
    if (input.action('start')) {
      if (screens.mode === 'online') screens.openLobby();
      else if (screens.mode === 'champ') startRound(game);
      else startRace(game, screens.mode);
    }
  } else if (screens.season.visible) {
    // Championship standings after a round: on to the next round (or a new season), or the menu
    const choice = resultsChoice(input);
    if (choice === 'again') game.season.round >= game.season.rounds.length ? newSeasonNow(game) : startRound(game);
    else if (choice === 'next') newSeasonNow(game);
    else if (choice === 'menu') goTitle(game);
  } else if (session.mode === 'online') {
    game.online.handle(input, state); // nothing pauses; the host picks what's next (app/online.js)
  } else if (state === 'finished' && input.action('replay')) {
    game.replay.open();
  } else if (state === 'finished' && session.mode === 'quali') {
    const choice = resultsChoice(input);
    if (choice === 'again') startChampRace(game); // to the race, from this grid
    else if (choice === 'menu') goTitle(game);
  } else if (state === 'finished' && session.mode === 'champ') {
    const choice = resultsChoice(input);
    if (choice === 'again') finishRound(game); // points, then the standings card
    else if (choice === 'menu') (finishRound(game, false), goTitle(game));
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
  if (state !== 'title' && input.action('telemetry')) game.hud.telemetry.setVisible(!game.hud.telemetry.visible);
  if (input.action('mute')) bus.emit('mute', game.audio.toggleMute());
  if (input.action('debug')) game.debug.toggle();
}
