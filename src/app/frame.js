// One simulation frame: input → race flow → kart → FX & audio → camera → HUD.

import { handleActions } from './actions.js';

const HOLD = { throttle: 0, brake: 0, steer: 0, handbrake: false };
const IMPACT_MIN = 1.5; // m/s into a barrier before it counts as a hit
const IMPACT_COOLDOWN = 0.18; // s between hit events while grinding along a wall

// Who drives: the autopilot on the title screen, the player while racing, nobody on the grid.
export function controlsFor(game, state) {
  if (state === 'title') return game.autopilot.controls(game.kart.state, game.kart.telemetry.speed);
  return state === 'racing' ? game.input.controls() : HOLD;
}

// requestAnimationFrame loop with a clamped timestep.
export function runLoop(game) {
  let last = performance.now();
  document.addEventListener('visibilitychange', () => (last = performance.now()));
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (dt > 0) game.step(dt); // rAF stamps can trail a visibilitychange reset
    game.post.render(Math.max(dt, 0));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export function stepGame(game, dt) {
  const { input, session, kart, world, camera } = game;
  input.poll();
  handleActions(game);
  const state = session.state;
  const paused = state === 'paused';
  if (!paused) {
    kart.update(game.controlsFor(state), dt);
    game.trackIndex = world.path.nearest(kart.state.x, kart.state.z, game.trackIndex);
    session.update(dt, game.trackIndex);
    game.fx.update(kart, dt, camera.three, game.renderer.three.domElement.height);
    game.impactCooldown -= dt;
    if (kart.telemetry.impact > IMPACT_MIN && game.impactCooldown <= 0) {
      game.bus.emit('impact', kart.telemetry.impact);
      game.impactCooldown = IMPACT_COOLDOWN;
    }
  }
  world.gantry.setLights(session.lights, session.lightsMode);
  camera.update(kart, paused ? 0 : dt);
  kart.model.setFirstPerson(camera.mode === 'follow' && camera.view === 'cockpit');

  const t = kart.telemetry;
  const revs = state === 'countdown' ? input.controls().throttle : t.throttle; // rev on the grid
  game.engine.update(t.speed, revs, dt, !paused);
  game.sfx.screech(t.speed > 3 ? t.slip : 0, !paused);
  game.hud.update(session.view, kart);
  game.debug.update(dt, game);
  input.endFrame();
}
