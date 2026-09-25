// A computer driver's speed plan (pure): target speed per centreline sample at skill 1. Corner speed
// comes from the curvature of the line actually driven — measured across a chord, the way the
// pure-pursuit steering sees it, so a quick flick is not mistaken for a hairpin — then a backward
// pass brakes for each corner as late as the rear brakes allow. Every speed scales with √skill.

import { AUTOPILOT } from '../config/race.js';

const cache = new WeakMap(); // line array → plan (every rival on a track shares one)

// line: lateral offset per sample (m, + = right). opts: { latAccel, decel (m/s²), maxSpeed, chord (m, or
// s of travel when chordMin / chordMax (m) are given) }
export function speedPlan(path, line, { latAccel, decel, chord, chordMin, chordMax, maxSpeed }) {
  const key = `${latAccel}/${decel}/${chord}/${chordMin}/${chordMax}/${maxSpeed}`;
  const hit = cache.get(line);
  if (hit?.key === key) return hit.plan;
  const n = path.count;
  const px = new Float64Array(n);
  const pz = new Float64Array(n);
  for (let i = 0; i < n; i++)
    [px[i], pz[i]] = [path.x[i] - path.tz[i] * line[i], path.z[i] + path.tx[i] * line[i]];
  // Chord: `chord` seconds of travel at the corner's own speed, within [chordMin, chordMax] metres —
  // pure pursuit rounds off a fast flick far more than a slow hairpin.
  const [cMin, cMax] = [chordMin ?? chord, chordMax ?? chord];
  const plan = new Float32Array(n).fill(maxSpeed);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const c = cMin === cMax ? cMin : Math.min(cMax, Math.max(cMin, plan[i] * chord));
      const h = Math.max(2, Math.round(c / path.spacing));
      const k = circleCurvature(px, pz, path.wrap(i - h), i, path.wrap(i + h));
      plan[i] = Math.min(maxSpeed, Math.sqrt(latAccel / Math.max(k, 1e-4)));
    }
  }
  for (let lap = 0; lap < 2; lap++) {
    for (let i = n - 1; i >= 0; i--) {
      const j = path.wrap(i + 1);
      plan[i] = Math.min(
        plan[i],
        Math.sqrt(plan[j] ** 2 + 2 * decel * Math.hypot(px[j] - px[i], pz[j] - pz[i]))
      );
    }
  }
  cache.set(line, { key, plan });
  return plan;
}

// 1/radius of the circle through three points (unsigned).
function circleCurvature(x, z, a, b, c) {
  const ab = Math.hypot(x[b] - x[a], z[b] - z[a]);
  const bc = Math.hypot(x[c] - x[b], z[c] - z[b]);
  const ca = Math.hypot(x[a] - x[c], z[a] - z[c]);
  const cross = (x[b] - x[a]) * (z[c] - z[a]) - (z[b] - z[a]) * (x[c] - x[a]);
  return (2 * Math.abs(cross)) / Math.max(ab * bc * ca, 1e-9);
}

// Target speed now (m/s): the plan `ahead` seconds up the road, so the brakes come on in time, for a
// driver of this skill, never above maxSpeed.
export function plannedSpeed(plan, path, index, speed, { skill = 1, ahead, maxSpeed }) {
  const i = path.wrap(index + Math.round((speed * ahead) / path.spacing));
  return Math.min(plan[i] * Math.sqrt(skill), maxSpeed);
}

// The computer drivers' plan for a line, with the AUTOPILOT settings.
export const drivingPlan = (path, line) =>
  speedPlan(path, line, {
    latAccel: AUTOPILOT.latAccel,
    decel: AUTOPILOT.planDecel,
    chord: AUTOPILOT.planChord,
    chordMin: AUTOPILOT.planChordMin,
    chordMax: AUTOPILOT.planChordMax,
    maxSpeed: 99, // the straights are capped per driver, in plannedSpeed
  });
