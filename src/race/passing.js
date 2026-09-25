// Overtaking for one computer driver (pure apart from its memo): pick the closest slower kart ahead,
// keep it as the target through the pass with some hysteresis (so pulling out beside it does not lose
// sight of it), and latch the side to pass on until the move is done or abandoned. Tuck in behind it
// for the slipstream first; pull out when close.

import { AI } from '../config/race.js';

// memo: { target (index into traffic, -1 = none), side (-1 left / +1 right / 0) }, kept by the driver.
// traffic: [{ ahead, lateral, speed }] in a stable order; myLat: my lateral offset (m, + = right).
// Returns { pass: wanted sideways offset (m), speedCap: m/s to hold behind a kart blocking my lane }.
export function passing(memo, traffic, myLat, speed) {
  let speedCap = Infinity;
  for (const o of traffic) {
    if (o.ahead > 0.5 && o.ahead < AI.blockAhead && Math.abs(o.lateral - myLat) < AI.blockLateral)
      speedCap = Math.min(speedCap, o.speed - 0.4);
  }
  const kept = traffic[memo.target];
  if (!kept || !keeps(kept, myLat)) Object.assign(memo, acquire(traffic, myLat, speed));
  const target = traffic[memo.target];
  const pullOut = target && target.ahead < AI.pullOutAhead;
  return { pass: pullOut ? memo.side * AI.passOffset : 0, speedCap };
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
  return best < 0
    ? { target: -1, side: 0 }
    : { target: best, side: traffic[best].lateral > myLat ? -1 : 1 };
}
