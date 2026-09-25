// Which circuit to open with, and the per-track record signature. Pure: no DOM, no storage.

// A valid ?track=<id> (any case) wins, then the last track played, then the first in the list.
// `unknown` is the URL id when it names no track — it is reported, and must not overwrite the saved choice.
export function chooseTrack(urlId, savedId, tracks) {
  const find = (id) => (id ? tracks.find((t) => t.id === id.trim().toLowerCase()) : undefined);
  const fromUrl = find(urlId);
  return { track: fromUrl ?? find(savedId) ?? tracks[0], fromUrl: !!fromUrl, unknown: urlId && !fromUrl ? urlId : null };
}

// 32-bit FNV-1a over the numbers, rounded to the centimetre, as 8 hex digits.
function fnv(values) {
  let h = 0x811c9dc5;
  for (const v of values) {
    const n = Math.round(v * 100);
    for (let s = 0; s < 32; s += 8) h = Math.imul(h ^ ((n >>> s) & 0xff), 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// Identifies the geometry a saved record (best lap, splits, ghost) was set on: the ghost replays
// absolute world positions and the splits are indexed from the start line, so moving, mirroring,
// reversing, re-starting or re-widening the layout must invalidate it. The home track keeps its v2 form
// (`count:length`, geometry frozen by samples: 1000) so records saved before v3 stay valid.
export function recordSignature(track, path, startIndex) {
  const legacy = `${path.count}:${path.length.toFixed(1)}`;
  if (track.id === 'tbc') return legacy;
  return `${legacy}:${startIndex}:${(path.halfWidth * 2).toFixed(2)}:${fnv(track.waypoints.flat())}`;
}
