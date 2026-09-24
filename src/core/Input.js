// Keyboard + gamepad → continuous driving controls and one-shot actions.

import { BINDINGS, ACTIONS, PREVENT_DEFAULT, GAMEPAD } from '../config/input.js';

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set(); // key codes pressed since the last endFrame()
    this._padPressed = new Set();
    this._padPrev = {};
    this._triggered = new Set();
    this.pad = null;
    this.touch = null; // TouchControls, when the device has a touch screen
    target.addEventListener('keydown', (e) => {
      if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  // Call once per frame before reading controls/actions.
  poll() {
    this.pad = navigator.getGamepads?.().find((p) => p && p.connected) || null;
    this._padPressed.clear();
    if (!this.pad) return;
    for (const [name, index] of Object.entries(GAMEPAD.actions)) {
      const now = !!this.pad.buttons[index]?.pressed;
      if (now && !this._padPrev[name]) this._padPressed.add(name);
      this._padPrev[name] = now;
    }
  }

  controls() {
    const held = (codes) => codes.some((c) => this.down.has(c));
    const c = {
      throttle: held(BINDINGS.throttle) ? 1 : 0,
      brake: held(BINDINGS.brake) ? 1 : 0,
      steer: (held(BINDINGS.left) ? 1 : 0) - (held(BINDINGS.right) ? 1 : 0),
      handbrake: held(BINDINGS.handbrake),
    };
    const pad = this.pad;
    if (pad) {
      const axis = pad.axes[GAMEPAD.steerAxis] || 0;
      if (Math.abs(axis) > GAMEPAD.deadzone) c.steer = -axis;
      c.throttle = Math.max(c.throttle, pad.buttons[GAMEPAD.throttle]?.value || 0);
      c.brake = Math.max(c.brake, pad.buttons[GAMEPAD.brake]?.value || 0);
      c.handbrake = c.handbrake || !!pad.buttons[GAMEPAD.handbrake]?.pressed;
    }
    const t = this.touch?.held;
    if (t) {
      c.throttle = Math.max(c.throttle, t.throttle ? 1 : 0);
      c.brake = Math.max(c.brake, t.brake ? 1 : 0);
      c.handbrake = c.handbrake || t.handbrake;
      if (t.left !== t.right) c.steer = t.left ? 1 : -1;
    }
    return c;
  }

  // True once per press of any key (or pad button / on-screen button) bound to the named action.
  action(name) {
    return ACTIONS[name].some((code) => this.pressed.has(code)) || this._padPressed.has(name) || this._triggered.has(name);
  }

  // On-screen buttons fire actions directly; held touch controls merge into controls().
  trigger(name) {
    this._triggered.add(name);
  }

  endFrame() {
    this.pressed.clear();
    this._triggered.clear();
  }
}
