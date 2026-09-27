// TBC Kart NOVA's generated worlds (pure parts): every circuit has a complete planet, the distance
// field the terrain is shaped by is right, the noise is seeded, and Node runs the classic edition.

import { describe, it, expect } from 'vitest';
import { PLANETS, planetOf } from '../src/config/planets.js';
import { EDITION, NOVA } from '../src/config/edition.js';
import { ALL_TRACKS } from '../src/tracks/index.js';
import { pathOf } from '../src/track/validate.js';
import { trackDistance } from '../src/nova/trackDistance.js';
import { valueNoise, seedOf } from '../src/nova/noise.js';

const colour = (c) => Number.isInteger(c) && c >= 0 && c <= 0xffffff;

describe('NOVA planets', () => {
  it('give every circuit a complete world', () => {
    for (const t of ALL_TRACKS) {
      const p = PLANETS[t.id];
      expect(p, t.id).toBeTruthy();
      for (const k of ['name', 'system', 'blurb']) expect(typeof p[k], `${t.id}.${k}`).toBe('string');
      for (const c of [...p.sky, p.haze[0], p.sun[0], ...p.ground, p.apron, p.rock, ...p.flora, p.crystal, p.accent]) expect(colour(c), t.id).toBe(true);
      expect(p.haze[1]).toBeGreaterThan(0);
      expect(p.sun[2]).toHaveLength(3);
      expect(p.peaks).toBeGreaterThan(0);
      for (const k of ['trees', 'crystals', 'rocks', 'floaters']) expect(p.density[k]).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(Object.values(PLANETS).map((p) => p.name)).size).toBe(Object.keys(PLANETS).length);
    expect(planetOf('nowhere')).toBe(PLANETS.tbc);
  });

  it('leave the classic game (and Node) alone', () => {
    expect(EDITION).toBe('classic');
    expect(NOVA).toBe(false);
    expect(ALL_TRACKS.find((t) => t.id === 'silverstone').name).not.toBe(PLANETS.silverstone.name);
  });
});

describe('NOVA ground', () => {
  const path = pathOf(ALL_TRACKS[0]);
  let [minX, maxX, minZ, maxZ] = [Infinity, -Infinity, Infinity, -Infinity];
  for (let i = 0; i < path.count; i++) {
    [minX, maxX] = [Math.min(minX, path.x[i]), Math.max(maxX, path.x[i])];
    [minZ, maxZ] = [Math.min(minZ, path.z[i]), Math.max(maxZ, path.z[i])];
  }
  const area = { minX: minX - 30, minZ: minZ - 30, width: maxX - minX + 60, depth: maxZ - minZ + 60 };
  const dist = trackDistance(path, area, 2);

  it('measures the distance to the centreline: ~0 on it, growing away from it', () => {
    for (let i = 0; i < path.count; i += 97) expect(dist(path.x[i], path.z[i])).toBeLessThan(1.5);
    const far = dist(maxX + 20, (minZ + maxZ) / 2);
    expect(far).toBeGreaterThan(18);
    expect(dist(maxX + 80, (minZ + maxZ) / 2)).toBeGreaterThan(far + 55); // beyond the grid too
  });

  it('seeds its noise from the track id: the same world every visit', () => {
    const [a, b] = [valueNoise(seedOf('spa')), valueNoise(seedOf('spa'))];
    const c = valueNoise(seedOf('monza'));
    const xs = [0.3, 17.2, -41.9, 250.5];
    expect(xs.map((x) => a.fbm(x, x * 0.7, 30))).toEqual(xs.map((x) => b.fbm(x, x * 0.7, 30)));
    expect(xs.map((x) => a.fbm(x, x * 0.7, 30))).not.toEqual(xs.map((x) => c.fbm(x, x * 0.7, 30)));
    for (const x of xs) {
      expect(Math.abs(a.fbm(x, -x, 20))).toBeLessThanOrEqual(1);
      expect(a.ridge(x, x, 50)).toBeGreaterThanOrEqual(0);
    }
  });
});
