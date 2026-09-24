// Track design rules (pure). Every layout in src/tracks must pass these so the barriers, grid,
// venue and AI all work: returns { problems: [string], stats }.

import { TrackPath } from './TrackPath.js';
import { barrierFaces, clearanceOf } from './barrierLines.js';
import { boundsOf } from './bounds.js';
import { gridDepth } from '../race/grid.js';
import { TRACK_SAMPLE_SPACING, TRACK_WIDTH, TRACK_SPLINE } from '../config/track.js';

export const RULES = {
  minLength: 240, // m
  maxLength: 720,
  minRadius: 4.2, // tightest corner radius on the centreline (m)
  separation: 11.5, // min distance between parts of the track that are ≥ separationArc apart along it
  separationArc: 26,
  gridRadius: 30, // the grid + start line must sit on track straighter than this radius
  maxFootprint: [190, 140], // hall size limit, barriers included (m)
  minWidth: 5.5,
  maxWidth: 8,
};

// track.samples pins the sample count (keeps saved records valid); otherwise ~0.25 m spacing.
export const pathOf = (track) =>
  new TrackPath(track.waypoints, {
    samples: track.samples,
    spacing: TRACK_SAMPLE_SPACING,
    width: track.width ?? TRACK_WIDTH,
    spline: TRACK_SPLINE,
  });

// track.exempt: rule names a legacy layout is allowed to break ('radius', 'grid').
export function validateTrack(track) {
  const problems = [];
  const exempt = new Set(track.exempt ?? []);
  const wp = track.waypoints;
  if (!Array.isArray(wp) || wp.length < 6 || !wp.every((p) => p.length === 2 && p.every(Number.isFinite))) {
    return { problems: ['waypoints must be at least 6 finite [x, z] pairs'], stats: null };
  }
  const width = track.width ?? TRACK_WIDTH;
  if (width < RULES.minWidth || width > RULES.maxWidth) problems.push(`width ${width} m outside ${RULES.minWidth}–${RULES.maxWidth}`);
  if (!Number.isInteger(track.startIndex) || track.startIndex < 0 || track.startIndex >= wp.length) problems.push('startIndex must index a waypoint');
  if (!(track.laps >= 2 && track.laps <= 10)) problems.push('laps must be 2–10');

  const path = pathOf(track);
  const n = path.count;
  if (path.length < RULES.minLength || path.length > RULES.maxLength) {
    problems.push(`lap length ${path.length.toFixed(0)} m outside ${RULES.minLength}–${RULES.maxLength} m`);
  }

  let minRadius = Infinity;
  let at = 0;
  for (let i = 0; i < n; i++) {
    const r = 1 / Math.max(Math.abs(path.curvature[i]), 1e-9);
    if (r < minRadius) [minRadius, at] = [r, i];
  }
  if (minRadius < RULES.minRadius && !exempt.has('radius')) problems.push(`corner radius ${minRadius.toFixed(2)} m < ${RULES.minRadius} m near (${path.x[at].toFixed(1)}, ${path.z[at].toFixed(1)})`);

  // Separate parts of the track must keep apart (barriers between them, no overlapping asphalt).
  const arc = Math.round(RULES.separationArc / path.spacing);
  const stride = Math.max(1, Math.round(1 / path.spacing));
  let minSep = Infinity;
  let sepAt = null;
  for (let i = 0; i < n; i += stride) {
    for (let j = i + arc; j < n - arc + i; j += stride) {
      const d = Math.hypot(path.x[i] - path.x[j], path.z[i] - path.z[j]);
      if (d < minSep) [minSep, sepAt] = [d, [i, j]];
    }
  }
  if (minSep < RULES.separation) {
    const [i, j] = sepAt;
    problems.push(`parts of the track only ${minSep.toFixed(1)} m apart: (${path.x[i].toFixed(1)}, ${path.z[i].toFixed(1)}) and (${path.x[j].toFixed(1)}, ${path.z[j].toFixed(1)})`);
  }

  // Grid and start line on a straight.
  const startSample = path.nearest(...wp[Math.min(Math.max(track.startIndex | 0, 0), wp.length - 1)]);
  const back = Math.round(gridDepth(6) / path.spacing);
  const ahead = Math.round(10 / path.spacing);
  let gridK = 0;
  for (let d = -back; d <= ahead; d++) gridK = Math.max(gridK, Math.abs(path.curvature[path.wrap(startSample + d)]));
  if (gridK > 1 / RULES.gridRadius && !exempt.has('grid')) problems.push(`start line / grid not on a straight: radius ${(1 / gridK).toFixed(1)} m < ${RULES.gridRadius} m within ${gridDepth(6).toFixed(0)} m behind / 10 m after the line`);

  const faces = barrierFaces(path);
  const clearance = clearanceOf(path);
  const intruding = faces.some((run) => run.some((p) => path.within(p.x, p.z, clearance)));
  if (intruding) problems.push('a barrier intrudes onto the asphalt');
  const b = boundsOf(faces, 0);
  if (b.width > RULES.maxFootprint[0] || b.depth > RULES.maxFootprint[1]) {
    problems.push(`footprint ${b.width.toFixed(0)} × ${b.depth.toFixed(0)} m exceeds ${RULES.maxFootprint.join(' × ')} m`);
  }

  // Longest straight (radius > 60 m) — informative.
  let longest = 0;
  let run = 0;
  for (let k = 0; k < 2 * n; k++) {
    run = Math.abs(path.curvature[k % n]) < 1 / 60 ? run + 1 : 0;
    longest = Math.max(longest, Math.min(run, n));
  }
  const stats = {
    length: +path.length.toFixed(1),
    samples: n,
    minRadius: +minRadius.toFixed(2),
    minSeparation: +minSep.toFixed(2),
    footprint: [+b.width.toFixed(1), +b.depth.toFixed(1)],
    longestStraight: +(longest * path.spacing).toFixed(1),
    gridRadius: +(1 / Math.max(gridK, 1e-9)).toFixed(1),
    barrierRuns: faces.length,
  };
  return { problems, stats };
}
