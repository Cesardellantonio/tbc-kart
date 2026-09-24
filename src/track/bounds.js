// Axis-aligned bounds of point runs, grown by a margin (used to size the venue around the track).

export function boundsOf(runs, margin = 0) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const run of runs) {
    for (const p of run) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
  }
  minX -= margin;
  maxX += margin;
  minZ -= margin;
  maxZ += margin;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
  };
}

// Closed rectangle just inside the walls — a last-resort collider so nothing leaves the hall.
export function wallLoop(b, inset = 0.5) {
  const loop = [
    { x: b.minX + inset, z: b.minZ + inset },
    { x: b.maxX - inset, z: b.minZ + inset },
    { x: b.maxX - inset, z: b.maxZ - inset },
    { x: b.minX + inset, z: b.maxZ - inset },
  ];
  loop.closed = true;
  return loop;
}
