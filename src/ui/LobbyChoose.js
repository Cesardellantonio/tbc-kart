// The lobby's first panel: the driver name (remembered in the browser) and the room-code field.
// Both are cleaned as they are typed; submit() turns CREATE / JOIN / TRY AGAIN into what to send.

import {
  sanitizeName,
  sanitizeCode,
  finalName,
  isCompleteCode,
  loadName,
  saveName,
  defaultName,
} from './lobbyText.js';

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage);

export class LobbyChoose {
  constructor(r) {
    this.r = r;
    this.fallback = defaultName(); // for a cleared name field: stable for this visit
    this.last = null; // the last attempt, { code } for a join, {} for a create: TRY AGAIN repeats it
    r.name.value = loadName(storage());
    r.name.addEventListener('input', () => (r.name.value = sanitizeName(r.name.value)));
    r.codeInput.addEventListener('input', () => this.setCode(r.codeInput.value));
  }

  setCode(raw) {
    const code = sanitizeCode(raw);
    if (this.r.codeInput.value !== code) this.r.codeInput.value = code;
    this.r.joinBtn.disabled = !isCompleteCode(code);
  }

  get codeComplete() {
    return isCompleteCode(this.r.codeInput.value);
  }

  // action: 'create' | 'join' | 'retry'; room: the code the current state names (a ?room= join the
  // online layer started). Returns { action: 'create' | 'join', code, name }, or null for half a code.
  submit(action, room) {
    let code = this.r.codeInput.value;
    if (action === 'retry') {
      code = this.last ? this.last.code : room;
      action = code ? 'join' : 'create';
    } else if (action === 'join' && !isCompleteCode(code)) {
      this.r.codeInput.focus();
      return null;
    }
    const name = finalName(this.r.name.value, this.fallback);
    this.r.name.value = name;
    saveName(storage(), name);
    this.last = action === 'join' ? { code } : {};
    return { action, code, name };
  }
}
