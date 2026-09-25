// Lobby state → what the card shows, and what Enter / Esc mean in each phase. Pure (no DOM), so it
// is unit-tested; Lobby.js only copies these values into the markup.
// State: { phase, error, you, isHost, room, players, track, level } (see Lobby.js).

import { MAX_PLAYERS } from '../config/lobby.js';
import { errorView } from './lobbyErrors.js';

// Six grid rows: the humans in join order, then the slots AI rivals will fill.
export function playerRows(players = [], you = null) {
  const rows = players.slice(0, MAX_PLAYERS).map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code ?? '',
    number: p.number ?? '',
    color: liveryCss(p.livery),
    host: !!p.host,
    you: p.id === you,
    ai: false,
  }));
  while (rows.length < MAX_PLAYERS)
    rows.push({ id: `ai${rows.length}`, name: 'AI RIVAL', ai: true });
  return rows;
}

// A livery arrives as a colour number (0xffc21a), a CSS string, or an object with a body colour.
export function liveryCss(livery) {
  const body = typeof livery === 'object' && livery !== null ? livery.body : livery;
  if (typeof body === 'number') return `#${body.toString(16).padStart(6, '0')}`;
  return typeof body === 'string' && body ? body : '#9aa3b2';
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 'S'}`;

export function lobbyView(state) {
  const phase = state.phase ?? 'choose';
  const humans = Math.min(state.players?.length ?? 0, MAX_PLAYERS);
  const open = MAX_PLAYERS - humans;
  const connecting = {
    title: state.room && !state.isHost ? `JOINING ${state.room}` : 'CREATING ROOM',
    text: 'Connecting…',
    retry: false,
  };
  return {
    panel: phase === 'connecting' || phase === 'error' ? 'status' : phase,
    status:
      phase === 'error'
        ? { ...errorView(state.error), busy: false }
        : { ...connecting, busy: true },
    code: state.room ?? '',
    rows: playerRows(state.players, state.you),
    count: `${humans} / ${plural(MAX_PLAYERS, 'DRIVER')}`,
    aiNote: open ? `AI FILLS THE ${plural(open, 'EMPTY SLOT')}` : 'FULL GRID',
    isHost: !!state.isHost,
    canStart: !!state.isHost && humans >= 1,
  };
}

// What Enter does. focus: 'name' | 'code' | anything else; codeComplete: the code field holds a
// whole code. A focused button is left alone (the browser clicks it).
export function primaryAction(phase, { focus, codeComplete, isHost, canStart, canRetry } = {}) {
  if (phase === 'choose') {
    if (focus === 'code') return codeComplete ? 'join' : null; // half a code: nothing to submit yet
    if (focus === 'name') return 'create';
    return codeComplete ? 'join' : 'create';
  }
  if (phase === 'error') return canRetry ? 'retry' : 'leave';
  if (phase === 'room') return isHost && canStart ? 'start' : null;
  return null;
}

// What Esc does: close the card from the first screen, otherwise cancel / leave the room.
export const escapeAction = (phase) => (phase === 'choose' ? 'back' : 'leave');
