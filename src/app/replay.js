// Replays: the race recorded while it runs (race/replay.js), played back on the real karts — their
// models, tyre smoke / ion motes, engine sound — with TV cameras and a director that cuts to the closest
// battle, or any driver in chase, far or onboard view. Watching freezes the race; closing puts every
// kart back exactly where it was.

import { ReplayRecorder } from '../race/replay.js';
import { REPLAY } from '../config/race.js';
import { ReplayBar } from '../ui/ReplayBar.js';

const CAMS = ['tv', 'chase', 'far', 'cockpit'];
const CAM_LABEL = { tv: 'TV', chase: 'CHASE', far: 'FAR', cockpit: 'ONBOARD' };

export class Replay {
  constructor(game) {
    this.game = game;
    this.recorder = new ReplayRecorder();
    this.bar = new ReplayBar((act, arg) => this.act(act, arg));
    this.active = false;
    this._sample = {};
  }

  // Everyone on track this session (you first). Called when the start lights begin.
  begin(solo) {
    this.karts = solo ? [this.game.kart] : [this.game.kart, ...this.game.rivals.map((r) => r.kart)];
    this.names = solo ? ['You'] : ['You', ...this.game.rivals.map((r) => r.profile.name)];
    this.fx = solo ? [this.game.fx] : [this.game.fx, ...this.game.rivals.map((r) => r.fx)];
    this.recorder.reset(this.karts.length);
    this.indices = this.karts.map(() => -1);
  }

  // Each simulated frame while the lights / race / cool-down run.
  record(dt) {
    if (!this.karts) return;
    const { session } = this.game;
    this.recorder.record(dt, this.karts, session.lights, session.lightsMode);
  }

  get available() {
    return !!this.karts && this.recorder.duration > 2;
  }

  open() {
    if (!this.available || this.active) return;
    const g = this.game;
    this.saved = this.karts.map((k) => ({ state: k.state, telemetry: { ...k.telemetry } }));
    Object.assign(this, { active: true, t: 0, speed: 1, paused: false, target: 0, cam: 'tv', auto: true, _hold: 0 });
    g.screens.showResults(false);
    g.screens.showSeason(false);
    g.hud.setVisible(false);
    g.ghost.object3d.visible = false;
    for (const fx of this.fx) fx.reset();
    this._camera();
    this.bar.show(true);
  }

  close() {
    if (!this.active) return;
    const g = this.game;
    this.active = false;
    this.bar.show(false);
    this.karts.forEach((k, i) => {
      k.state = this.saved[i].state;
      Object.assign(k.telemetry, this.saved[i].telemetry);
      k.model.update(k.state, k.telemetry, 0, true);
    });
    g.camera.broadcast(g.kart);
    g.screens.showResults(true);
  }

  // Button / key actions from the bar or the keyboard.
  act(name, arg) {
    const end = this.recorder.duration;
    if (name === 'pause') this.paused = !this.paused;
    else if (name === 'back') this.t = Math.max(0, this.t - REPLAY.seek);
    else if (name === 'fwd') this.t = Math.min(end, this.t + REPLAY.seek);
    else if (name === 'seek') this.t = Math.max(0, Math.min(end, arg * end));
    else if (name === 'slower' || name === 'faster') {
      const i = REPLAY.speeds.indexOf(this.speed) + (name === 'faster' ? 1 : -1);
      this.speed = REPLAY.speeds[Math.max(0, Math.min(REPLAY.speeds.length - 1, i))];
    } else if (name === 'cam') {
      this.cam = CAMS[(CAMS.indexOf(this.cam) + 1) % CAMS.length];
      this._camera();
    } else if (name === 'prev' || name === 'next') {
      this.auto = false;
      this.target = (this.target + (name === 'next' ? 1 : -1) + this.karts.length) % this.karts.length;
      this._camera();
    } else if (name === 'director') {
      this.auto = true;
    } else if (name === 'exit') this.close();
    if (name === 'back' || name === 'fwd' || name === 'seek') for (const fx of this.fx) fx.reset();
  }

  // Keyboard / pad while watching.
  handle(input) {
    const map = { replayPause: 'pause', replayBack: 'back', replayFwd: 'fwd', replaySlower: 'slower', replayFaster: 'faster', camera: 'cam', replayPrev: 'prev', replayNext: 'next', replayDirector: 'director' };
    for (const [action, name] of Object.entries(map)) if (input.action(action)) this.act(name);
    if (input.action('pause') || input.action('raceAgain') || input.action('replay')) this.close();
  }

  _camera() {
    const g = this.game;
    const kart = this.karts[this.target];
    if (this.cam === 'tv') g.camera.broadcast(kart);
    else {
      g.camera.followCam.view = this.cam;
      g.camera.follow(kart);
      g.camera._swoop = 1; // a cut, not a swoop
    }
  }

  // Director: every few seconds, the kart in the closest fight (by distance to the kart ahead of it).
  _direct(dt) {
    if (!this.auto || this.karts.length < 2) return;
    this._hold -= dt;
    if (this._hold > 0) return;
    const { path } = this.game.world;
    const at = this.karts.map((k, i) => (this.indices[i] = path.nearest(k.state.x, k.state.z, this.indices[i])));
    let best = this.target;
    let bestGap = Infinity;
    this.karts.forEach((k, i) => {
      for (let j = 0; j < this.karts.length; j++) {
        if (j === i) continue;
        let d = (at[j] - at[i]) * path.spacing; // j ahead of i by d metres along the track
        if (d < -path.length / 2) d += path.length;
        if (d > 0.5 && d < bestGap && Math.hypot(k.state.vx, k.state.vz) > 3) [best, bestGap] = [i, d];
      }
    });
    if (bestGap > REPLAY.battle) best = 0; // no close fight: follow you
    const [lo, hi] = REPLAY.directorHold;
    this._hold = lo + ((this.t * 7.3) % 1) * (hi - lo);
    if (best !== this.target) {
      this.target = best;
      this._camera();
    }
  }

  // One displayed frame of the replay.
  frame(dt) {
    const g = this.game;
    const end = this.recorder.duration;
    if (!this.paused) this.t = Math.min(end, this.t + dt * this.speed);
    if (this.t >= end) this.paused = true;
    const step = this.paused ? 0 : dt * this.speed;
    const s = this._sample;
    this.karts.forEach((k, i) => {
      this.recorder.sample(this.t, i, s);
      k.state = { ...k.state, x: s.x, z: s.z, yaw: s.yaw, steer: s.steer, vx: s.vx, vz: s.vz, yawRate: 0 };
      Object.assign(k.telemetry, {
        speed: Math.hypot(s.vx, s.vz), forwardSpeed: s.forwardSpeed, latAccel: s.latAccel, longAccel: s.longAccel,
        throttle: s.throttle, brake: s.brake, slip: s.slip, rpm: s.rpm, impact: 0, wheelSpeed: undefined,
      });
      k.model.update(k.state, k.telemetry, step);
      if (step > 0) this.fx[i].update(k, step, g.camera.three, g.renderer.three.domElement.height);
    });
    this._direct(dt);
    const { lights, lightsMode } = this.recorder.lightsAt(this.t);
    g.world.gantry.setLights(lights, lightsMode);
    const kart = this.karts[this.target];
    g.world.lighting.follow(kart.state.x, kart.state.z);
    g.world.update?.(dt);
    g.camera.update(kart, dt);
    g.post.setFocus(this.cam === 'tv' ? g.camera.three.position.distanceTo(kart.object3d.position) : null);
    kart.model.setFirstPerson(this.cam === 'cockpit');
    g.engine.update(kart.telemetry, kart.telemetry.throttle, step, step > 0);
    g.tyres.update(kart.telemetry, step, step > 0, 0);
    g.pack.update(kart.state, this.karts.filter((k) => k !== kart), step, step > 0);
    this.bar.update({
      t: this.t, end, speed: this.speed, paused: this.paused, cam: CAM_LABEL[this.cam],
      driver: this.names[this.target], auto: this.auto,
    });
  }
}
