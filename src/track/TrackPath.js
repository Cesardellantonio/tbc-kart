// Samples the closed track centreline once and answers geometry queries for every system.

import * as THREE from 'three';

export class TrackPath {
  constructor(waypoints, { samples, width, spline = 'centripetal' }) {
    const points = waypoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(points, true, spline);
    const n = samples;
    this.count = n;
    this.length = curve.getLength();
    this.spacing = this.length / n;
    this.halfWidth = width / 2;
    [this.x, this.z] = [new Float32Array(n), new Float32Array(n)];
    [this.tx, this.tz] = [new Float32Array(n), new Float32Array(n)]; // unit tangent (travel direction)
    this.curvature = new Float32Array(n); // signed 1/radius, + = turning right

    const [p, t] = [new THREE.Vector3(), new THREE.Vector3()];
    for (let i = 0; i < n; i++) {
      curve.getPointAt(i / n, p);
      curve.getTangentAt(i / n, t);
      const len = Math.hypot(t.x, t.z) || 1;
      [this.x[i], this.z[i], this.tx[i], this.tz[i]] = [p.x, p.z, t.x / len, t.z / len];
    }
    for (let i = 0; i < n; i++) {
      const a = this.wrap(i - 3);
      const b = this.wrap(i + 3);
      const cross = this.tx[a] * this.tz[b] - this.tz[a] * this.tx[b];
      this.curvature[i] = Math.asin(Math.max(-1, Math.min(1, cross))) / (6 * this.spacing);
    }
  }

  wrap(i) {
    return ((i % this.count) + this.count) % this.count;
  }

  // Point `offset` metres to the right of sample i (negative = left).
  offset(i, offset, out = {}) {
    out.x = this.x[i] - this.tz[i] * offset;
    out.z = this.z[i] + this.tx[i] * offset;
    return out;
  }

  // Signed distance of (x, z) to the right of the centreline at sample i.
  lateral(x, z, i) {
    return (x - this.x[i]) * -this.tz[i] + (z - this.z[i]) * this.tx[i];
  }

  // Nearest sample. With a hint, searches a local window first (stable on close-running legs).
  nearest(x, z, hint = -1, window = 80) {
    let best = -1;
    let bestD = Infinity;
    const scan = (from, to) => {
      for (let k = from; k <= to; k++) {
        const i = this.wrap(k);
        const d = (this.x[i] - x) ** 2 + (this.z[i] - z) ** 2;
        if (d < bestD) [best, bestD] = [i, d];
      }
    };
    if (hint >= 0) scan(hint - window, hint + window);
    if (best < 0 || bestD > (this.halfWidth * 3) ** 2) scan(0, this.count - 1);
    return best;
  }

  // True if (x, z) lies within `radius` of any centreline sample.
  within(x, z, radius) {
    const r2 = radius * radius;
    for (let i = 0; i < this.count; i++) {
      if ((this.x[i] - x) ** 2 + (this.z[i] - z) ** 2 < r2) return true;
    }
    return false;
  }

  heading(i) {
    return Math.atan2(-this.tx[i], -this.tz[i]);
  }
}
