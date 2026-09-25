// Bakes a model group's static parts into one mesh per material, so a kart costs ~18 draw calls
// instead of ~53 (×6 karts, ×2 with the shadow pass). Animated sub-groups listed in `keep` are
// left alone (merge them on their own). `alias` folds one material into another that shades alike
// (frame into engine, gloves into suit): those parts keep their own colour as vertex colours.
// Parts flagged userData.small (visor, plate, …) cast no shadow unless merged with a bigger part.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const ATTRS = ['position', 'normal', 'uv'];

function bake(mesh, toGroup, color) {
  let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  for (const name of Object.keys(g.attributes)) if (!ATTRS.includes(name)) g.deleteAttribute(name);
  const count = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toGroup, mesh.matrixWorld));
  if (color) {
    const rgb = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) color.toArray(rgb, i * 3);
    g.setAttribute('color', new THREE.Float32BufferAttribute(rgb, 3));
  }
  g.clearGroups();
  return g;
}

export function mergeStatic(group, { keep = [], alias = new Map() } = {}) {
  group.updateMatrixWorld(true);
  const toGroup = group.matrixWorld.clone().invert();
  const buckets = new Map(); // target material → parts
  const walk = (node) => {
    for (const child of [...node.children]) {
      if (keep.includes(child)) continue;
      if (child.isMesh) {
        const target = alias.get(child.material) ?? child.material;
        if (!buckets.has(target)) buckets.set(target, []);
        buckets.get(target).push(child);
        child.removeFromParent();
      } else walk(child);
    }
  };
  walk(group);
  for (const [material, parts] of buckets) {
    const tinted = parts.some((p) => p.material !== material);
    const merged = new THREE.Mesh(
      mergeGeometries(parts.map((p) => bake(p, toGroup, tinted && p.material.color))),
      tinted ? Object.assign(material.clone(), { vertexColors: true, color: new THREE.Color(0xffffff) }) : material,
    );
    merged.userData.small = parts.every((p) => p.userData.small);
    for (const p of parts) p.geometry.dispose();
    group.add(merged);
  }
  return group;
}
