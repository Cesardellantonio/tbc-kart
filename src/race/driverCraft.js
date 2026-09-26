// What makes a computer driver race like a person (pure apart from the memos the driver keeps): no two
// corners taken quite alike, the odd mistake (more of them with a kart filling the mirrors), and a
// defensive move to cover the inside when someone is close behind into a corner.

import { AI } from '../config/race.js';

const cornerCache = new WeakMap(); // plan → corner map (every rival on a track shares one)

// For each centreline sample, the id of the corner being approached: the sample index of the next
// slow point of the speed plan (a local minimum well under the straight-line speed). A driver rolls
// how it takes a corner as it leaves the previous one.
export function cornerMap(plan, path) {
  const hit = cornerCache.get(plan);
  if (hit) return hit;
  const n = plan.length;
  const w = Math.max(1, Math.round(AI.cornerWindow / path.spacing));
  let top = 0;
  for (let i = 0; i < n; i++) top = Math.max(top, plan[i]);
  const apex = [];
  for (let i = 0; i < n; i++) {
    if (plan[i] > AI.cornerBelow * top) continue;
    let low = true;
    for (let d = -w; d <= w && low; d++) {
      const j = path.wrap(i + d);
      if (plan[j] < plan[i] || (plan[j] === plan[i] && j < i)) low = false;
    }
    if (low) apex.push(i);
  }
  const map = new Int32Array(n).fill(-1);
  if (apex.length) {
    let k = 0; // walking backwards from each apex, samples up to the previous apex approach it
    for (let a = apex.length - 1; a >= 0; a--) {
      const from = apex[(a - 1 + apex.length) % apex.length];
      for (let i = apex[a]; ; i = path.wrap(i - 1)) {
        map[i] = apex[a];
        if (i === path.wrap(from + 1) || ++k > n) break;
      }
    }
  }
  cornerCache.set(plan, map);
  return map;
}

// How this corner goes, as a multiplier on its planned speed: a little scatter every time (level.sigma),
// and now and then (level.mistakes, a chance per corner, × AI.pressureMistakes with a kart close behind)
// a real error — in too hot (brakes late, runs wide, loses the exit) or bottling it (brakes early).
export function rollCorner(level, pressured, random) {
  const scatter = (random() + random() + random() - 1.5) * 2 * (level.sigma ?? 0); // ~normal, sd = sigma
  const chance = (level.mistakes ?? 0) * (pressured ? AI.pressureMistakes : 1);
  if (random() >= chance) return { factor: 1 + scatter, mistake: null };
  const size = AI.mistakeMin + random() * (AI.mistakeMax - AI.mistakeMin);
  return random() < AI.mistakeHot ? { factor: 1 + size, mistake: 'hot' } : { factor: 1 - size, mistake: 'early' };
}

// A kart close behind me (and not dropping back): the one I am defending against, or null.
export function pressureFrom(traffic, myLat, speed) {
  let near = null;
  for (const o of traffic) {
    if (o.ahead >= -0.3 || o.ahead < -AI.defendBehind || Math.abs(o.lateral - myLat) > AI.defendLateral) continue;
    if (o.speed < speed - 1) continue;
    if (!near || o.ahead > near.ahead) near = o;
  }
  return near;
}

// Defending: with a kart close behind and a corner coming (inside: -1 left / +1 right / 0 straight),
// move once to cover the inside — decided once per corner, odds AI.defendOdds × the driver's aggression —
// hold it into the corner, then go back to the racing line. One move, no weaving: a cool-down follows.
// memo: { corner, side, hold, cool } kept by the driver. Returns the side covered (-1 / +1) or 0.
export function defending(memo, attacker, inside, corner, aggression, dt, random) {
  memo.hold = Math.max(0, (memo.hold ?? 0) - dt);
  memo.cool = Math.max(0, (memo.cool ?? 0) - dt);
  if (memo.hold > 0 && inside !== -memo.side) return memo.side;
  memo.side = 0;
  if (!attacker || !inside || memo.cool > 0 || memo.corner === corner) return 0;
  memo.corner = corner; // one decision per corner
  if (random() >= AI.defendOdds * aggression) return 0;
  Object.assign(memo, { side: inside, hold: AI.defendHold, cool: AI.defendHold + AI.defendCool });
  return inside;
}
