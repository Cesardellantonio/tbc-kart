// Builds the static scene for one track (all in one group, so a track change can drop it) and
// returns the handles the game needs.

import * as THREE from 'three';
import { pathOf } from '../track/validate.js';
import { boundsOf, wallLoop } from '../track/bounds.js';
import { BarrierCollider } from '../physics/BarrierCollider.js';
import { createFloor, createFloorLogo } from '../world/Floor.js';
import { createTrackSurface } from '../world/TrackSurface.js';
import { createCurbs } from '../world/Curbs.js';
import { createRubberLine } from '../world/RubberLine.js';
import { curbTable } from '../track/curbTable.js';
import { SurfaceGrip } from '../track/surfaceGrip.js';
import { racingLine } from '../race/racingLine.js';
import { createBarriers } from '../world/Barriers.js';
import { createVenue } from '../world/Venue.js';
import { createRig } from '../world/Rig.js';
import { createLightShafts } from '../world/LightShafts.js';
import { QUALITY } from '../config/graphics.js';
import { createBanners } from '../world/Banners.js';
import { createLighting } from '../world/Lighting.js';
import { StartGantry } from '../world/StartGantry.js';
import { broadcastAnchors } from './anchors.js';
import { GRID_BACK, BARRIER_THICKNESS } from '../config/track.js';
import { VENUE_MARGIN } from '../config/venue.js';
import { COLLISION_CELL } from '../config/physics.js';
import { AI } from '../config/race.js';

const LOGO_WIDTH = 34;

// Floor spot for a w × h painted logo, clear of the track and barriers: the centre of the layout
// if free, else the free spot nearest to it (null if the infield is too busy). 1 m occupancy grid.
function clearSpot(path, b, w, h) {
  const [cols, rows] = [Math.ceil(b.width), Math.ceil(b.depth)];
  const busy = new Uint8Array(cols * rows);
  const keep = Math.ceil(path.halfWidth + 2.5);
  const stride = Math.max(1, Math.round(1 / path.spacing));
  for (let i = 0; i < path.count; i += stride) {
    const [c0, r0] = [Math.floor(path.x[i] - b.minX), Math.floor(path.z[i] - b.minZ)];
    for (let dc = -keep; dc <= keep; dc++) {
      for (let dr = -keep; dr <= keep; dr++) {
        const [c, r] = [c0 + dc, r0 + dr];
        if (c >= 0 && r >= 0 && c < cols && r < rows && dc * dc + dr * dr <= keep * keep) busy[r * cols + c] = 1;
      }
    }
  }
  const free = (x, z) => {
    const [c0, r0] = [Math.floor(x - w / 2 - b.minX), Math.floor(z - h / 2 - b.minZ)];
    if (c0 < 2 || r0 < 2 || c0 + w > cols - 2 || r0 + h > rows - 2) return false;
    for (let r = r0; r <= r0 + h; r++) for (let c = c0; c <= c0 + w; c++) if (busy[r * cols + c]) return false;
    return true;
  };
  const cx = path.x.reduce((a, v) => a + v, 0) / path.count;
  const cz = path.z.reduce((a, v) => a + v, 0) / path.count;
  const spots = [];
  for (let x = b.minX; x <= b.maxX; x += 2) for (let z = b.minZ; z <= b.maxZ; z += 2) spots.push({ x, z, d: (x - cx) ** 2 + (z - cz) ** 2 });
  spots.sort((p, q) => p.d - q.d);
  return free(cx, cz) ? { x: cx, z: cz } : (spots.find((p) => free(p.x, p.z)) ?? null);
}

export function buildWorld(track, anisotropy) {
  const path = pathOf(track);
  const startIndex = path.nearest(...track.waypoints[track.startIndex]);
  const gridIndex = path.wrap(startIndex - Math.round(GRID_BACK / path.spacing));

  const barriers = createBarriers(path);
  const bounds = boundsOf(barriers.faces, VENUE_MARGIN + BARRIER_THICKNESS);
  const gantry = new StartGantry(path, startIndex);
  const rig = createRig(bounds);

  const logo = clearSpot(path, bounds, LOGO_WIDTH, LOGO_WIDTH / 4);
  const line = racingLine(path, AI); // shared with the rival AI (app/field.js)
  const lighting = createLighting(bounds); // lighting.follow(x, z): shadow box on the kart in big halls

  const group = new THREE.Group();
  group.add(
    createFloor(bounds, anisotropy),
    ...(logo ? [createFloorLogo(logo.x, logo.z, LOGO_WIDTH)] : []),
    createTrackSurface(path, startIndex, gridIndex, anisotropy),
    createRubberLine(path, line),
    createCurbs(path),
    barriers.mesh,
    createVenue(bounds, anisotropy),
    rig.group,
    createBanners(bounds),
    lighting.group,
    ...(QUALITY.haze ? [createLightShafts(rig.lights)] : []),
    gantry.group,
  );
  rig.group.userData.ceiling = true;

  const collider = new BarrierCollider([...barriers.faces, wallLoop(bounds)], COLLISION_CELL);
  const curbs = curbTable(path); // per-sample kerb lookup for the kerb feel
  const surface = new SurfaceGrip(path, line, curbs); // tyre grip: rubbered line, dust, kerbs
  return { track, group, path, line, curbs, surface, startIndex, gridIndex, bounds, collider, gantry, rig, lighting, anchors: broadcastAnchors(path) };
}
