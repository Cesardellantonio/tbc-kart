// Best lap, its split curve and its ghost, persisted in localStorage. Fails soft (private mode, quota, bad data).

import { STORAGE_KEY } from '../config/race.js';

const EMPTY = { best: null, splits: null, ghost: null };

// signature identifies the track geometry; records from a different layout are ignored.
export function loadRecord(signature) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || raw.signature !== signature || typeof raw.best !== 'number') return { ...EMPTY };
    const splits = Array.isArray(raw.splits) ? Float32Array.from(raw.splits, (v) => v ?? NaN) : null;
    const ghost = Array.isArray(raw.ghost) && raw.ghost.length % 4 === 0 && raw.ghost.every(Number.isFinite) ? raw.ghost : null;
    return { best: raw.best, splits, ghost };
  } catch {
    return { ...EMPTY };
  }
}

export function saveRecord(signature, best, splits, ghost = null) {
  try {
    const packed = splits ? Array.from(splits, (v) => (Number.isNaN(v) ? null : Math.round(v * 1000) / 1000)) : null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, best, splits: packed, ghost }));
  } catch {
    // storage unavailable — best lap simply isn't remembered
  }
}
