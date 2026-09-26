// Image-based lighting from the real hall: a cube camera photographs the built venue (LED panels,
// banners, neon, walls, floor, barriers) from kart height, and the PMREM generator turns it into the
// prefiltered environment every PBR material reflects and is lit by. Re-captured per track, so paint,
// visors and the polished floor reflect the lights that are actually overhead.

import * as THREE from 'three';

// renderer: WebGLRenderer; scene; at: THREE.Vector3; size: cube face px; hide: objects left out
// (karts, particles). Returns the PMREM texture (the caller disposes the previous one).
export function captureEnvironment(renderer, scene, at, size, hide = []) {
  const target = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
  const cube = new THREE.CubeCamera(0.2, 500, target);
  cube.position.copy(at);
  const shown = hide.map((o) => o.visible);
  hide.forEach((o) => (o.visible = false));
  const env = scene.environment;
  scene.environment = null; // no feedback from the old capture
  cube.update(renderer, scene);
  scene.environment = env;
  hide.forEach((o, i) => (o.visible = shown[i]));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromCubemap(target.texture).texture;
  pmrem.dispose();
  target.dispose();
  return texture;
}
