// Render cost: kart static parts baked into one mesh per material per animated node, and a shadow
// box that stays as sharp on the big circuits as on the home track.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mergeStatic } from '../src/entities/model/merge.js';
import { kartMaterials } from '../src/entities/model/materials.js';
import { buildWheels } from '../src/entities/model/wheels.js';
import { buildDriver } from '../src/entities/model/driver.js';
import { createLighting } from '../src/world/Lighting.js';
import { SHADOW_FIT, SHADOW_MAP_SIZE, SUN } from '../src/config/render.js';

const meshes = (node, stop = []) => {
  const out = [];
  const walk = (n) => n.children.forEach((c) => (stop.includes(c) ? null : c.isMesh ? out.push(c) : walk(c)));
  walk(node);
  return out;
};
const worldBox = (node) => {
  node.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(node, true); // precise: from the vertices
};

describe('kart model merging', () => {
  it('bakes parts into one mesh per material, keeping shape, colours and animated children', () => {
    const [paint, metal, trim] = [0xff0000, 0x00ff00, 0x0000ff].map((c) => new THREE.MeshStandardMaterial({ color: c }));
    const group = new THREE.Group();
    group.position.set(1, 2, 3);
    group.rotation.y = 0.7;
    const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), paint);
    a.position.set(2, 0, 0);
    const inner = new THREE.Group();
    inner.rotation.x = 0.4;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.5), metal); // indexed + non-indexed mix
    b.position.set(0, 3, 0);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1), trim);
    c.userData.small = true;
    inner.add(b, c);
    const spinner = new THREE.Group();
    spinner.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), paint));
    group.add(a, inner, spinner);
    const before = worldBox(group);

    mergeStatic(group, { keep: [spinner], alias: new Map([[trim, metal]]) });
    const merged = meshes(group, [spinner]);
    expect(merged.length).toBe(2); // paint, metal (+ trim folded in)
    expect(spinner.children.length).toBe(1); // the animated child is untouched
    const after = worldBox(group);
    expect(after.min.distanceTo(before.min)).toBeLessThan(1e-5);
    expect(after.max.distanceTo(before.max)).toBeLessThan(1e-5);

    const tinted = merged.find((m) => m.geometry.attributes.color);
    expect(tinted.material.vertexColors).toBe(true);
    const col = tinted.geometry.attributes.color;
    const seen = new Set();
    for (let i = 0; i < col.count; i++) seen.add(`${col.getX(i)},${col.getY(i)},${col.getZ(i)}`);
    expect(seen).toEqual(new Set([metal.color, trim.color].map((k) => `${k.r},${k.g},${k.b}`)));
    expect(merged.every((m) => !m.userData.small)).toBe(true); // the small part rode along with a big one
  });

  it('keeps merged parts indexed (vertex sharing survives) and shares one tinted material', () => {
    const [paint, trim] = [0xff0000, 0x0000ff].map((c) => new THREE.MeshStandardMaterial({ color: c }));
    const build = () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), paint));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2).toNonIndexed(), trim)); // an unindexed part
      return mergeStatic(g, { alias: new Map([[trim, paint]]) });
    };
    const [a, b] = [build(), build()];
    const m = a.children[0];
    const source = new THREE.SphereGeometry(0.3, 12, 8).attributes.position.count + 24; // box welds to 24
    expect(a.children).toHaveLength(1);
    expect(m.geometry.index).not.toBeNull();
    expect(m.geometry.attributes.position.count).toBe(source);
    expect(m.geometry.index.count).toBe(new THREE.SphereGeometry(0.3, 12, 8).index.count + 36);
    expect(b.children[0].material).toBe(m.material); // not a fresh clone per merge
    expect(m.material.vertexColors).toBe(true);
  });

  it('costs 2 draws per wheel and 4 for the driver (1 body + 3 head)', () => {
    const mats = kartMaterials();
    for (const w of buildWheels(mats).wheels) expect(meshes(w.spin).length).toBe(2);
    const driver = buildDriver(mats);
    expect(meshes(driver.group, [driver.head]).length).toBe(1);
    expect(meshes(driver.head).length).toBe(3);
  });
});

describe('shadow box', () => {
  const sunOf = (lighting) => lighting.group.children.find((o) => o.isDirectionalLight && o.castShadow);

  it('covers a small hall whole and leaves it there', () => {
    const lighting = createLighting({ cx: 5, cz: -3, width: 90, depth: 70 });
    const sun = sunOf(lighting);
    expect(sun.shadow.camera.right).toBe(47);
    lighting.follow(30, 30);
    expect([sun.target.position.x, sun.target.position.z]).toEqual([5, -3]);
  });

  it('follows the kart in a big hall at the home-track resolution, in whole texels', () => {
    const lighting = createLighting({ cx: 0, cz: 0, width: 230, depth: 180 });
    const sun = sunOf(lighting);
    const cam = sun.shadow.camera;
    expect(cam.right - cam.left).toBe(2 * SHADOW_FIT.maxHalf);
    const texel = (2 * SHADOW_FIT.maxHalf) / SHADOW_MAP_SIZE;
    const back = new THREE.Vector3(...SUN.offset).normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(back).normalize();
    const up = back.clone().cross(right);
    for (const [x, z] of [[60.013, -41.7], [60.02, -41.69], [-80.4, 12.345]]) {
      lighting.follow(x, z);
      const t = sun.target.position;
      expect(Math.hypot(t.x - x, t.z - z)).toBeLessThan(2 * texel); // centred on the kart…
      for (const axis of [right, up]) {
        const k = t.dot(axis) / texel;
        expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6); // …on the texel grid (no shimmer)
      }
      expect(sun.position.clone().sub(t).toArray()).toEqual(SUN.offset.map((v) => expect.closeTo(v, 9)));
    }
  });
});
