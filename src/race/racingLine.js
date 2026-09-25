// A racing line as a lateral offset per centreline sample (m, + = right): the least-curved path that
// stays inside the usable width. Minimising curvature is what widens a corner, so the line comes out
// outside–inside–outside (turn in from the outside, clip the apex, run out to the edge) and a shallow
// chicane is straightened instead of followed kink by kink.

import { AI } from '../config/race.js';

// opts: { lineEdge (m kept in from the asphalt edge), lineMax (m, cap either side of the centre) }
export function racingLine(path, { lineEdge, lineMax }) {
  const n = path.count;
  const lim = Math.max(0, Math.min(lineMax, path.halfWidth - lineEdge));
  let line = new Float64Array(n);
  // Coarse to fine: solve on control points LEVELS[k] metres apart, starting each level from the
  // previous one, so whole corners move together before the detail is settled.
  for (const step of LEVELS) {
    const m = Math.max(8, Math.round(path.length / step));
    const at = Array.from({ length: m }, (_, k) => Math.round((k * n) / m) % n);
    const d = Float64Array.from(at, (i) => line[i]);
    const [px, pz] = [new Float64Array(m), new Float64Array(m)];
    const put = (k) => {
      const i = at[k];
      [px[k], pz[k]] = [path.x[i] - path.tz[i] * d[k], path.z[i] + path.tx[i] * d[k]];
    };
    for (let k = 0; k < m; k++) put(k);
    const w = (k) => (k + m) % m;
    for (let it = 0; it < ITERATIONS; it++) {
      for (let k = 0; k < m; k++) {
        // Where the smooth curve through the neighbours passes (the cubic through the points one and
        // two steps either side, at the middle): zero change of curvature there.
        const [a, b, c, e] = [w(k - 2), w(k - 1), w(k + 1), w(k + 2)];
        const cx = (4 * (px[b] + px[c]) - px[a] - px[e]) / 6;
        const cz = (4 * (pz[b] + pz[c]) - pz[a] - pz[e]) / 6;
        const want = path.lateral(cx, cz, at[k]);
        d[k] = Math.max(-lim, Math.min(lim, d[k] + RELAX * (want - d[k])));
        put(k);
      }
    }
    line = spread(d, at, n);
  }
  return Float32Array.from(line);
}

const LEVELS = [8, 4, 2, 1]; // m between control points, per pass
const ITERATIONS = 300; // relaxation sweeps per level
const RELAX = 0.4; // step toward the smooth curve per sweep (≤ 0.5 keeps the fourth-order sweep stable)

// Control-point offsets back onto every centreline sample (linear between control points).
function spread(d, at, n) {
  const out = new Float64Array(n);
  const m = at.length;
  for (let k = 0; k < m; k++) {
    const [i0, i1] = [at[k], at[(k + 1) % m]];
    const span = (i1 - i0 + n) % n || n;
    for (let j = 0; j < span; j++) out[(i0 + j) % n] = d[k] + ((d[(k + 1) % m] - d[k]) * j) / span;
  }
  return out;
}

// A driver's own offset from the line (m), faded out where the road between sample `from` and `look`
// samples ahead bends (gone at radius ≤ AI.lineTaper m): it changes where the driver sits on the
// straights, never the length of a corner, so it is not a hidden pace setting.
export function preferredOffset(path, from, look, offset) {
  let bend = 0;
  for (let d = 0; d <= look; d += 3) bend = Math.max(bend, Math.abs(path.curvature[path.wrap(from + d)]));
  return offset * Math.max(0, Math.min(1, 1 - bend * AI.lineTaper));
}
