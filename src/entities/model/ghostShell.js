// The best-lap ghost draws as one translucent shell: a depth-only twin of every mesh goes first
// (after the opaque world, before the glass), so the glass only lands on the ghost's nearest surface
// instead of stacking every inner face (frame, legs, engine) into an x-ray tangle.

import * as THREE from 'three';

const DEPTH_ORDER = 3; // after the contact shadows (2) and other translucent effects (0)…
const GLASS_ORDER = 4; // …then the glass over it

export function ghostShell(root) {
  const depth = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, depthWrite: true });
  const meshes = [];
  root.traverse((o) => o.isMesh && meshes.push(o));
  for (const m of meshes) {
    const twin = m.clone(false); // shares geometry (and skeleton for the skinned arms)
    twin.material = depth;
    twin.renderOrder = DEPTH_ORDER;
    m.renderOrder = GLASS_ORDER;
    m.parent.add(twin);
  }
}
