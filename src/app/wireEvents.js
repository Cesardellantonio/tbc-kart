// Connects race and kart events to sound, camera shake, the saved record (+ ghost) and the screens.

import { saveRecord } from '../race/storage.js';

export function wireEvents(game) {
  const { bus, sfx, camera, screens } = game; // session / field / record change with the track
  bus.on('light', () => sfx.beep('red'));
  bus.on('go', () => sfx.beep('go'));
  bus.on('lap', (e) => {
    sfx.chime(e.isBest);
    if (e.isBest) {
      const { session } = game;
      const ghost = game.recorder.take() ?? game.record.ghost;
      game.record = { best: e.time, splits: session.timer.bestSplits, ghost };
      saveRecord(game.signature, e.time, session.timer.bestSplits, ghost, game.recordKey);
      if (session.mode === 'timeattack') game.ghost.set(ghost); // chase the new benchmark next lap
      screens.setBest(e.time);
    }
  });
  bus.on('finish', () => {
    sfx.chime(game.field.position(game.field.player) === 1);
    camera.broadcast();
    screens.showResults(true);
    game.hud.setVisible(false);
  });
  bus.on('impact', (speed) => {
    sfx.impact(speed);
    camera.shake(Math.min(0.85, speed / 9));
  });
  bus.on('pause', (paused) => screens.showPause(paused));
}
