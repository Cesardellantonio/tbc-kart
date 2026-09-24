// Trackside "TV camera" positions for the title screen: every ~22 m, beyond the barriers,
// preferring the outside of the corner for the classic broadcast angle.

export function broadcastAnchors(path, spacing = 22, offset = 9, height = 5.2) {
  const anchors = [];
  const step = Math.max(1, Math.round(spacing / path.spacing));
  for (let i = 0; i < path.count; i += step) {
    const outside = path.curvature[i] > 0 ? -1 : 1; // + curvature turns right → outside is left
    for (const side of [outside, -outside]) {
      const p = path.offset(i, side * offset);
      if (!path.within(p.x, p.z, offset - 0.5)) {
        anchors.push({ x: p.x, y: height, z: p.z });
        break;
      }
    }
  }
  return anchors;
}
