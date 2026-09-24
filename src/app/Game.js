// Composition root: builds every system once, owns the loop, and exposes game-level operations.
// Track-dependent parts (world, race session, field timing, records) are rebuilt by loadTrack().

import { EventBus } from '../core/events.js';
import { Renderer } from '../core/Renderer.js';
import { PostFX } from '../core/PostFX.js';
import { CameraRig } from '../core/CameraRig.js';
import { Input } from '../core/Input.js';
import { Kart } from '../entities/Kart.js';
import { Ghost } from '../entities/Ghost.js';
import { KartFx } from '../fx/KartFx.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { EngineSound } from '../audio/EngineSound.js';
import { PackSound } from '../audio/PackSound.js';
import { Sfx } from '../audio/Sfx.js';
import { RaceSession } from '../race/RaceSession.js';
import { RaceField } from '../race/RaceField.js';
import { GhostRecorder } from '../race/GhostRecorder.js';
import { Autopilot } from '../race/Autopilot.js';
import { loadRecord, recordKey } from '../race/storage.js';
import { Hud } from '../ui/Hud.js';
import { Screens } from '../ui/Screens.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { buildWorld } from './buildWorld.js';
import { disposeTree } from './dispose.js';
import { wireEvents } from './wireEvents.js';
import { createRivals, setFieldTrack, placeField } from './field.js';
import { stepGame, controlsFor, runLoop } from './frame.js';
import { TRACKS, trackById } from '../tracks/index.js';
import { RIVALS, PLAYER } from '../config/race.js';
import { LIVERY } from '../config/kart.js';

const LAST_TRACK_KEY = 'tbc-kart.track';

export class Game {
  constructor() {
    this.bus = new EventBus();
    this.renderer = new Renderer();
    this.camera = new CameraRig(window.innerWidth / window.innerHeight);
    const scene = this.renderer.scene;
    this.kart = new Kart(null);
    this.ghost = new Ghost();
    this.rivals = createRivals(scene);
    scene.add(this.kart.object3d, this.ghost.object3d);
    this.fx = new KartFx(scene);
    this.post = new PostFX(this.renderer, scene, this.camera.three);
    this.audio = new AudioEngine();
    this.engine = new EngineSound(this.audio);
    this.pack = new PackSound(this.audio);
    this.sfx = new Sfx(this.audio);
    this.recorder = new GhostRecorder();
    this.input = new Input();
    this.hud = new Hud(this.bus, this.input);
    this.screens = new Screens((name) => this.input.trigger(name));
    this.debug = new DebugOverlay();
    this.autopilot = new Autopilot(null);
    this.impactCooldown = 0;
    [this.lastPosition, this.heldPosition, this.positionAge] = [0, 0, 0]; // overtake announcements
    wireEvents(this);
    this.loadTrack(initialTrack());
    window.addEventListener('resize', () => this.resize());
  }

  // Swap the circuit in place: drop the old hall, build the new one, re-aim karts, AI, timing, HUD.
  loadTrack(track) {
    const scene = this.renderer.scene;
    if (this.world) {
      scene.remove(this.world.group);
      disposeTree(this.world.group);
    }
    this.track = track;
    this.world = buildWorld(track, this.renderer.maxAnisotropy);
    scene.add(this.world.group);
    const { path, startIndex, anchors } = this.world;
    this.camera.anchors = anchors;
    setFieldTrack(this);
    this.signature = `${path.count}:${path.length.toFixed(1)}`; // invalidates records if the layout changes
    this.recordKey = recordKey(track.id);
    this.record = loadRecord(this.signature, this.recordKey);
    this.session = new RaceSession(path.count, startIndex, this.bus, this.record, track.laps);
    this.field = new RaceField(path.count, startIndex, track.laps, [
      { ...PLAYER, color: LIVERY.body, isPlayer: true },
      ...RIVALS.map((p) => ({ code: p.code, name: p.name, color: p.body, profile: p, isPlayer: false })),
    ]);
    this.hud.setTrack(path, startIndex, track.laps);
    const position = TRACKS.indexOf(track);
    this.screens.setTrack(track, path, startIndex, position, TRACKS.length, this.record.best);
    for (const r of this.rivals) r.fx.reset();
    placeField(this, true);
    this.camera.broadcast();
    remember(track.id);
  }

  // Step through the track list (wraps around).
  selectTrack(offset) {
    const i = TRACKS.indexOf(this.track);
    this.loadTrack(TRACKS[(i + offset + TRACKS.length) % TRACKS.length]);
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

// ?track=<id> in the URL wins, then the last track played, then the home track.
function initialTrack() {
  const fromUrl = new URLSearchParams(window.location.search).get('track');
  let saved = null;
  try {
    saved = localStorage.getItem(LAST_TRACK_KEY);
  } catch {
    // storage unavailable
  }
  return trackById(fromUrl ?? saved ?? 'tbc');
}

function remember(id) {
  try {
    localStorage.setItem(LAST_TRACK_KEY, id);
  } catch {
    // storage unavailable
  }
}
