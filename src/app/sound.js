// Per-frame audio for the player's kart and the pack: engine (revving on the grid), rival engines
// (online: every other kart on track), tyres (squeal, brake scrub, barrier scrape) and the kerb rumble.

export function updateSound(game, dt, { paused, state, grandPrix, wallHit }) {
  const { kart, input } = game;
  const t = kart.telemetry;
  const active = !paused;
  const revs = state === 'countdown' ? input.controls().throttle : t.throttle; // rev on the grid
  game.engine.update(t, revs, dt, active);
  const pack = game.online.active ? game.online.others : grandPrix ? game.rivals : []; // others on track
  game.pack.update(kart.state, pack.map((r) => r.kart), dt, active);
  game.tyres.update(t, paused ? 0 : dt, active, paused ? 0 : wallHit);
  game.rumble.update(game.kerb, active);
}
