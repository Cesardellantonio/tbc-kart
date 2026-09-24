// Illuminated sponsor-style banners hung on the hall walls.

import * as THREE from 'three';
import { bannerTexture } from './textures/signage.js';
import { wallsOf } from './Venue.js';
import { BANNERS, BANNER_SIZE, BANNER_Y } from '../config/venue.js';

export function createBanners(b) {
  const group = new THREE.Group();
  const textures = BANNERS.map(bannerTexture);
  const [w, h] = BANNER_SIZE;
  let n = 0;
  for (const [len, x, z, rot] of wallsOf(b)) {
    const count = Math.max(1, Math.floor(len / 32));
    for (let k = 0; k < count; k++) {
      const map = textures[n++ % textures.length];
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({
          map,
          emissiveMap: map,
          emissive: 0xffffff,
          emissiveIntensity: 0.45,
          roughness: 0.55,
        }),
      );
      const along = (k - (count - 1) / 2) * (len / count);
      const inward = 0.15;
      // Local wall frame: +x along the wall, +z into the hall
      banner.position.set(
        x + Math.cos(rot) * along + Math.sin(rot) * inward,
        BANNER_Y,
        z - Math.sin(rot) * along + Math.cos(rot) * inward,
      );
      banner.rotation.y = rot;
      group.add(banner);
    }
  }
  return group;
}
