// A racing line as a lateral offset per centreline sample (m, + = right): hug the inside of each
// corner, then smooth it so the kart swings out before the apex and runs wide on the exit.

export function racingLine(path, { lineGain, lineMax, lineSmooth }) {
  const n = path.count;
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = path.curvature[i] * lineGain; // + curvature = right turn = inside is to the right
    raw[i] = Math.max(-lineMax, Math.min(lineMax, v));
  }
  // Box blur twice ≈ gaussian; wraps around the closed loop.
  const half = Math.max(1, Math.round(lineSmooth / path.spacing));
  let line = raw;
  for (let pass = 0; pass < 2; pass++) {
    const out = new Float32Array(n);
    let sum = 0;
    for (let k = -half; k <= half; k++) sum += line[path.wrap(k)];
    for (let i = 0; i < n; i++) {
      out[i] = sum / (2 * half + 1);
      sum += line[path.wrap(i + half + 1)] - line[path.wrap(i - half)];
    }
    line = out;
  }
  const peak = line.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-6);
  const scale = Math.min(1, lineMax / peak) * 1.35; // blurring flattens apexes; restore some depth
  return line.map((v) => Math.max(-lineMax, Math.min(lineMax, v * scale)));
}
