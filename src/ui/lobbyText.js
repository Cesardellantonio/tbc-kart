// Text the lobby accepts from the player — driver names and room codes — plus the share link.
// Pure: no DOM, no storage (the storage helpers take the Storage object), so it is unit-tested.

import { CODE_ALPHABET, CODE_LENGTH, NAME_MAX, NAME_KEY } from '../config/lobby.js';

// While typing: no control characters or markup brackets, single spaces, no leading space, at most
// NAME_MAX characters (counted as code points, so an emoji is never cut in half). A trailing space
// survives so "Max V" can be typed; finalName() trims it.
export function sanitizeName(raw) {
  const clean = String(raw ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ') // tabs and newlines count as spaces…
    .replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '') // …other control characters go
    .replace(/^ /, '');
  return [...clean].slice(0, NAME_MAX).join('');
}

// The name actually sent: trimmed, or the fallback when nothing is left.
export function finalName(raw, fallback) {
  return sanitizeName(raw).trim() || fallback;
}

// "Driver 427": a name for someone who never typed one (three digits, so two newcomers rarely clash).
export function defaultName(random = Math.random) {
  return `Driver ${100 + Math.floor(random() * 900)}`;
}

// While typing a code: upper-case, only the code alphabet, at most CODE_LENGTH. A pasted share link
// ("…?room=k7qx2") gives its room parameter, so pasting the whole link into the field just works.
export function sanitizeCode(raw) {
  const text = String(raw ?? '');
  const fromLink = text.match(/[?&]room=([A-Za-z0-9]+)/);
  const upper = (fromLink ? fromLink[1] : text).toUpperCase();
  return [...upper]
    .filter((c) => CODE_ALPHABET.includes(c))
    .slice(0, CODE_LENGTH)
    .join('');
}

export const isCompleteCode = (code) => sanitizeCode(code) === code && code.length === CODE_LENGTH;

// The link a friend opens to land in the room: this page, minus any query or hash, plus ?room=.
export function shareLink(location, code) {
  return `${location.origin}${location.pathname}?room=${code}`;
}

export function loadName(storage, random = Math.random) {
  let saved = null;
  try {
    saved = storage?.getItem(NAME_KEY);
  } catch {
    // storage unavailable (private mode, blocked site data)
  }
  return finalName(saved, defaultName(random));
}

export function saveName(storage, name) {
  try {
    storage?.setItem(NAME_KEY, name);
  } catch {
    // storage unavailable
  }
}
