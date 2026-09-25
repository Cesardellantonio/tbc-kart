// One simulation frame: input → karts (player + field) → race flow → FX & audio → camera → HUD.

import { handleActions } from './actions.js';
import { stepField } from './field.js';
import { updateSound } from './sound.js';
import { FINISH_COOLDOWN } from '../config/race.js';

const HOLD = { throttle: 0, brake: 0, steer: 0, handbrake: false };
const IMPACT_MIN = 1.5; // m/s into a barrier before it counts as a hit
const IMPACT_COOLDOWN = 0.18; // s between hit events while grinding along a wall
const OVERTAKE_HOLD = 0.6; // s a gained place must hold before it's announced

// Who drives the player's kart: the autopilot on the title screen and after the flag,
// the player while racing, nobody on the grid.
export function controlsFor(game, state) {
  const speed = game.kart.telemetry.speed;
  if (state === 'title') return game.autopilot.controls(game.kart.state, speed);
  if (state === 'finished') return game.autopilot.controls(game.kart.state, speed, FINISH_COOLDOWN.maxSpeed);
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

// Toast a gained place once it has held for a moment (no flicker when side by side).
function announceOvertakes(game, dt) {
  const pos = game.field.position(game.field.player);
  if (pos !== game.heldPosition) [game.heldPosition, game.positionAge] = [pos, 0];
  game.positionAge += dt;
  if (game.positionAge >= OVERTAKE_HOLD && pos !== game.lastPosition) {
    if (pos < game.lastPosition && game.session.state === 'racing' && game.session.timer.lap >= 1) {
      game.bus.emit('overtake', pos);
    }
    game.lastPosition = pos;
  }
}

export function stepGame(game, dt) {
  game.input.poll();
  handleActions(game); // may load another track (new world, session, field): read them only after
  const { input, session, kart, world, camera } = game;
  const state = session.state;
  const paused = state === 'paused';
  const grandPrix = session.mode === 'race' || state === 'title';
  let wallHit = 0;
  if (!paused) {
    kart.update(game.controlsFor(state), dt);
    wallHit = kart.telemetry.impact; // barrier only: kart-to-kart contacts are added by the field below
    if (grandPrix) stepField(game, dt, state !== 'countdown');
    game.trackIndex = world.path.nearest(kart.state.x, kart.state.z, game.trackIndex);
    game.kerb.update(kart, world.path, world.curbs, game.trackIndex, dt);
    session.update(dt, game.trackIndex);
    if (state === 'racing') game.recorder.update(session.timer.lap, session.timer.lapTime(session.clock), kart.state);
    if (session.mode === 'race' && (state === 'racing' || state === 'finished')) {
      const done = game.field.update([game.trackIndex, ...game.rivals.map((r) => r.index)], session.clock);
      if (state === 'racing' && done.some((e) => e.isPlayer)) session.finish();
      announceOvertakes(game, dt);
    }
    game.fx.update(kart, dt, camera.three, game.renderer.three.domElement.height);
    game.impactCooldown -= dt;
    if (kart.telemetry.impact > IMPACT_MIN && game.impactCooldown <= 0) {
      game.bus.emit('impact', kart.telemetry.impact);
      game.impactCooldown = IMPACT_COOLDOWN;
    }
  }
  const view = session.view;
  game.ghost.update(view.lapTime, session.mode === 'timeattack' && state === 'racing' && view.lap >= 1, paused ? 0 : dt);
  world.gantry.setLights(session.lights, session.lightsMode);
  camera.update(kart, paused ? 0 : dt, game.kerb);
  kart.model.setFirstPerson(camera.mode === 'follow' && camera.view === 'cockpit');

  updateSound(game, dt, { paused, state, grandPrix, wallHit });
  game.hud.update(view, kart, game);
  game.screens.update(game);
  game.debug.update(dt, game);
  input.endFrame();
}
