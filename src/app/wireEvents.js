// Connects race and kart events to sound, camera shake, the saved record and the screens.

import { saveRecord } from '../race/storage.js';

export function wireEvents(game) {
  const { bus, sfx, camera, screens, session } = game;
  bus.on('light', () => sfx.beep('red'));
  bus.on('go', () => sfx.beep('go'));
  bus.on('lap', (e) => {
    sfx.chime(e.isBest);
    if (e.isBest) {
      saveRecord(game.signature, e.time, session.timer.bestSplits);
      screens.setBest(e.time);
    }
  });
  bus.on('impact', (speed) => {
    sfx.impact(speed);
    camera.shake(Math.min(0.85, speed / 9));
  });
  bus.on('pause', (paused) => screens.showPause(paused));
}
