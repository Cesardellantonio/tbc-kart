// Where karts brake hard (pure): a point-mass lap driven by the same rule as the computer drivers
// (race/AiDriver, race/Autopilot) — target speed from the tightest curvature in the next
// 8 + 1.4·v metres, pedals from race/speedControl, forces from physics/controls — and the stretches
// where it presses the brake firmly. The rivals and the autopilot are the karts the player watches,
// so the tyre marks go where they actually brake (well before the corner, not at the apex).

import { AUTOPILOT } from '../config/race.js';
import { MASS } from '../config/physics.js';
import { speedControl } from '../race/speedControl.js';
import { pedals } from '../physics/controls.js';

// Target speed the drivers aim for at sample i travelling at `speed` (m/s).
export function driverTarget(path, i, speed, drive = AUTOPILOT) {
  let k = 0;
  const span = Math.round((8 + speed * 1.4) / path.spacing);
  for (let d = 0; d < span; d += 3) k = Math.max(k, Math.abs(path.curvature[path.wrap(i + d)]));
  return Math.min(Math.max(Math.sqrt(drive.latAccel / Math.max(k, 1e-4)), drive.minSpeed), drive.maxSpeed);
}

// Mean brake pedal and speed per sample over a settled lap (the first lap only gets up to pace).
export function brakeProfile(path, { dt = 1 / 60, laps = 2 } = {}) {
  const n = path.count;
  const time = new Float32Array(n);
  const brake = new Float32Array(n);
  const speed = new Float32Array(n);
  let s = 0;
  let v = AUTOPILOT.minSpeed;
  while (s < path.length * laps) {
    const i = path.wrap(Math.floor(s / path.spacing));
    const c = speedControl(v, driverTarget(path, i, v));
    const p = pedals(v, c);
    v = Math.max(0.5, v + ((p.drive - p.brake) / MASS - p.resist) * dt);
    s += v * dt;
    if (s < path.length * (laps - 1)) continue;
    [time[i], brake[i], speed[i]] = [time[i] + dt, brake[i] + c.brake * dt, speed[i] + v * dt];
  }
  for (let i = 0; i < n; i++) if (time[i]) [brake[i], speed[i]] = [brake[i] / time[i], speed[i] / time[i]];
  for (let i = 0; i < n; i++) if (!time[i]) [brake[i], speed[i]] = [brake[path.wrap(i - 1)], speed[path.wrap(i - 1)]]; // stepped over at speed
  return { brake, speed };
}

// Returns [{ start, end, drop, peak }]: sample indices where a braking run starts and ends (short
// coasting gaps, where the pedal hunts around the target, are bridged), m/s lost and the peak pedal.
export function brakingZones(path, { minBrake, minDrop, mergeGap }, { brake, speed } = brakeProfile(path)) {
  const n = path.count;
  const at = (i) => brake[path.wrap(i)];
  let first = 0;
  while (first < n && at(first) > 0) first++;
  if (first === n) return [];
  const gap = Math.round(mergeGap / path.spacing);
  const zones = [];
  for (let k = first + 1; k < first + n; k++) {
    if (!(at(k) > 0)) continue;
    let [end, peak] = [k, 0];
    for (let j = k; j < first + n && j - end <= gap; j++) if (at(j) > 0) [end, peak] = [j, Math.max(peak, at(j))];
    const drop = speed[path.wrap(k)] - speed[path.wrap(end + 1)];
    if (peak >= minBrake && drop >= minDrop) zones.push({ start: path.wrap(k), end: path.wrap(end), drop, peak });
    k = end;
  }
  return zones;
}

// Sample indices from a to b walking forward around the loop.
export function spanIndices(path, a, b) {
  const out = [];
  for (let i = a; ; i = path.wrap(i + 1)) {
    out.push(i);
    if (i === b || out.length >= path.count) return out;
  }
}
