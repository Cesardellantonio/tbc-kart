// Dev-only overhead view of the whole venue: freezes the camera rig, hides the roof, drops the haze.

export function enter(game) {
  const { camera, renderer, world } = game;
  const b = world.bounds;
  camera.mode = 'manual';
  const cam = camera.three;
  cam.position.set(b.cx, Math.max(b.width, b.depth) * 1.05, b.cz + 0.01);
  cam.up.set(0, 0, -1);
  cam.fov = 50;
  cam.updateProjectionMatrix();
  cam.lookAt(b.cx, 0, b.cz);
  renderer.scene.traverse((o) => {
    if (o.userData.ceiling || (o.isMesh && o.position.y > 7)) {
      o.userData.wasVisible ??= o.visible;
      o.visible = false;
    }
  });
  world._fog = renderer.scene.fog;
  renderer.scene.fog = null;
  game.post.render(0);
}

export function exit(game) {
  const { camera, renderer, world } = game;
  renderer.scene.traverse((o) => {
    if (o.userData.wasVisible !== undefined) {
      o.visible = o.userData.wasVisible;
      delete o.userData.wasVisible;
    }
  });
  if (world._fog) renderer.scene.fog = world._fog;
  camera.three.up.set(0, 1, 0);
  camera.mode = game.session.state === 'title' ? 'broadcast' : 'follow';
}
