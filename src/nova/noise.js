// Seeded 2D value noise and fractal sums of it, for terrain, colour patches and scattering.

export function valueNoise(seed = 1) {
  const hash = (x, z) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const fade = (t) => t * t * (3 - 2 * t);
  // 0..1 at (x, z) in cells
  const noise = (x, z) => {
    const [x0, z0] = [Math.floor(x), Math.floor(z)];
    const [u, v] = [fade(x - x0), fade(z - z0)];
    const a = hash(x0, z0) + (hash(x0 + 1, z0) - hash(x0, z0)) * u;
    const b = hash(x0, z0 + 1) + (hash(x0 + 1, z0 + 1) - hash(x0, z0 + 1)) * u;
    return a + (b - a) * v;
  };
  // Fractal sum, -1..1 roughly, `octaves` layers at `scale` m for the first.
  noise.fbm = (x, z, scale, octaves = 4) => {
    let [sum, amp, f, norm] = [0, 1, 1 / scale, 0];
    for (let o = 0; o < octaves; o++) {
      sum += (noise(x * f + o * 17.3, z * f - o * 9.1) * 2 - 1) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };
  // Ridged: sharp crests (mountain ranges), 0..1.
  noise.ridge = (x, z, scale, octaves = 4) => {
    let [sum, amp, f, norm] = [0, 1, 1 / scale, 0];
    for (let o = 0; o < octaves; o++) {
      const n = 1 - Math.abs(noise(x * f + o * 31.7, z * f + o * 5.9) * 2 - 1);
      sum += n * n * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.1;
    }
    return sum / norm;
  };
  return noise;
}

// A stable number from a string (the track id seeds its planet).
export function seedOf(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
