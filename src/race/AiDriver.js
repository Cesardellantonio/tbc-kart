// Rival driver: pure-pursuit along a racing line, speed from a braking plan along that line, pulls
// out to pass slower karts, covers the inside when one is close behind, backs off when boxed in, takes
// no two corners quite alike (and gets the odd one wrong: race/driverCraft.js), and asks for a reset
// when stuck against a wall.

import { AUTOPILOT, AI } from '../config/race.js';
import { clamp, damp } from '../core/math.js';
import { speedControl } from './speedControl.js';
import { drivingPlan, plannedSpeed } from './speedPlan.js';
import { passing, nextInside } from './passing.js';
import { preferredOffset } from './racingLine.js';
import { pursuitSteer } from './pursuit.js';
import { cornerMap, rollCorner, pressureFrom, defending } from './driverCraft.js';

const IDLE = { throttle: 0, brake: 0, steer: 0, handbrake: false };
const PERFECT = { pace: 1, sigma: 0, mistakes: 0 }; // the calibration driver (tools/ai-pace.mjs)

export class AiDriver {
  // profile: { skill, line, react, aggression } (see config/race.js RIVALS)
  constructor(path, line, profile, trackPace = 1) {
    this.profile = profile;
    this.level = PERFECT; // rival level (config/race.js DIFFICULTY): corner pace, scatter, mistakes
    this.setTrack(path, line, trackPace);
  }

  // path: TrackPath; line: racing-line offsets for it (race/racingLine.js); trackPace: the circuit's
  // skill multiplier (config/race.js TRACK_PACE), so skill 1 is equally quick on every circuit.
  setTrack(path, line, trackPace = 1) {
    Object.assign(this, { path, line, trackPace, plan: path && drivingPlan(path, line) });
    this.corners = path && cornerMap(this.plan, path);
    this.reset();
  }

  // random: source for the start reaction and the race-day form (seedable in the simulator).
  reset(random = Math.random) {
    this.index = -1;
    this.pass = 0; // current sideways offset for traffic (m)
    this.passMemo = { target: -1, side: 0, out: 0, wait: 0 };
    this.stuck = 0;
    this.wait = this.profile.react + random() * 0.12; // reaction time after the lights
    this.form = 1 + (random() - 0.5) * AI.formSpread; // good days and bad days
    this.random = random;
    this.qualifying ??= false; // set by the field (app/field.js): nobody defends in qualifying
    this.corner = -2; // the corner being approached (race/driverCraft.js cornerMap) …
    this.take = { factor: 1, mistake: null }; // … and how it is going to be taken
    this.defence = { corner: -1, side: 0, hold: 0, cool: 0 };
    this.log = { mistakes: 0, defences: 0 }; // for the simulator's report
    this.cover = 0; // 0..1: how far the aim has moved to cover the inside…
    this.coverSide = 0; // …of this side (-1 left / +1 right)
    this.covering = 0; // the side covered last frame (0 = not defending)
  }

  // traffic: [{ ahead (m along the track), lateral (m), speed }] for the other karts.
  // pace: skill multiplier for this frame (pack pull); go: false holds the kart on the grid.
  controls(state, speed, traffic, pace, dt, go = true) {
    if (!go) return IDLE;
    if ((this.wait -= dt) > 0) return IDLE;
    const p = this.path;
    this.index = p.nearest(state.x, state.z, this.index);
    const myLat = p.lateral(state.x, state.z, this.index);
    const skill = this.profile.skill * pace * this.form;
    const attacker = pressureFrom(traffic, myLat, speed);
    const corner = this.corners[this.index];
    if (corner !== this.corner) {
      this.corner = corner;
      this.take = rollCorner(this.level, !!attacker, this.random);
      if (this.take.mistake) this.log.mistakes++;
    }

    // Traffic: pull out beside a slower kart ahead (race/passing.js); follow it if there's no room.
    const inside = nextInside(p, this.index);
    const { pass, speedCap } = passing(this.passMemo, traffic, myLat, speed, dt, inside);
    this.pass = damp(this.pass, pass, AI.offsetRate, dt);
    // Defending: cover the inside of the next corner from a kart close behind (0..1 blend, eased).
    const aggression = this.profile.aggression ?? 0.5;
    const side = pass || this.qualifying ? 0 : defending(this.defence, attacker, inside, corner, aggression, dt, this.random);
    if (side && side !== this.covering) this.log.defences++;
    this.covering = side;
    if (side) this.coverSide = side;
    this.cover = damp(this.cover, side ? 1 : 0, AI.offsetRate, dt);

    // Aim at the racing line plus my own preferred offset — faded out in corners, so it only changes
    // where I sit on the straights and pace comes from skill alone — plus any pass offset; covering
    // the inside draws the aim from the line toward AI.defendInside m inside the centre.
    const look = Math.round((AUTOPILOT.lookAhead + speed * AUTOPILOT.lookSpeed) / p.spacing);
    const t = p.wrap(this.index + look);
    const own = preferredOffset(p, this.index, look, this.profile.line);
    const base = this.line[t] + (this.coverSide * AI.defendInside - this.line[t]) * this.cover;
    const lat = clamp(base + own + this.pass, -p.halfWidth + 0.85, p.halfWidth - 0.85);
    const aim = p.offset(t, lat);

    const attack = Math.abs(this.pass) > 1 ? 1 + AI.attack * (0.5 + aggression) : 1; // alongside: brake later
    const tight = 1 - (1 - AI.defendPace) * this.cover; // the inside line is the slower one
    const planned = plannedSpeed(this.plan, p, this.index, speed, {
      skill: skill * attack * tight * this.take.factor * this.trackPace * this.level.pace, // corners and braking
      ahead: AUTOPILOT.planAhead,
      maxSpeed: AUTOPILOT.maxSpeed, // same karts: everyone is flat out on the straights
    });
    const want = Math.min(planned, speedCap);
    const steer = pursuitSteer(state, aim, speed);

    this.stuck = speed < 1 ? this.stuck + dt : 0;
    return {
      ...speedControl(speed, want, steer, state.slipAngle),
      steer,
      handbrake: false,
      reset: this.stuck > AI.stuckTime,
    };
  }
}
