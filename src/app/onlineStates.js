// Kart states between the game and NetRace (pure): what goes out about a kart run here, and what the
// physics sees of a kart run elsewhere.

// A kart run here (yours, or on the host an AI rival) → NetRace's { s, c, i, p, lap }.
// index: its nearest centreline sample; entry: its timing-field entry (progress, lap).
export function kartSnapshot(kart, index, entry) {
  const s = kart.state;
  return {
    s: [s.x, s.z, s.yaw, s.vx, s.vz, s.steer, s.yawRate, s.slipAngle ?? 0],
    c: [kart.telemetry.throttle ?? 0, kart.telemetry.brake ?? 0],
    i: index,
    p: entry?.progress ?? 0,
    lap: entry?.timer.lap ?? 0,
  };
}

// A kart run elsewhere (a NetRace state) as contacts, slipstream and the AI's traffic sense see it.
export function physicsView({ s, i }) {
  const [x, z, yaw, vx, vz] = s;
  return { state: { x, z, yaw, vx, vz }, index: i, speed: Math.hypot(vx, vz) };
}
