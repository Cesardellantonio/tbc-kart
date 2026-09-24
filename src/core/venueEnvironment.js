// Reflection environment that looks like the venue: a dark hall with rows of bright ceiling panels
// and neon accents. Glossy paint, visors and the floor then reflect lights, not a white studio.

import * as THREE from 'three';

const hdr = (hex, intensity) => new THREE.Color(hex).multiplyScalar(intensity);

export function venueEnvironment(renderer) {
  const scene = new THREE.Scene();
  const unlit = (color, side = THREE.FrontSide) => new THREE.MeshBasicMaterial({ color, side });
  const add = (geometry, material, x, y, z, rx = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    scene.add(mesh);
  };

  add(new THREE.BoxGeometry(80, 14, 80), unlit(0x15181e, THREE.BackSide), 0, 5, 0); // hall walls + roof
  add(new THREE.PlaneGeometry(80, 80), unlit(0x2c2e33), 0, -1.8, 0, -Math.PI / 2); // concrete floor

  const panel = new THREE.PlaneGeometry(3.4, 0.7);
  const glow = unlit(hdr(0xf4f8ff, 16));
  for (let x = -30; x <= 30; x += 10) {
    for (let z = -30; z <= 30; z += 10) add(panel, glow, x, 10.5, z, Math.PI / 2);
  }
  const strip = new THREE.BoxGeometry(76, 0.15, 0.15);
  const neon = [unlit(hdr(0x00e5ff, 4)), unlit(hdr(0xff2bd6, 4))];
  for (const [z, m] of [[-39.5, neon[0]], [39.5, neon[1]]]) add(strip, m, 0, 1.4, z);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  scene.traverse((o) => o.geometry?.dispose());
  return texture;
}
