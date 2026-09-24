// What one driver sees of the others (pure): distance ahead along the track, lateral position, speed.

// others: [{ state: {x, z}, index, speed }]; me: { index }. Returns [{ ahead, lateral, speed }].
export function trafficFor(path, me, others) {
  const n = path.count;
  return others.map((o) => {
    let d = o.index - me.index;
    d = d > n / 2 ? d - n : d < -n / 2 ? d + n : d;
    return { ahead: d * path.spacing, lateral: path.lateral(o.state.x, o.state.z, o.index), speed: o.speed };
  });
}
