// Small pure math helpers shared across modules. No THREE dependency.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

// Frame-rate independent exponential smoothing toward `target`.
export const damp = (current, target, rate, dt) => lerp(current, target, 1 - Math.exp(-rate * dt));

export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const dampAngle = (current, target, rate, dt) =>
  current + wrapAngle(target - current) * (1 - Math.exp(-rate * dt));

// Kart convention: yaw = 0 faces -Z (Three.js forward); positive yaw turns left.
export function forwardFromYaw(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

// Unit vector to the kart's right-hand side.
export function rightFromYaw(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

// Heading (yaw) that faces along direction (dx, dz).
export const yawFromDirection = (dx, dz) => Math.atan2(-dx, -dz);

// Deterministic pseudo-random generator (mulberry32) for procedural textures.
export function seededRandom(seed = 1) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
