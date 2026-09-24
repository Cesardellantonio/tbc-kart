// One-shot input actions (start, pause, reset, camera, mute, debug) mapped onto game state.

export function startRace(game) {
  game.audio.unlock();
  game.placeOnGrid();
  game.camera.follow(game.kart);
  game.session.startCountdown();
  game.screens.showTitle(false);
  game.screens.showPause(false);
  game.hud.setVisible(true);
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
  const { input, session, camera, bus } = game;
  const state = session.state;
  if (state === 'title') {
    if (input.action('start')) startRace(game);
  } else {
    if (input.action('pause')) session.togglePause();
    if (input.action('reset')) {
      if (state === 'paused') startRace(game);
      else if (state === 'racing') respawn(game);
    }
    if (input.action('camera')) bus.emit('camera', camera.cycleView());
  }
  if (input.action('mute')) bus.emit('mute', game.audio.toggleMute());
  if (input.action('debug')) game.debug.toggle();
}
