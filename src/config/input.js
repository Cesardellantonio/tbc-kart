// Key bindings (KeyboardEvent.code) and standard-gamepad mapping.

export const BINDINGS = {
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  handbrake: ['Space', 'ShiftLeft', 'ShiftRight'],
};

export const ACTIONS = {
  start: ['Enter', 'Space'],
  pause: ['Escape', 'KeyP'],
  reset: ['KeyR'],
  camera: ['KeyC'],
  mute: ['KeyM'],
  quit: ['KeyQ'],
  left: ['ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'], // menu selection
  right: ['ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'],
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
export const GAMEPAD = {
  deadzone: 0.14,
  steerAxis: 0,
  throttle: 7,
  brake: 6,
  handbrake: 0,
  actions: { start: 9, pause: 9, camera: 3, reset: 8 },
};
