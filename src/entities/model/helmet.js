// Full-face karting helmet: an egg-shaped shell cut higher at the chin bar than at the nape, a tinted
// visor wrapping the eyeport on two side pivots, a peak above it, vents, a livery stripe over the
// crown and the neck roll inside the lower edge. All parts sit on the shape in helmetShell.js.

import * as THREE from 'three';
import { gridSurface, solid, cap } from './shapes.js';
import { rod, mesh, v3 } from './primitives.js';
import { surface, elevationAt, at, hemY, radius, VISOR_AZ, visorTop, visorBottom } from './helmetShell.js';

const AZ = 28; // shell columns around
const ROWS = 11; // shell rows from crown to hem
const range = (n, a, b) => Array.from({ length: n + 1 }, (_, k) => a + ((b - a) * k) / n);

function shell(mat) {
  const azs = range(AZ - 1, -Math.PI, Math.PI - (2 * Math.PI) / AZ);
  const hem = azs.map((az) => elevationAt(az, hemY(az)));
  const rows = range(ROWS - 1, 1 / ROWS, 1).map((t) => azs.map((az, k) => surface(az, Math.PI / 2 - t * (Math.PI / 2 - hem[k]))));
  const g = gridSurface(rows, { wrap: true, out: (i, j) => rows[i][j] });
  const roll = rows[ROWS - 1].map((p) => p.clone().multiply(v3(0.9, 1, 0.9)).add(v3(0, -0.004, 0)));
  const neckRoll = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(roll, true), AZ, 0.016, 5, true);
  const lining = cap(roll, v3()); // closes the opening seen from below
  return [mesh(g, mat.helmet), mesh(cap(rows[0], v3()), mat.helmet), mesh(neckRoll, mat.trim), mesh(lining, mat.trim)];
}

// Raised panel over the shell: grid of (azimuth, height) → lifted `lift` above an inner copy.
function panel(us, ys, point, lift, base = 0.0008) {
  const grid = (h) => ys.map((y) => us.map((u) => point(u, y, h)));
  return solid(grid(lift), grid(base));
}

function visor(mat) {
  const us = range(14, -1, 1);
  const point = (u, v, lift) => at(u * VISOR_AZ, visorBottom(u) + (visorTop(u) - visorBottom(u)) * v, lift);
  const parts = [mesh(panel(us, range(3, 0, 1), point, 0.008), mat.visor)];
  parts[0].userData.small = true; // the shell under it casts the same shadow
  for (const s of [-1, 1]) { // pivot plates
    const [az, y] = [s * (VISOR_AZ + 0.04), (visorTop(1) + visorBottom(1)) / 2];
    parts.push(rod(at(az, y), at(az, y, 0.012), 0.021, mat.trim, 10, 0.017, false));
  }
  // Peak: a lip along the visor's top edge, standing proud at its lower edge
  const peakPt = (u, y, lift) => at(u * 0.55, visorTop(u * 0.55 / VISOR_AZ) + y, y < 0.01 ? lift : lift * 0.1);
  parts.push(mesh(panel(range(8, -1, 1), [0.003, 0.02], peakPt, 0.013), mat.helmet));
  return parts;
}

function stripe(mat) {
  const m0 = elevationAt(0, visorTop(0) + 0.045);
  const m1 = Math.PI - elevationAt(Math.PI, hemY(Math.PI) + 0.006);
  const rows = range(18, m0, m1).map((m) => {
    const w = 0.02 + 0.016 * (m / Math.PI); // widens toward the back
    return [-w, 0, w].map((x) => {
      const d = v3(x / radius(v3(0, Math.sin(m), -Math.cos(m))), Math.sin(m), -Math.cos(m)).normalize();
      return d.multiplyScalar(radius(d) + 0.0015);
    });
  });
  // Lower band round the back of the shell, just above the hem, meeting the centre stripe
  const band = range(12, 1.75, 2 * Math.PI - 1.75).map((az) => [0.014, 0.036].map((h) => at(az, hemY(az) + h, 0.0015)));
  const cols = band[0].map((_, j) => band.map((row) => row[j]));
  return [mesh(gridSurface(rows, { out: (i, j) => rows[i][j] }), mat.stripe),
    mesh(gridSurface(cols, { out: (i, j) => cols[i][j] }), mat.stripe)];
}

function vents(mat) {
  const slot = (az, y, w, h) => panel(range(4, az - w, az + w), [y - h, y + h], (a, yy, l) => at(a, yy, l), 0.005);
  const geos = [slot(-0.42, 0.118, 0.07, 0.008), slot(0.42, 0.118, 0.07, 0.008)];
  geos.push(slot(Math.PI - 0.5, 0.07, 0.12, 0.01), slot(-Math.PI + 0.5, 0.07, 0.12, 0.01)); // rear exhaust vents
  geos.push(slot(0, -0.086, 0.2, 0.012)); // chin vent
  return geos.map((g) => mesh(g, mat.trim));
}

// Helmet parts in helmet space (origin at the shell's centre); place the group on the head.
export function buildHelmet(mat) {
  const g = new THREE.Group();
  g.add(...shell(mat), ...visor(mat), ...stripe(mat), ...vents(mat));
  g.add(rod(v3(0, -0.2, 0.03), v3(0, -0.08, 0.01), 0.046, mat.trim, 8)); // neck in its balaclava
  return g;
}
