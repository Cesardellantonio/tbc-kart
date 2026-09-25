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
import { TyreSound } from '../audio/TyreSound.js';
import { KerbRumble } from '../audio/KerbRumble.js';
import { KerbFeel } from '../fx/KerbFeel.js';
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
import { TRACKS } from '../tracks/index.js';
import { chooseTrack, recordSignature } from './trackChoice.js';
import { RIVALS, PLAYER, DIFFICULTY, DEFAULT_DIFFICULTY } from '../config/race.js';
import { LIVERY } from '../config/kart.js';

const LAST_TRACK_KEY = 'tbc-kart.track';
const LEVEL_KEY = 'tbc-kart.level';

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
    this.kerb = new KerbFeel(); // player's kerb contact: body ride, camera judder, rumble
    this.post = new PostFX(this.renderer, scene, this.camera.three);
    this.audio = new AudioEngine();
    this.engine = new EngineSound(this.audio);
    this.pack = new PackSound(this.audio);
    this.sfx = new Sfx(this.audio);
    this.tyres = new TyreSound(this.audio);
    this.rumble = new KerbRumble(this.audio);
    this.recorder = new GhostRecorder();
    this.input = new Input();
    this.hud = new Hud(this.bus, this.input);
    this.screens = new Screens((name) => this.input.trigger(name));
    this.difficulty = savedLevel();
    this.screens.bindLevels(this.difficulty, (level) => this.setDifficulty(level));
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
    this.signature = recordSignature(track, path, startIndex); // invalidates records if the layout changes
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
    this.camera.broadcast(this.kart); // cut into the new hall (a following start swoops from here)
  }

  // Step through the track list (wraps around). The pick is remembered, and a ?track= in the URL
  // follows it, so a reload keeps the menu choice.
  // Rival level (config/race.js DIFFICULTY) for every race from now on; remembered in the browser.
  setDifficulty(level) {
    this.difficulty = level;
    for (const r of this.rivals) r.driver.difficulty = DIFFICULTY[level].pace;
    store(LEVEL_KEY, level);
  }

  selectTrack(offset) {
    const i = TRACKS.indexOf(this.track);
    this.loadTrack(TRACKS[(i + offset + TRACKS.length) % TRACKS.length]);
    remember(this.track.id);
    const url = new URL(window.location.href);
    if (url.searchParams.has('track')) {
      url.searchParams.set('track', this.track.id);
      window.history.replaceState(window.history.state, '', url);
    }
  }

  resize() {
    const [w, h] = [window.innerWidth, window.innerHeight];
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
    this.camera.setAspect(w / h);
    this.hud.resize();
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

// ?track=<id> in the URL wins, then the last track played, then the home track. An unknown id is
// reported and ignored — it never overwrites the saved choice.
function initialTrack() {
  const urlId = new URLSearchParams(window.location.search).get('track');
  let saved = null;
  try {
    saved = localStorage.getItem(LAST_TRACK_KEY);
  } catch {
    // storage unavailable
  }
  const { track, fromUrl, unknown } = chooseTrack(urlId, saved, TRACKS);
  if (unknown) console.warn(`?track=${unknown}: no such track (${TRACKS.map((t) => t.id).join(', ')})`);
  if (fromUrl) remember(track.id);
  return track;
}

function remember(id) {
  store(LAST_TRACK_KEY, id);
}

function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

function savedLevel() {
  let level = null;
  try {
    level = localStorage.getItem(LEVEL_KEY);
  } catch {
    // storage unavailable
  }
  return DIFFICULTY[level] ? level : DEFAULT_DIFFICULTY;
}
