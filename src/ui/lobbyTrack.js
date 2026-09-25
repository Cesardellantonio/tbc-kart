// The lobby's track thumbnail: the circuit chosen by the host, drawn like the title card's picker.
// The lobby only knows a track id, so it builds (and keeps) that circuit's centreline itself.

import { trackById } from '../tracks/index.js';
import { pathOf } from '../track/validate.js';
import { drawTrackMap } from './trackMap.js';
import { setText } from './dom.js';

const MAP = [168, 112]; // thumbnail size, CSS px (same as the title card's picker)
const cache = new Map(); // track id → { path, startIndex }: a centreline takes a few ms to sample

function geometry(track) {
  if (!cache.has(track.id)) {
    const path = pathOf(track);
    cache.set(track.id, { path, startIndex: path.nearest(...track.waypoints[track.startIndex]) });
  }
  return cache.get(track.id);
}

// canvas + name / facts elements; id: a track id (or a track object with an id).
export function drawLobbyTrack(canvas, name, facts, id) {
  const track = trackById(typeof id === 'object' && id ? id.id : id);
  const { path, startIndex } = geometry(track);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = MAP[0] * dpr;
  canvas.height = MAP[1] * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  drawTrackMap(g, path, startIndex, MAP[0], MAP[1], 12, { band: 0.22, line: 0.9, minBand: 5 });
  setText(name, track.name.toUpperCase());
  setText(
    facts,
    `${track.location.toUpperCase()} · ${Math.round(path.length)}\u00a0M · ${track.laps}\u00a0LAPS` // wraps between facts only
  );
}
