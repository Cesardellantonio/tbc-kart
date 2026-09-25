// Circle-vs-segment collisions against barrier faces, looked up through a uniform grid.

const key = (cx, cz) => (cx + 4096) * 8192 + (cz + 4096);

export class BarrierCollider {
  // runs: arrays of {x, z} points along barrier faces (run.closed marks a full loop)
  constructor(runs, cellSize) {
    this.cell = cellSize;
    this.segs = [];
    this.grid = new Map();
    this.contact = { x: 0, z: 0, nx: 0, nz: 0 };
    for (const run of runs) {
      const last = run.closed ? run.length : run.length - 1;
      for (let k = 0; k < last; k++) {
        const a = run[k];
        const b = run[(k + 1) % run.length];
        this._insert(a.x, a.z, b.x, b.z);
      }
    }
    this._stamp = new Uint32Array(this.segs.length / 4); // de-duplicates segments across grid cells
    this._frame = 0;
  }

  _insert(ax, az, bx, bz) {
    const id = this.segs.length / 4;
    this.segs.push(ax, az, bx, bz);
    const c = this.cell;
    for (let cx = Math.floor(Math.min(ax, bx) / c); cx <= Math.floor(Math.max(ax, bx) / c); cx++) {
      for (let cz = Math.floor(Math.min(az, bz) / c); cz <= Math.floor(Math.max(az, bz) / c); cz++) {
        const k = key(cx, cz);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(id);
      }
    }
  }

  // Pushes `body` ({x, z, vx, vz}) out of any barrier and bounces its velocity.
  // Returns the strongest impact speed into a wall (m/s); `contact` holds where it happened.
  // friction: sliding friction coefficient of the barrier face (Coulomb): the along-wall speed lost is
  // friction × the normal speed change, so a glancing brush costs little and a hard hit or a kart
  // pressed along the wall (wall-riding) costs a lot.
  resolve(body, radius, restitution, friction) {
    this._frame++;
    let impact = 0;
    const cx0 = Math.floor(body.x / this.cell);
    const cz0 = Math.floor(body.z / this.cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.grid.get(key(cx0 + dx, cz0 + dz));
        if (!list) continue;
        for (const id of list) {
          if (this._stamp[id] === this._frame) continue;
          this._stamp[id] = this._frame;
          impact = Math.max(impact, this._collide(id * 4, body, radius, restitution, friction));
        }
      }
    }
    return impact;
  }

  _collide(o, body, radius, restitution, friction) {
    const s = this.segs;
    const abx = s[o + 2] - s[o];
    const abz = s[o + 3] - s[o + 1];
    const t = Math.max(0, Math.min(1, ((body.x - s[o]) * abx + (body.z - s[o + 1]) * abz) / (abx * abx + abz * abz || 1e-9)));
    const qx = s[o] + abx * t;
    const qz = s[o + 1] + abz * t;
    const d = Math.hypot(body.x - qx, body.z - qz);
    if (d >= radius || d < 1e-6) return 0;
    const [nx, nz] = [(body.x - qx) / d, (body.z - qz) / d];
    [body.x, body.z] = [qx + nx * radius, qz + nz * radius];
    const vn = body.vx * nx + body.vz * nz;
    if (vn >= 0) return 0;
    const [tx0, tz0] = [body.vx - vn * nx, body.vz - vn * nz];
    const vt = Math.hypot(tx0, tz0);
    const keep = vt > 1e-9 ? Math.max(0, 1 - (friction * (1 + restitution) * -vn) / vt) : 0;
    const tx = tx0 * keep;
    const tz = tz0 * keep;
    body.vx = tx - vn * restitution * nx;
    body.vz = tz - vn * restitution * nz;
    Object.assign(this.contact, { x: qx, z: qz, nx, nz });
    return -vn;
  }
}
