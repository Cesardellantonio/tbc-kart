// Overtaking for one computer driver (pure apart from its memo): pick the closest slower kart ahead
// and keep it as the target through the pass with some hysteresis (so pulling out beside it does not
// lose sight of it). Tuck in behind it for the slipstream first; once close, pull out to the side
// latched for this attempt (the inside of the next corner, or else the side with more room). A move
// that has not drawn alongside after a while is abandoned: back onto the racing line, then try again,
// so a kart that is barely quicker is not stuck running off-line behind a slower one for laps.

import { AI } from '../config/race.js';

// memo: { target (index into traffic, -1 = none), side (-1 left / +1 right / 0), out (s pulled out on
// this attempt), wait (s before the next attempt) }, kept by the driver.
// traffic: [{ ahead, lateral, speed }] in a stable order; myLat: my lateral offset (m, + = right);
// inside: side of the next corner's apex (-1 left / +1 right / 0 straight).
// Returns { pass: wanted sideways offset (m), speedCap: m/s to hold behind a kart blocking my lane }.
export function passing(memo, traffic, myLat, speed, dt = 0, inside = 0) {
  let speedCap = Infinity;
  for (const o of traffic) {
    if (o.ahead > 0.5 && o.ahead < AI.blockAhead && Math.abs(o.lateral - myLat) < AI.blockLateral)
      speedCap = Math.min(speedCap, o.speed - 0.4);
  }
  const kept = traffic[memo.target];
  if (!kept || !keeps(kept, myLat)) Object.assign(memo, acquire(traffic, myLat, speed));
  const target = traffic[memo.target];
  memo.wait = Math.max(0, (memo.wait ?? 0) - dt);
  if (!target || target.ahead >= AI.pullOutAhead || memo.wait > 0) return { pass: 0, speedCap };
  if (!memo.out) memo.side = inside || (target.lateral > 0 ? -1 : 1); // a new attempt: pick its side
  memo.out = (memo.out ?? 0) + dt;
  if (memo.out > AI.passGiveUp && target.ahead > AI.passAlongside) {
    Object.assign(memo, { out: 0, wait: AI.passRetry }); // not getting alongside: back in line
    return { pass: 0, speedCap };
  }
  return { pass: memo.side * AI.passOffset, speedCap };
}

// Still worth passing: not yet cleanly behind me, not dropped out of sight, still roughly in reach
// (pulled out beside it on the other side of the racing line it can be passOffset + lineMax away).
const keeps = (o, myLat) =>
  o.ahead > -AI.passClear &&
  o.ahead <= AI.sightKeep &&
  Math.abs(o.lateral - myLat) <= AI.passOffset + AI.lineMax;

function acquire(traffic, myLat, speed) {
  let best = -1;
  traffic.forEach((o, k) => {
    if (o.ahead <= 0.5 || o.ahead > AI.sightAhead || Math.abs(o.lateral - myLat) > AI.sightLateral)
      return;
    if (o.speed >= speed + 1.5) return; // pulling away: no pass needed
    if (best < 0 || o.ahead < traffic[best].ahead) best = k;
  });
  return best < 0 ? { target: -1, side: 0, out: 0, wait: 0 } : { target: best, side: 0, out: 0 };
}

// Side of the next corner's apex from sample `index` (-1 left / +1 right), 0 if the road ahead is
// nearly straight.
export function nextInside(path, index) {
  let turn = 0;
  for (let d = 0; d < AI.passLook; d += 1) turn += path.curvature[path.wrap(index + Math.round(d / path.spacing))];
  return Math.abs(turn) > AI.passTurn ? Math.sign(turn) : 0;
}
