// Distance from any ground point to the circuit's centreline, on a coarse grid: the centreline is
// rasterised, then a two-pass chamfer transform spreads the distance over the grid (fast enough for
// 400 × 400 cells). Terrain stays flat near the track and rises away from it; nothing grows on it.

// path: TrackPath; area: { minX, minZ, width, depth }; cell: m. Returns at(x, z) → m (bilinear).
export function trackDistance(path, area, cell) {
  const cols = Math.ceil(area.width / cell) + 1;
  const rows = Math.ceil(area.depth / cell) + 1;
  const d = new Float32Array(cols * rows).fill(1e9);
  for (let i = 0; i < path.count; i++) {
    const c = Math.round((path.x[i] - area.minX) / cell);
    const r = Math.round((path.z[i] - area.minZ) / cell);
    if (c >= 0 && r >= 0 && c < cols && r < rows) d[r * cols + c] = 0;
  }
  const [a, b] = [cell, cell * Math.SQRT2];
  const relax = (k, j, w) => {
    if (d[j] + w < d[k]) d[k] = d[j] + w;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (c > 0) relax(k, k - 1, a);
      if (r > 0) {
        relax(k, k - cols, a);
        if (c > 0) relax(k, k - cols - 1, b);
        if (c < cols - 1) relax(k, k - cols + 1, b);
      }
    }
  }
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      const k = r * cols + c;
      if (c < cols - 1) relax(k, k + 1, a);
      if (r < rows - 1) {
        relax(k, k + cols, a);
        if (c < cols - 1) relax(k, k + cols + 1, b);
        if (c > 0) relax(k, k + cols - 1, b);
      }
    }
  }
  return (x, z) => {
    const fc = Math.min(cols - 1.001, Math.max(0, (x - area.minX) / cell));
    const fr = Math.min(rows - 1.001, Math.max(0, (z - area.minZ) / cell));
    const [c, r] = [Math.floor(fc), Math.floor(fr)];
    const [u, v] = [fc - c, fr - r];
    const k = r * cols + c;
    const top = d[k] + (d[k + 1] - d[k]) * u;
    const bottom = d[k + cols] + (d[k + cols + 1] - d[k + cols]) * u;
    const inside = top + (bottom - top) * v;
    // Outside the grid: add the distance beyond its edge
    const out = Math.hypot(Math.max(0, area.minX - x, x - (area.minX + area.width)), Math.max(0, area.minZ - z, z - (area.minZ + area.depth)));
    return inside + out;
  };
}
