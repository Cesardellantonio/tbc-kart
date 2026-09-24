// Draws a track outline into a 2D canvas context (north up), for the minimap and the track picker.
// Returns map(x, z) → [px, py] for plotting karts on top.

export function drawTrackMap(g, path, startIndex, w, h, pad, { band = 0.16, line = 0.7, minBand = 4 } = {}) {
  let [minX, maxX, minZ, maxZ] = [Infinity, -Infinity, Infinity, -Infinity];
  for (let i = 0; i < path.count; i++) {
    minX = Math.min(minX, path.x[i]);
    maxX = Math.max(maxX, path.x[i]);
    minZ = Math.min(minZ, path.z[i]);
    maxZ = Math.max(maxZ, path.z[i]);
  }
  const scale = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxZ - minZ));
  const ox = (w - (maxX - minX) * scale) / 2;
  const oy = (h - (maxZ - minZ) * scale) / 2;
  const map = (x, z) => [ox + (x - minX) * scale, oy + (z - minZ) * scale];

  g.lineJoin = g.lineCap = 'round';
  g.beginPath();
  const step = Math.max(1, Math.round(path.count / 600));
  for (let i = 0; i < path.count; i += step) g.lineTo(...map(path.x[i], path.z[i]));
  g.closePath();
  g.strokeStyle = `rgba(255,255,255,${band})`;
  g.lineWidth = Math.max(minBand, path.halfWidth * 2 * scale);
  g.stroke();
  g.strokeStyle = `rgba(255,255,255,${line})`;
  g.lineWidth = 1.4;
  g.stroke();

  // Start line across the track + a small arrow showing the direction of travel.
  const [sx, sy] = map(path.x[startIndex], path.z[startIndex]);
  const a = Math.atan2(path.tz[startIndex], path.tx[startIndex]);
  g.save();
  g.translate(sx, sy);
  g.rotate(a);
  g.fillStyle = '#ffffff';
  g.fillRect(-1.5, -6, 3, 12);
  g.fillStyle = '#ffc21a';
  g.beginPath();
  g.moveTo(14, 0);
  g.lineTo(7, -4);
  g.lineTo(7, 4);
  g.closePath();
  g.fill();
  g.restore();
  return map;
}
