// Minimal publish/subscribe bus so race logic, HUD, audio and FX stay decoupled.

export class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(type, handler) {
    if (!this._handlers.has(type)) this._handlers.set(type, new Set());
    this._handlers.get(type).add(handler);
    return () => this._handlers.get(type).delete(handler);
  }

  emit(type, payload) {
    const set = this._handlers.get(type);
    if (set) for (const handler of set) handler(payload);
  }
}
