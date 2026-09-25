// The online lobby card: a pure view. render(state) draws whatever the online layer says, and the
// player's choices come back through callbacks — it never talks to the network itself.
//   state: { phase: 'choose' | 'connecting' | 'error' | 'room', error: reason | { reason, message },
//            you: player id, isHost, room: code, players: [{ id, name, livery, number, code, host }],
//            track: track id, level: DIFFICULTY id }
//   callbacks: onCreate(name), onJoin(code, name), onStart(), onLeave(), onTrack(offset), onLevel(id),
//              onBack() (Esc / BACK on the first panel: close the card)
// While open it owns the keyboard (see lobbyKeys.js): the game's driving / menu keys stay quiet.

import { el, refs, showScreen } from './dom.js';
import { LOBBY_HTML } from './lobbyMarkup.js';
import { LobbyChoose } from './LobbyChoose.js';
import { LobbyRoom } from './LobbyRoom.js';
import { lobbyView } from './lobbyView.js';
import { lobbyKeys } from './lobbyKeys.js';
import { isTouchDevice } from './TouchControls.js';

export class Lobby {
  constructor(callbacks = {}) {
    this.on = callbacks;
    this.el = el('div', 'screen screen-lobby', LOBBY_HTML);
    document.body.appendChild(this.el);
    showScreen(this.el, false);
    this.visible = false;
    this.r = refs(this.el);
    this.panels = [...this.el.querySelectorAll('[data-panel]')];
    this.choose = new LobbyChoose(this.r);
    this.room = new LobbyRoom(this.el, this.r, (id) => this.on.onLevel?.(id));
    for (const b of this.el.querySelectorAll('[data-do]')) {
      b.addEventListener('click', () => this.do(b.dataset.do));
    }
    window.addEventListener('keydown', lobbyKeys(this), true); // capture: before the game's Input
    this.render({ phase: 'choose' });
  }

  // Replace some or all of the callbacks (the online layer binds its own over the defaults).
  bind(callbacks) {
    this.on = { ...this.on, ...callbacks };
  }

  // Show the card on its first panel; code pre-fills the join field (a ?room= link).
  open(code = '') {
    this.choose.setCode(code);
    this.render({ phase: 'choose' });
    this.show(true);
    if (!isTouchDevice()) this.r.name.focus(); // on a phone this would throw up the keyboard
  }

  show(visible) {
    this.visible = visible;
    showScreen(this.el, visible);
    if (!visible && this.el.contains(document.activeElement)) document.activeElement.blur();
  }

  render(state) {
    this.state = state;
    const view = (this.view = lobbyView(state));
    for (const p of this.panels) p.hidden = p.dataset.panel !== view.panel;
    const card = this.el.firstElementChild;
    card.classList.toggle('is-host', view.isHost);
    card.classList.toggle('is-room', view.panel === 'room');
    const { r } = this;
    r.statusTitle.textContent = view.status.title;
    r.statusText.textContent = view.status.text;
    r.spinner.hidden = !view.status.busy;
    r.retry.hidden = !view.status.retry;
    r.cancel.firstChild.textContent = view.status.busy ? 'CANCEL ' : 'BACK ';
    if (view.panel === 'room') this.room.render(view, state);
  }

  // One player intent, from a button, Enter or Esc.
  do(action) {
    if (action === 'create' || action === 'join' || action === 'retry') {
      const go = this.choose.submit(action, this.state.room);
      if (go?.action === 'create') this.on.onCreate?.(go.name);
      else if (go) this.on.onJoin?.(go.code, go.name);
      return;
    }
    const calls = {
      start: () => this.view.canStart && this.on.onStart?.(),
      leave: () => this.on.onLeave?.(),
      back: () => this.on.onBack?.(),
      prevTrack: () => this.on.onTrack?.(-1),
      nextTrack: () => this.on.onTrack?.(1),
      copy: () => this.room.copy(),
    };
    calls[action]?.();
  }
}
