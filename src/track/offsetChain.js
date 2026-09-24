// Clean offset polylines along the track (for barriers): cuts the loops that form on the
// inside of tight corners and drops any point that would intrude onto the driving surface.

const EPS = 1e-9;

function intersect(ax, az, bx, bz, cx, cz, dx, dz) {
  const rX = bx - ax, rZ = bz - az, sX = dx - cx, sZ = dz - cz;
  const den = rX * sZ - rZ * sX;
  if (Math.abs(den) < EPS) return null;
  const t = ((cx - ax) * sZ - (cz - az) * sX) / den;
  const u = ((cx - ax) * rZ - (cz - az) * rX) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: ax + rX * t, z: az + rZ * t };
}

// Remove local self-intersection loops (swallowtails) from a closed polyline.
function removeLoops(pts, window) {
  const n = pts.length;
  const out = [];
  let i = 0;
  while (i < n) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push(a);
    let jumped = false;
    for (let j = i + 2; j < Math.min(i + window, n - 1); j++) {
      const c = pts[j];
      const d = pts[(j + 1) % n];
      const hit = intersect(a.x, a.z, b.x, b.z, c.x, c.z, d.x, d.z);
      if (hit) {
        out.push({ ...hit, i: a.i });
        i = j + 1;
        jumped = true;
        break;
      }
    }
    if (!jumped) i++;
  }
  return out;
}

// Returns an array of runs (arrays of {x, z, i}); a single run with `closed: true` when unbroken.
export function offsetChain(path, offset, clearance, window = 90) {
  const raw = [];
  for (let i = 0; i < path.count; i++) raw.push({ ...path.offset(i, offset), i });
  const clean = removeLoops(raw, window);
  const runs = [];
  let run = [];
  for (const p of clean) {
    if (!path.within(p.x, p.z, clearance)) run.push(p);
    else if (run.length) (runs.push(run), (run = []));
  }
  if (run.length) runs.push(run);
  if (runs.length === 1 && runs[0].length === clean.length) runs[0].closed = true;
  else if (runs.length > 1 && runs[0][0] === clean[0] && run.length && run.at(-1) === clean.at(-1)) {
    runs[0] = runs.pop().concat(runs[0]); // join the run that wraps past index 0
  }
  return runs;
}
