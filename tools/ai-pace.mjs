// Calibrates config/race.js TRACK_PACE: for each circuit, the reference lap is the computer driver's
// best solo lap at any corner pace, and the circuit's pace is set so a skill-1 driver laps
// AI.paceMargin slower than that. Prints the table to paste into config/race.js.
// Usage: node tools/ai-pace.mjs [trackId …]

import { TRACKS } from '../src/tracks/index.js';
import { AI } from '../src/config/race.js';
import { referenceLap, soloLap } from './paceLap.js';

const ids = process.argv.slice(2);
const rows = [];
for (const track of TRACKS.filter((t) => !ids.length || ids.includes(t.id))) {
  const ref = referenceLap(track);
  const target = ref.lap * (1 + AI.paceMargin);
  // Below the reference pace the lap time falls as the pace rises: bisect for the target.
  let [lo, hi] = [0.5, ref.pace];
  for (let k = 0; k < 14; k++) {
    const mid = (lo + hi) / 2;
    if (soloLap(track, mid) > target) lo = mid;
    else hi = mid;
  }
  const pace = +((lo + hi) / 2).toFixed(3);
  rows.push(`  ${track.id}: ${pace},`);
  console.log(`${track.id.padEnd(12)} reference ${ref.lap.toFixed(2)} s (at pace ${ref.pace.toFixed(2)}) → pace ${pace} laps ${soloLap(track, pace).toFixed(2)} s (target ${target.toFixed(2)})`);
}
console.log(`\nexport const TRACK_PACE = {\n${rows.join('\n')}\n};`);
