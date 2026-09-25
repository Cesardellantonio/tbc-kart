// Where karts brake hard (pure): a lap speed profile from the track curvature — corner speed from
// the grip limit, a backward pass for braking, a forward pass for acceleration — and the stretches
// where that profile slows the kart by a real amount.

// Returns [{ start, end, drop }] — sample indices (end = turn-in, the slowest point) and m/s lost.
export function brakingZones(path, { latAccel, maxSpeed, decel, accel = 4, minDrop }) {
  const n = path.count;
  const ds = path.spacing;
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = Math.min(maxSpeed, Math.sqrt(latAccel / Math.max(Math.abs(path.curvature[i]), 1e-4)));
  for (let lap = 0; lap < 2; lap++) {
    for (let i = n - 1; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[path.wrap(i + 1)] ** 2 + 2 * decel * ds));
    for (let i = 0; i < n; i++) v[i] = Math.min(v[i], Math.sqrt(v[path.wrap(i - 1)] ** 2 + 2 * accel * ds));
  }
  const braking = (i) => v[path.wrap(i + 1)] < v[i] - 1e-4;
  let first = 0;
  while (first < n && braking(first)) first++;
  if (first === n) return [];
  const zones = [];
  for (let k = 1; k <= n; k++) {
    const i = path.wrap(first + k);
    if (!braking(i)) continue;
    let end = i;
    let steps = 0;
    while (braking(end) && steps++ < n) end = path.wrap(end + 1);
    const drop = v[i] - v[end];
    if (drop >= minDrop) zones.push({ start: i, end, drop });
    k += steps;
  }
  return zones;
}

// Sample indices from a to b walking forward around the loop.
export function spanIndices(path, a, b) {
  const out = [];
  for (let i = a; ; i = path.wrap(i + 1)) {
    out.push(i);
    if (i === b || out.length >= path.count) return out;
  }
}
