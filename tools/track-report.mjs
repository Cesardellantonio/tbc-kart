// Track designer's report: validation rules, a full 6-kart AI race, and a top-down SVG map.
//   node tools/track-report.mjs <trackId> [--svg out.svg] [--laps N] [--pace game|<rival skill multiplier>]
// Exit code 0 only when the layout passes every rule and all six AI karts finish cleanly.

import { writeFileSync } from 'node:fs';
import { ALL_TRACKS as TRACKS } from '../src/tracks/index.js';
import { validateTrack, pathOf } from '../src/track/validate.js';
import { barrierFaces } from '../src/track/barrierLines.js';
import { boundsOf } from '../src/track/bounds.js';
import { simulateRace } from './simulate.js';

const args = process.argv.slice(2);
const id = args[0];
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const track = TRACKS.find((t) => t.id === id);
if (!track) {
  console.error(`unknown track "${id}". Known: ${TRACKS.map((t) => t.id).join(', ')}`);
  process.exit(2);
}

const { problems, stats } = validateTrack(track);
console.log(`\n=== ${track.name} (${track.id}) ===`);
console.log('stats', JSON.stringify(stats));
console.log(problems.length ? `RULE PROBLEMS:\n  - ${problems.join('\n  - ')}` : 'rules: all pass');

const svgPath = opt('--svg');
if (svgPath && stats) writeFileSync(svgPath, svgOf(track));
if (svgPath) console.log(`map written to ${svgPath}`);

let ok = problems.length === 0;
if (stats) {
  const laps = Number(opt('--laps')) || Math.min(3, track.laps);
  const pace = opt('--pace') && opt('--pace') !== 'game' ? Number(opt('--pace')) : 'game';
  const sim = simulateRace(track, { laps, pace });
  console.log(`race sim: ${laps} laps, rival pace ${pace}, all finished: ${sim.allFinished}, stuck resets: ${sim.resets}, spins: ${sim.spins}, wall hits: ${sim.wallHits}`);
  console.log(`best lap ${sim.bestLap?.toFixed(2)} s, avg ${sim.avgSpeedKmh} km/h, sim time ${sim.simTime.toFixed(1)} s`);
  for (const r of sim.results) {
    console.log(`  P${r.position} ${r.code}  finish ${r.finishTime?.toFixed(2) ?? 'DNF'}  best ${r.bestLap?.toFixed(2)}  resets ${r.resets}  spins ${r.spins}  walls ${r.wallHits}  top ${r.topSpeedKmh} km/h`);
  }
  ok = ok && sim.allFinished && sim.resets === 0;
}
console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);

// North-up map: asphalt, barriers, start line, direction arrows every ~40 m, waypoint numbers.
function svgOf(t) {
  const path = pathOf(t);
  const faces = barrierFaces(path);
  const b = boundsOf(faces, 6);
  const S = 6; // px per metre
  const X = (x) => ((x - b.minX) * S).toFixed(1);
  const Z = (z) => ((z - b.minZ) * S).toFixed(1);
  const centre = Array.from({ length: path.count }, (_, i) => `${X(path.x[i])},${Z(path.z[i])}`).join(' ');
  const barriers = faces.map((run) => `<polyline points="${run.map((p) => `${X(p.x)},${Z(p.z)}`).join(' ')}${run.closed ? ` ${X(run[0].x)},${Z(run[0].z)}` : ''}" fill="none" stroke="#e63946" stroke-width="3"/>`).join('');
  const s = path.nearest(...t.waypoints[t.startIndex]);
  const a = path.offset(s, -path.halfWidth);
  const c = path.offset(s, path.halfWidth);
  const arrows = [];
  const step = Math.round(40 / path.spacing);
  for (let i = 0; i < path.count; i += step) {
    const x = path.x[i], z = path.z[i];
    const ang = (Math.atan2(path.tz[i], path.tx[i]) * 180) / Math.PI;
    arrows.push(`<g transform="translate(${X(x)},${Z(z)}) rotate(${ang.toFixed(1)})"><path d="M8,0 L-6,6 L-6,-6 Z" fill="#ffc21a"/></g>`);
  }
  const labels = t.waypoints.map(([x, z], k) => `<circle cx="${X(x)}" cy="${Z(z)}" r="3" fill="#6ee7ff"/><text x="${+X(x) + 5}" y="${+Z(z) - 5}" fill="#6ee7ff" font-size="12" font-family="monospace">${k}</text>`).join('');
  const W = (b.width * S).toFixed(0), H = (b.depth * S).toFixed(0);
  const grid = [];
  for (let gx = Math.ceil(b.minX / 10) * 10; gx <= b.maxX; gx += 10) grid.push(`<line x1="${X(gx)}" y1="0" x2="${X(gx)}" y2="${H}" stroke="#222831" stroke-width="1"/>`);
  for (let gz = Math.ceil(b.minZ / 10) * 10; gz <= b.maxZ; gz += 10) grid.push(`<line x1="0" y1="${Z(gz)}" x2="${W}" y2="${Z(gz)}" stroke="#222831" stroke-width="1"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="100%" height="100%" fill="#0b0d12"/>${grid.join('')}
<polygon points="${centre}" fill="none" stroke="#555b66" stroke-width="${(path.halfWidth * 2 * S).toFixed(1)}" stroke-linejoin="round"/>
<polygon points="${centre}" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="6 6"/>
${barriers}
<line x1="${X(a.x)}" y1="${Z(a.z)}" x2="${X(c.x)}" y2="${Z(c.z)}" stroke="#2bd97c" stroke-width="5"/>
${arrows.join('')}${labels}
<text x="10" y="22" fill="#fff" font-size="18" font-family="sans-serif">${t.name} — ${path.length.toFixed(0)} m — grid 10 m — north up, +X east, +Z south — green = start line</text>
</svg>`;
}
