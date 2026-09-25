// The in-room panel of the lobby: room code + invite link, the six grid rows, and the race settings
// (track, rival level) — editable by the host, shown read-only to everyone else.

import { el, setText } from './dom.js';
import { shareLink } from './lobbyText.js';
import { drawLobbyTrack } from './lobbyTrack.js';
import { copyText } from './copyText.js';
import { COPIED_TIME } from '../config/lobby.js';

export class LobbyRoom {
  constructor(root, r, onLevel) {
    this.r = r;
    this.levels = [...root.querySelectorAll('.lobby-room [data-level]')];
    for (const b of this.levels) b.addEventListener('click', () => onLevel(b.dataset.level));
    [this.rowsKey, this.track, this.copyTimer] = ['', null, 0];
  }

  render(view, state) {
    const r = this.r;
    setText(r.roomCode, view.code);
    const link = view.code ? shareLink(window.location, view.code) : '';
    if (r.link.value !== link) r.link.value = link;
    setText(r.count, view.count);
    setText(r.aiNote, view.aiNote);
    r.start.disabled = !view.canStart;
    for (const b of this.levels) {
      b.classList.toggle('is-selected', b.dataset.level === state.level);
      b.disabled = !view.isHost; // clients see the host's choice, but can't change it
    }
    const trackId = typeof state.track === 'object' ? state.track?.id : state.track;
    if (trackId !== this.track) {
      this.track = trackId;
      drawLobbyTrack(r.map, r.trackName, r.trackFacts, trackId);
    }
    const key = JSON.stringify(view.rows);
    if (key !== this.rowsKey) {
      this.rowsKey = key;
      r.players.replaceChildren(...view.rows.map(row));
    }
  }

  async copy() {
    const r = this.r;
    const result = await copyText(r.link.value, r.link);
    r.copy.textContent = result === 'copied' ? 'COPIED ✓' : 'SELECTED';
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => (r.copy.textContent = 'COPY LINK'), COPIED_TIME * 1000);
  }
}

// One grid row: livery chip, number, name (+ HOST / YOU tags), three-letter code. Names are text.
function row(p) {
  const li = el('li', p.ai ? 'is-ai' : p.you ? 'is-you' : '');
  const chip = el('em');
  if (!p.ai) chip.style.background = p.color;
  const number = el('span', 'lp-num');
  number.textContent = p.ai ? '' : `#${p.number}`;
  const name = el('span', 'lp-name');
  name.textContent = p.name;
  if (p.host) name.append(el('i', 'lp-tag lp-host', 'HOST'));
  if (p.you) name.append(el('i', 'lp-tag lp-you', 'YOU'));
  const code = el('span', 'lp-code');
  code.textContent = p.ai ? 'AI' : p.code;
  li.append(chip, number, name, code);
  return li;
}
