// Per-frame audio for the player's kart and the pack: engine (revving on the grid), rival engines,
// tyres (squeal, brake scrub, barrier scrape) and the kerb rumble.

export function updateSound(game, dt, { paused, state, grandPrix, wallHit }) {
  const { kart, input } = game;
  const t = kart.telemetry;
  const active = !paused;
  const revs = state === 'countdown' ? input.controls().throttle : t.throttle; // rev on the grid
  game.engine.update(t, revs, dt, active);
  game.pack.update(kart.state, grandPrix ? game.rivals.map((r) => r.kart) : [], dt, active);
  game.tyres.update(t, paused ? 0 : dt, active, paused ? 0 : wallHit);
  game.rumble.update(game.kerb, active);
}
