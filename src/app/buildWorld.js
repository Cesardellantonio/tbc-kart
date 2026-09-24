// Builds the static scene from the track definition and returns the handles the game needs.

import { TrackPath } from '../track/TrackPath.js';
import { boundsOf, wallLoop } from '../track/bounds.js';
import { BarrierCollider } from '../physics/BarrierCollider.js';
import { createFloor, createFloorLogo } from '../world/Floor.js';
import { createTrackSurface } from '../world/TrackSurface.js';
import { createCurbs } from '../world/Curbs.js';
import { createBarriers } from '../world/Barriers.js';
import { createVenue } from '../world/Venue.js';
import { createRig } from '../world/Rig.js';
import { createBanners } from '../world/Banners.js';
import { createLighting } from '../world/Lighting.js';
import { StartGantry } from '../world/StartGantry.js';
import { broadcastAnchors } from './anchors.js';
import { WAYPOINTS, START_INDEX } from '../config/trackWaypoints.js';
import { TRACK_SAMPLES, TRACK_WIDTH, TRACK_SPLINE, GRID_BACK, BARRIER_THICKNESS } from '../config/track.js';
import { VENUE_MARGIN } from '../config/venue.js';
import { COLLISION_CELL } from '../config/physics.js';

export function buildWorld(scene, anisotropy) {
  const path = new TrackPath(WAYPOINTS, { samples: TRACK_SAMPLES, width: TRACK_WIDTH, spline: TRACK_SPLINE });
  const [sx, sz] = WAYPOINTS[START_INDEX];
  const startIndex = path.nearest(sx, sz);
  const gridIndex = path.wrap(startIndex - Math.round(GRID_BACK / path.spacing));

  const barriers = createBarriers(path);
  const bounds = boundsOf(barriers.faces, VENUE_MARGIN + BARRIER_THICKNESS);
  const gantry = new StartGantry(path, startIndex);
  const rig = createRig(bounds);

  // Infield logo sits at the centroid of the centreline.
  const cx = path.x.reduce((a, v) => a + v, 0) / path.count;
  const cz = path.z.reduce((a, v) => a + v, 0) / path.count;

  scene.add(
    createFloor(bounds, anisotropy),
    createFloorLogo(cx, cz, 34),
    createTrackSurface(path, startIndex, gridIndex, anisotropy),
    createCurbs(path),
    barriers.mesh,
    createVenue(bounds, anisotropy),
    rig.group,
    createBanners(bounds),
    createLighting(bounds),
    gantry.group,
  );
  rig.group.userData.ceiling = true;

  const collider = new BarrierCollider([...barriers.faces, wallLoop(bounds)], COLLISION_CELL);
  return { path, startIndex, gridIndex, bounds, collider, gantry, rig, anchors: broadcastAnchors(path) };
}
