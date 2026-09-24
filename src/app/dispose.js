// Frees the GPU resources under a scene subtree (geometries, materials, their textures, shadow maps).

export function disposeTree(root) {
  const seen = new Set();
  const once = (thing) => {
    if (!thing || seen.has(thing)) return;
    seen.add(thing);
    thing.dispose?.();
  };
  root.traverse((o) => {
    once(o.geometry);
    for (const m of [o.material].flat()) {
      if (!m) continue;
      for (const v of Object.values(m)) if (v?.isTexture) once(v);
      once(m);
    }
    if (o.isLight) o.shadow?.dispose?.();
    if (o.isInstancedMesh) o.dispose();
  });
}
