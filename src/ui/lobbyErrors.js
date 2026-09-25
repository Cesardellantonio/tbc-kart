// Why joining or creating a room failed, in words a player can act on. Pure (unit-tested).
// Keys are the reasons the net layer reports: refuse { reason } from the host ('full', 'version',
// 'racing'), plus the transport's own failures. retry: whether trying the same thing again can help
// (a version mismatch needs a reload instead, and a closed room is gone).

import { MAX_PLAYERS } from '../config/lobby.js';

export const ERRORS = {
  'not-found': {
    title: 'ROOM NOT FOUND',
    text: 'No room with that code is open. Check the code, or ask the host for the link.',
    retry: true,
  },
  full: { title: 'ROOM FULL', text: `That room already has ${MAX_PLAYERS} drivers.`, retry: true },
  version: {
    title: 'VERSION MISMATCH',
    text: 'You and the host are running different versions. Both reload the page, then try again.',
    retry: false,
  },
  network: {
    title: 'CONNECTION FAILED',
    text: "Couldn't reach the online service. Check your connection and try again.",
    retry: true,
  },
  timeout: {
    title: 'NO ANSWER',
    text: "The room didn't answer in time. Check your connection and try again.",
    retry: true,
  },
  taken: {
    title: 'CODE TAKEN',
    text: 'That room code is already in use. Try again for a fresh one.',
    retry: true,
  },
  racing: {
    title: 'RACE IN PROGRESS',
    text: "That room is mid-race. Join again when it's back in the lobby.",
    retry: true,
  },
  closed: { title: 'HOST LEFT', text: 'The host closed the room.', retry: false },
  offline: {
    title: "YOU'RE OFFLINE",
    text: 'Online racing needs an internet connection. Reconnect, then try again.',
    retry: true,
  },
};
const UNKNOWN = {
  title: 'SOMETHING WENT WRONG',
  text: 'The connection failed. Try again.',
  retry: true,
};

// error: a reason string, or { reason, message } (a message, when given, replaces the stock text).
export function errorView(error) {
  const reason = typeof error === 'string' ? error : error?.reason;
  const known = ERRORS[reason] ?? UNKNOWN;
  const message = typeof error === 'object' ? error?.message : null;
  return { ...known, text: message || known.text };
}
