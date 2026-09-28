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
  aids: ['KeyI'], // menu: driver aids
  telemetry: ['KeyT'], // racing: telemetry overlay
  replay: ['KeyV'], // results card: watch the replay
  // While watching a replay (app/replay.js)
  replayPause: ['KeyK', 'Space'],
  replayBack: ['ArrowLeft', 'KeyJ'],
  replayFwd: ['ArrowRight', 'KeyL'],
  replaySlower: ['BracketLeft', 'Minus', 'Comma'],
  replayFaster: ['BracketRight', 'Equal', 'Period'],
  replayPrev: ['ArrowUp'],
  replayNext: ['ArrowDown'],
  replayDirector: ['KeyA'],
  graphics: ['KeyG'], // menu: graphics quality (reloads)
  debug: ['Backquote', 'F3'],
};

export const PREVENT_DEFAULT = new Set([
  'BracketLeft',
  'BracketRight',
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

// On-screen touch buttons (ui/TouchControls.js): px around a button that still counts as on it, so a
// thumb drifting off the edge of GAS or ◀ keeps holding it.
export const TOUCH = { slop: 18 };

// Telemetry overlay (ui/Telemetry.js, T key): trace length, full scales, tyre colour window (°C:
// cold, best, cooked — as the grip window in config/physics.js).
export const TELEMETRY = { seconds: 5, speedFull: 18, gFull: 2, temps: [25, 55, 85] };

// Rumble (app/haptics.js): refresh period (s), what saturates each cue, and each cue's share of its motor.
export const HAPTICS = { period: 0.1, impactFull: 6, slideFrom: 1.5, slideRange: 4, rpmFrom: 4200, rpmTo: 5600, kerb: 0.7, slide: 0.55, engine: 0.12 };
