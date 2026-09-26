// Key bindings (KeyboardEvent.code) and standard-gamepad mapping.

export const BINDINGS = {
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  handbrake: ['Space', 'ShiftLeft', 'ShiftRight'],
};

// Menu actions reuse driving keys only where the player can't be driving: the title card. The
// results card appears the moment you cross the line, still on the throttle / brake / drift keys,
// so its actions get keys of their own (Space and S/↓ there would skip the card by reflex).
export const ACTIONS = {
  start: ['Enter', 'Space'], // title: race the selected mode
  pause: ['Escape', 'KeyP'],
  reset: ['KeyR'],
  camera: ['KeyC'],
  mute: ['KeyM'],
  quit: ['KeyQ'],
  left: ['ArrowLeft', 'KeyA'], // title: game mode
  right: ['ArrowRight', 'KeyD'],
  prevTrack: ['ArrowUp', 'KeyW'], // title: track
  nextTrack: ['ArrowDown', 'KeyS', 'KeyN'],
  raceAgain: ['Enter'], // results card
  nextRace: ['KeyN'], // results card: on to the next track
  level: ['KeyL'], // menu: rival level
  graphics: ['KeyG'], // menu: graphics quality (reloads)
  debug: ['Backquote', 'F3'],
};

export const PREVENT_DEFAULT = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
  'F3',
]);

// Standard gamepad layout: RT throttle, LT brake, A handbrake, Y camera, Back reset, Start
// start / pause / race again, B menu. The D-pad drives the title card: up/down track, left/right
// mode; down is also NEXT TRACK on the results card (never a driving input on a pad).
export const GAMEPAD = {
  deadzone: 0.14,
  steerAxis: 0,
  throttle: 7,
  brake: 6,
  handbrake: 0,
  actions: {
    start: 9,
    pause: 9,
    raceAgain: 9,
    quit: 1,
    camera: 3,
    reset: 8,
    prevTrack: 12,
    nextTrack: 13,
    nextRace: 13,
    left: 14,
    right: 15,
    level: 2, // X
  },
};
