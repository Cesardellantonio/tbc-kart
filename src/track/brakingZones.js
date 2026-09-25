// Where karts brake hard (pure): a point-mass lap chasing the computer drivers' own speed plan for
// the racing line (race/speedPlan: drivingPlan + plannedSpeed, as race/AiDriver uses it), pedals from
// race/speedControl, forces from physics/controls — and the stretches where it presses the brake
// firmly. The rivals and the autopilot are the karts the player watches, so the tyre marks go where
// they actually brake (well before the corner, not at the apex).

import { AUTOPILOT } from '../config/race.js';
import { MASS } from '../config/physics.js';
import { speedControl } from '../race/speedControl.js';
import { drivingPlan, plannedSpeed } from '../race/speedPlan.js';
import { pedals } from '../physics/controls.js';

// Mean brake pedal and speed per sample over a settled lap (the first lap only gets up to pace).
// line: the racing line (race/racingLine) the drivers follow.
export function brakeProfile(path, line, { dt = 1 / 60, laps = 2 } = {}) {
  const plan = drivingPlan(path, line);
  const drive = { ahead: AUTOPILOT.planAhead, maxSpeed: AUTOPILOT.maxSpeed };
  const n = path.count;
  const time = new Float32Array(n);
  const brake = new Float32Array(n);
  const speed = new Float32Array(n);
  let s = 0;
  let v = 5; // m/s rolling start; only the settled last lap is kept
  while (s < path.length * laps) {
    const i = path.wrap(Math.floor(s / path.spacing));
    const c = speedControl(v, plannedSpeed(plan, path, i, v, drive));
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
export function brakingZones(path, { minBrake, minDrop, mergeGap }, { brake, speed }) {
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
