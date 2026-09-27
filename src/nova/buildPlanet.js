// NOVA's version of app/buildWorld.js: the same circuit (path, racing line, barrier collider, grip,
// start gantry, camera anchors) set on an alien world — sky, terrain, life and rock, energy barriers,
// a glowing deck — generated from the track's planet (config/planets.js) with the track id as seed.

import * as THREE from 'three';
import { pathOf } from '../track/validate.js';
import { boundsOf, wallLoop } from '../track/bounds.js';
import { BarrierCollider } from '../physics/BarrierCollider.js';
import { createTrackSurface } from '../world/TrackSurface.js';
import { createCurbs } from '../world/Curbs.js';
import { curbTable } from '../track/curbTable.js';
import { SurfaceGrip } from '../track/surfaceGrip.js';
import { racingLine } from '../race/racingLine.js';
import { StartGantry } from '../world/StartGantry.js';
import { broadcastAnchors } from '../app/anchors.js';
import { GRID_BACK, BARRIER_THICKNESS } from '../config/track.js';
import { VENUE_MARGIN } from '../config/venue.js';
import { COLLISION_CELL } from '../config/physics.js';
import { AI } from '../config/race.js';
import { QUALITY_ID } from '../config/graphics.js';
import { planetOf, FLORA_BUDGET, NOVA_WORLD } from '../config/planets.js';
import { seededRandom } from '../core/math.js';
import { valueNoise, seedOf } from './noise.js';
import { createSky } from './Sky.js';
import { createTerrain } from './Terrain.js';
import { createFlora } from './Flora.js';
import { createEnergyBarriers } from './EnergyBarriers.js';
import { createPlanetLighting } from './planetLighting.js';

const css = (c) => `#${new THREE.Color(c).getHexString()}`;

export function buildPlanet(track, anisotropy) {
  const planet = planetOf(track.id);
  const seed = seedOf(track.id);
  const random = seededRandom(seed);
  const noise = valueNoise(seed);
  const path = pathOf(track);
  const startIndex = path.nearest(...track.waypoints[track.startIndex]);
  const gridIndex = path.wrap(startIndex - Math.round(GRID_BACK / path.spacing));

  const barriers = createEnergyBarriers(path, planet.accent);
  const bounds = boundsOf(barriers.faces, VENUE_MARGIN + BARRIER_THICKNESS);
  const gantry = new StartGantry(path, startIndex);
  const line = racingLine(path, AI);
  const lighting = createPlanetLighting(planet, bounds);
  const terrain = createTerrain(planet, path, bounds, noise, QUALITY_ID === 'low' ? 140 : NOVA_WORLD.segments);
  const sky = createSky(planet, new THREE.Vector3(bounds.cx, 0, bounds.cz), NOVA_WORLD.skyRadius);
  const deck = new THREE.Color(planet.apron).lerp(new THREE.Color(planet.night ? 0x8a90a8 : 0x6a7080), 0.6);

  const group = new THREE.Group();
  group.add(
    sky.group,
    terrain.mesh,
    createTrackSurface(path, startIndex, gridIndex, anisotropy, { surface: deck, line: planet.accent, glow: planet.night ? new THREE.Color(planet.accent).lerp(deck, 0.7).multiplyScalar(0.08) : 0 }),
    createCurbs(path, { a: css(planet.accent), b: '#1c1f28' }),
    barriers.mesh,
    createFlora(planet, terrain, bounds, random, noise, FLORA_BUDGET[QUALITY_ID] ?? 1),
    lighting.group,
    gantry.group,
  );

  const collider = new BarrierCollider([...barriers.faces, wallLoop(bounds)], COLLISION_CELL);
  const curbs = curbTable(path);
  const surface = new SurfaceGrip(path, line, curbs);
  const haze = new THREE.Color(planet.haze[0]);
  return {
    track, group, path, line, curbs, surface, startIndex, gridIndex, bounds, collider, gantry, lighting,
    anchors: broadcastAnchors(path),
    planet,
    atmosphere: { background: haze, fog: haze, density: planet.haze[1], exposure: planet.night ? 1.15 : 1 },
    update: (dt) => sky.update(dt),
  };
}
