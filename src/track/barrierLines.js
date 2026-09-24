// Barrier geometry shared by the scene, the collider, the simulator and the tests (pure, no THREE).

import { offsetChain } from './offsetChain.js';
import { BARRIER_GAP, BARRIER_THICKNESS } from '../config/track.js';

// Nothing may sit this close to any part of the centreline.
export const clearanceOf = (path) => path.halfWidth + 0.35;

// Collider faces: the inner face of the barriers on both sides of the track.
export function barrierFaces(path) {
  return [-1, 1].flatMap((side) => offsetChain(path, side * (path.halfWidth + BARRIER_GAP), clearanceOf(path)));
}

// Centre lines of the barrier blocks on both sides (for placing the meshes).
export function barrierCentres(path) {
  const centre = path.halfWidth + BARRIER_GAP + BARRIER_THICKNESS / 2;
  return [-1, 1].flatMap((side) => offsetChain(path, side * centre, clearanceOf(path)));
}
