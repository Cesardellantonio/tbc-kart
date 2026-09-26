// Driving surface: textured asphalt ribbon, white edge lines, checkered start/finish, grid box.

import * as THREE from 'three';
import { stripGeometry, allIndices } from '../track/stripGeometry.js';
import { asphaltTexture, asphaltDetail } from './textures/surfaces.js';
import { QUALITY } from '../config/graphics.js';
import { checkerTexture } from './textures/markings.js';
import {
  ASPHALT_TILE, SURFACE_Y, PAINT_Y, EDGE_LINE_WIDTH, EDGE_LINE_INSET, START_LINE_DEPTH,
} from '../config/track.js';

const paint = (extra = {}) =>
  new THREE.MeshStandardMaterial({
    color: 0xd4d4d4, // line paint
    roughness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    ...extra,
  });

const receive = (mesh) => ((mesh.receiveShadow = true), mesh);

// Group positioned on the centreline at sample i, local -Z pointing along the track.
function anchorAt(path, i, ...children) {
  const g = new THREE.Group();
  g.position.set(path.x[i], PAINT_Y + 0.002, path.z[i]);
  g.rotation.y = path.heading(i);
  g.add(...children);
  return g;
}

function flatPlane(w, d, material, x = 0, z = 0) {
  const m = receive(new THREE.Mesh(new THREE.PlaneGeometry(w, d), material));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0, z);
  return m;
}

export function createTrackSurface(path, startIndex, gridIndex, anisotropy) {
  const group = new THREE.Group();
  const hw = path.halfWidth;
  const all = allIndices(path);
  const map = asphaltTexture();
  map.anisotropy = anisotropy;
  const asphaltGeom = stripGeometry(path, all, -hw, hw, SURFACE_Y, { closed: true, uPerMetre: 1 / ASPHALT_TILE });
  const detail = QUALITY.detail ? asphaltDetail() : {};
  for (const t of Object.values(detail)) t.anisotropy = anisotropy;
  const asphalt = new THREE.MeshStandardMaterial({ map, roughness: detail.roughnessMap ? 1 : 0.86, ...detail });
  if (detail.normalMap) asphalt.normalScale.set(0.9, 0.9);
  group.add(receive(new THREE.Mesh(asphaltGeom, asphalt)));

  const white = paint();
  for (const side of [-1, 1]) {
    const a = side * (hw - EDGE_LINE_INSET);
    const b = side * (hw - EDGE_LINE_INSET - EDGE_LINE_WIDTH);
    const geom = stripGeometry(path, all, Math.min(a, b), Math.max(a, b), PAINT_Y, { closed: true });
    group.add(receive(new THREE.Mesh(geom, white)));
  }

  const cols = Math.round((hw * 2) / 0.6);
  const checker = paint({ map: checkerTexture(cols, 2), color: 0xffffff });
  group.add(anchorAt(path, startIndex, flatPlane(hw * 2, START_LINE_DEPTH, checker)));

  // Grid box around the kart's starting spot: 1.7 m × 2.4 m painted outline
  const [bw, bl, t] = [1.7, 2.4, 0.1];
  group.add(
    anchorAt(
      path,
      gridIndex,
      flatPlane(bw, t, white, 0, -bl / 2),
      flatPlane(t, bl, white, -bw / 2, 0),
      flatPlane(t, bl, white, bw / 2, 0),
    ),
  );
  return group;
}
