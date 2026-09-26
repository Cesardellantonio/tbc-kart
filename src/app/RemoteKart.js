// Another driver's kart as this browser shows it: a Kart model in that driver's livery, posed each
// frame from the network state (no physics here). The telemetry a local kart would have is rebuilt
// from the velocities, so the body rolls and pitches, the wheels spin and steer, the tyres smoke and
// mark, and the pack sound revs it like any kart on track.

import { Kart } from '../entities/Kart.js';
import { liveryByBody } from '../net/roster.js';
import { disposeTree } from './dispose.js';
import { forwardFromYaw, damp } from '../core/math.js';
import { REMOTE_SLIDE_ANGLE, REMOTE_ACCEL_RATE } from '../config/net.js';

export class RemoteKart {
  // entry: a roster entry { id, livery (body colour), number, … }; fx: a KartFx lent by the pool.
  constructor(scene, entry, fx) {
    this.kart = new Kart(null, lookOf(entry));
    this.key = lookKey(entry);
    this.profile = { body: entry.livery }; // what the minimap reads (as it does a rival's profile)
    this.fx = fx;
    this.index = 0; // nearest centreline sample, as its owner reported it
    this.t = null; // host time the kart is drawn at (null: still on its grid spot)
    scene.add(this.kart.object3d);
  }

  place(spot) {
    this.kart.place(spot.x, spot.z, spot.yaw);
    this.kart.object3d.visible = true;
    this.index = spot.i;
    this.t = null;
    this.fx.reset();
  }

  // st: { s: [x, z, yaw, vx, vz, steer, yawRate, slipAngle], c: [throttle, brake], i, t } from NetRace.
  draw(st, dt) {
    const [x, z, yaw, vx, vz, steer, yawRate, slipAngle] = st.s;
    const { kart } = this;
    const tel = kart.telemetry;
    const f = forwardFromYaw(yaw);
    const forward = vx * f.x + vz * f.z;
    const accel = dt > 0 ? (forward - tel.forwardSpeed) / dt : 0;
    kart.state = { x, z, yaw, vx, vz, steer, yawRate, slipAngle };
    Object.assign(tel, {
      speed: Math.hypot(vx, vz),
      forwardSpeed: forward,
      slip: Math.abs(vx * f.z - vz * f.x), // sideways speed, as the physics reports it
      sliding: Math.abs(slipAngle) > REMOTE_SLIDE_ANGLE,
      longAccel: damp(tel.longAccel, accel, REMOTE_ACCEL_RATE, dt) || 0,
      latAccel: forward * yawRate, // + = toward the left, like kartPhysics
      yawRate,
      slipAngle,
      throttle: st.c[0],
      brake: st.c[1],
      steer,
    });
    kart.model.update(kart.state, tel, dt);
    [this.index, this.t] = [st.i, st.t];
  }

  dispose(scene) {
    scene.remove(this.kart.object3d);
    disposeTree(this.kart.object3d);
  }
}

// Two roster entries can share one model when they look the same.
export const lookKey = (entry) => `${entry.livery}:${entry.number}`;

// A roster entry's kart look: its colour dresses the bodywork and helmet, as the rivals' do.
export function lookOf(entry) {
  const { body, suit, stripe } = liveryByBody(entry.livery);
  return { number: entry.number, livery: { body, suit, helmet: body, helmetStripe: stripe } };
}

// Your own kart in your room colours (entry), or back in the player's default look (null).
export function dressOwnKart(game, entry) {
  const key = entry ? lookKey(entry) : null;
  if ((game.kartLook ?? null) === key) return;
  game.kartLook = key;
  disposeTree(game.kart.setLook(entry ? lookOf(entry) : {}));
}
