// Best lap, its split curve and its ghost, persisted in localStorage. Fails soft (private mode, quota, bad data).

import { STORAGE_KEY } from '../config/race.js';

const EMPTY = { best: null, splits: null, ghost: null };

// One record per track: the home track keeps the original key, the others get their own.
export const recordKey = (trackId) => (trackId === 'tbc' ? STORAGE_KEY : `${STORAGE_KEY}.${trackId}`);

// signature identifies the track geometry; records from a different layout are ignored.
export function loadRecord(signature, key = STORAGE_KEY) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (!raw || raw.signature !== signature || typeof raw.best !== 'number') return { ...EMPTY };
    const splits = Array.isArray(raw.splits) ? Float32Array.from(raw.splits, (v) => v ?? NaN) : null;
    const ghost = Array.isArray(raw.ghost) && raw.ghost.length % 4 === 0 && raw.ghost.every(Number.isFinite) ? raw.ghost : null;
    return { best: raw.best, splits, ghost };
  } catch {
    return { ...EMPTY };
  }
}

export function saveRecord(signature, best, splits, ghost = null, key = STORAGE_KEY) {
  try {
    const packed = splits ? Array.from(splits, (v) => (Number.isNaN(v) ? null : Math.round(v * 1000) / 1000)) : null;
    localStorage.setItem(key, JSON.stringify({ signature, best, splits: packed, ghost }));
  } catch {
    // storage unavailable — best lap simply isn't remembered
  }
}
