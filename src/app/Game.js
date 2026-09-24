// Composition root: builds every system once, owns the loop, and exposes game-level operations.

import { EventBus } from '../core/events.js';
import { Renderer } from '../core/Renderer.js';
import { PostFX } from '../core/PostFX.js';
import { CameraRig } from '../core/CameraRig.js';
import { Input } from '../core/Input.js';
import { Kart } from '../entities/Kart.js';
import { KartFx } from '../fx/KartFx.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { EngineSound } from '../audio/EngineSound.js';
import { Sfx } from '../audio/Sfx.js';
import { RaceSession } from '../race/RaceSession.js';
import { Autopilot } from '../race/Autopilot.js';
import { loadRecord } from '../race/storage.js';
import { Hud } from '../ui/Hud.js';
import { Screens } from '../ui/Screens.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { buildWorld } from './buildWorld.js';
import { wireEvents } from './wireEvents.js';
import { stepGame, controlsFor, runLoop } from './frame.js';

export class Game {
  constructor() {
    this.bus = new EventBus();
    this.renderer = new Renderer();
    this.camera = new CameraRig(window.innerWidth / window.innerHeight);
    this.world = buildWorld(this.renderer.scene, this.renderer.maxAnisotropy);
    const { path, startIndex, anchors, collider } = this.world;
    this.camera.anchors = anchors;
    this.kart = new Kart(collider);
    this.renderer.scene.add(this.kart.object3d);
    this.fx = new KartFx(this.renderer.scene);
    this.post = new PostFX(this.renderer, this.renderer.scene, this.camera.three);
    this.audio = new AudioEngine();
    this.engine = new EngineSound(this.audio);
    this.sfx = new Sfx(this.audio);
    this.signature = `${path.count}:${path.length.toFixed(1)}`; // invalidates records if the track changes
    this.session = new RaceSession(path.count, startIndex, this.bus, loadRecord(this.signature));
    this.hud = new Hud(path, startIndex, this.bus);
    this.screens = new Screens(path.length, this.session.timer.best);
    this.debug = new DebugOverlay();
    this.autopilot = new Autopilot(path);
    this.input = new Input();
    this.impactCooldown = 0;
    wireEvents(this);
    this.placeOnGrid();
    window.addEventListener('resize', () => this.resize());
  }

  placeOnGrid() {
    const { path, gridIndex } = this.world;
    this.kart.place(path.x[gridIndex], path.z[gridIndex], path.heading(gridIndex));
    this.trackIndex = gridIndex;
    this.fx.reset();
  }

  resize() {
    const [w, h] = [window.innerWidth, window.innerHeight];
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
    this.camera.setAspect(w / h);
  }

  controlsFor = (state) => controlsFor(this, state);
  step = (dt) => stepGame(this, dt);

  start() {
    runLoop(this);
  }

  // Deterministic stepping for debugging and automated checks.
  advance(seconds, dt = 1 / 60) {
    for (let t = 0; t < seconds; t += dt) this.step(dt);
    this.post.render(dt);
  }
}
