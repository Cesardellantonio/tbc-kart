// Which on-screen buttons are held (pure): each point (a finger on the screen) holds the button it is
// on — grown by `slop` px, nearest centre winning — so the answer depends only on where the fingers are
// now, never on remembering which finger went down where.

// rects: [{ name, left, top, right, bottom }]; points: [[x, y]]. Returns a Set of names.
export function heldFrom(points, rects, slop) {
  const held = new Set();
  for (const [x, y] of points) {
    let best = null;
    let bestD = Infinity;
    for (const r of rects) {
      if (!(r.right > r.left) || x < r.left - slop || x > r.right + slop || y < r.top - slop || y > r.bottom + slop) continue;
      const d = (x - (r.left + r.right) / 2) ** 2 + (y - (r.top + r.bottom) / 2) ** 2;
      if (d < bestD) [best, bestD] = [r.name, d];
    }
    if (best) held.add(best);
  }
  return held;
}
