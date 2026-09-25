# TBC Kart — indoor kart racing in Three.js

**▶ Play online: https://cesardellantonio.github.io/tbc-kart-play/**

A kart racing game set in an indoor karting hall, on a layout traced from the **TBC Indoor Racing** track in Vancouver. Vanilla JavaScript + Three.js, no framework, built one session at a time as a learning project.

- **v0.1–v0.2** — outdoor box car → indoor kart on a painted TBC trace
- **v0.3–v0.7** — collision, HUD, shadows, spinning wheels, bloom, audio, tests
- **v1.0** — look & feel overhaul: real-scale track with barriers, drift physics, detailed kart + driver, lap timing with live delta, start lights, title attract mode, venue lighting, particles, synthesized sound
- **v2.0** — Grand Prix (current): 5-lap races against five AI rivals, kart-to-kart contact, slipstream, live timing tower, results screen, best-lap ghost in time attack, touch controls for phones

## Run

```bash
npm install
npm run dev      # open the URL Vite prints (usually http://localhost:5173)
npm test         # 25 unit tests: physics, track, barriers, lap timing, contacts, race order, AI line, ghost
npm run build    # production bundle in dist/
```

**Publishing:** this repo is private, so the playable build lives in the public repo `Cesardellantonio/tbc-kart-play` (GitHub Pages, `main` branch root). To update it, run `npm run build`, copy `dist/` over that repo's contents (keep its `README.md` and `.nojekyll`), commit and push.

## How to play

Pick a mode on the title screen (`←` `→`, then **Enter** — or click / tap a mode):

- **Grand Prix** — a race of about two and a half minutes (each circuit sets its lap count) against five rivals, from 5th on the grid. Tuck in behind a kart to catch its slipstream (the speedo shows **SLIPSTREAM**), then pull out and pass. Rubbing is racing: karts bump and shove each other. The timing tower shows the running order and real time gaps; the results card fills in as the field takes the flag.
- **Time Attack** — alone on track against the clock. Your best lap is saved in the browser (shown in purple) along with a translucent **ghost** of that lap to chase.

On a phone or tablet, on-screen buttons appear: steer bottom-left, gas / brake / drift bottom-right, camera and pause at the top.

| Key | Action |
|---|---|
| `W` / `↑` | Throttle |
| `S` / `↓` | Brake, then reverse once stopped |
| `A` `D` / `←` `→` | Steer |
| `Space` / `Shift` | Handbrake — tap into tight corners to drift (a press locks the rear for a moment; holding it on does not) |
| `C` | Camera: chase → far → cockpit |
| `R` | Reset kart onto the track (restart when paused) |
| `M` | Sound on/off |
| `Esc` / `P` | Pause (then `R` restart, `Q` menu) |
| `` ` `` / `F3` | Developer overlay |

A standard gamepad works too: left stick steers, RT throttle, LT brake, A handbrake, Y camera, Back reset, Start pause.

## What's in it

- **Track**: 249 m lap, 6 m wide asphalt with edge lines, red/white curbs on the inside of every tight corner, a checkered start/finish line, and a grid box. Rounded plastic barriers line both sides and actually stop you.
- **Physics**: velocity-based kart model. Tyre grip scrubs sideways speed, and the handbrake lets the rear slide. Steering is speed-sensitive, braking is strong, and reverse is slow. It steps in fixed 1/120 s substeps, and barrier collisions bounce and slide with friction (a brush costs little, a hard hit or riding the wall a lot).
- **Kart**: low-poly chassis, nose cone with number plate, side pods, engine, and a driver in a helmet. Wheels spin and steer, the body rolls and pitches with load, and the driver's head leans into corners.
- **Venue**: concrete floor with slab joints, ribbed-metal walls with an accent stripe and neon, banners, roof trusses, LED panels with floor light pools, and a start gantry with real start lights.
- **Look**: ACES tone mapping, a custom reflection environment of the hall itself, soft shadows, tight bloom, a colour grade with vignette, and 4× MSAA.
- **Feel**: speed-driven FOV, a chase camera that swings to show your drift angle, impact shake, tyre smoke, skid marks, and sparks.
- **Race**: title attract mode with TV-style trackside cameras, F1-style start lights (gantry and HUD), lap timing with sub-frame line crossing, a live delta to your best lap, and a persisted record.
- **Rivals**: five AI drivers with their own liveries, pace, preferred line and start reactions. They follow a least-curvature racing line (outside–inside–outside, `race/racingLine.js`), brake as late as a speed plan along that line allows (`race/speedPlan.js`), tuck into a slower kart's slipstream and then pull out to the inside of the next corner to pass it, dropping back in line to try again if a move doesn't stick (`race/passing.js`), back off when boxed in, and reset themselves if stuck. Skill is a straight pace setting, and each circuit's rival pace is calibrated so a skill-1 rival laps the same 6 % off that circuit's reference lap (`config/race.js` → `TRACK_PACE`, regenerated by `node tools/ai-pace.mjs`). A light pack pull keeps races close, and a shuffled grid plus a random form factor change the order from race to race.
- **Race physics**: equal-mass kart-to-kart contacts (push apart, trade momentum, sparks and shake), and slipstream that cuts up to 55% of aero drag within 9 m behind another kart.
- **Sound** (all synthesized with WebAudio, no files): a single-cylinder rental-kart engine behind a centrifugal clutch (lumpy idle, revs hang at the bite point on launch then climb with road speed, flare when the rear steps out, pops and crackles on a high-rev lift), tyre squeal that grows with cornering load and slip, a juddering scrub under hard braking, a scrape when grinding a barrier, a kerb rumble, impacts, start beeps, and lap chimes.
- **Kerbs you can feel**: ride a kerb and the kart hops and tilts over the ribs, the camera judders and the rumble plays at the rib rate. A per-sample kerb table (`track/curbTable.js`) keeps the check O(1) per frame.
- **Cockpit head**: in the cockpit view the driver's head sways and tilts against lateral g, surges and nods under braking, and looks into the corner with the steering. Chase views get a fine speed-dependent engine buzz.
- **Rubbered-in line**: a soft, streaky darker band follows the AI racing line (darker where it's loaded hardest), with faint rear-tyre marks in the main braking zones.

## Architecture

```
src/
  main.js              entry: fonts, HUD css, new Game(), dev handles
  app/                 game-specific orchestration
    Game.js            composition root — builds every system once
    frame.js           the per-frame pipeline + rAF loop
    buildWorld.js      static scene from the track definition
    actions.js         one-shot inputs (start, pause, reset, camera, mute)
    wireEvents.js      event bus → sound, shake, saved record, screens
    anchors.js         trackside TV-camera positions for the title screen
    field.js           rival karts: grid, AI stepping, contacts and slipstream
  config/              every tunable value, grouped by topic (no magic numbers elsewhere)
    trackWaypoints.js  the TBC layout in metres (data only)
    track · physics · kart · camera · render · venue · audio · input · race
  core/                engine-level pieces, no game rules
    Renderer · PostFX · GradeShader · venueEnvironment
    CameraRig → FollowCam (+ HeadMotion) · BroadcastCam · CameraShake · CameraVibe (+ pure cameraModes)
    Input · events (EventBus) · math
  track/               centreline geometry shared by everything
    TrackPath          sampled spline: nearest(), offset(), lateral(), curvature
    offsetChain        clean barrier lines (cuts corner loops, keeps off the asphalt)
    stripGeometry      flat strips for asphalt, paint, curbs and the rubbered line (optional vertex alpha)
    curbRuns · curbTable  where the curbs are, and a per-sample lookup for "which wheels are on a kerb"
    brakingZones       lap speed profile → where karts brake hard (tyre marks)
    bounds             venue size from the barriers + a wall loop collider
  physics/             kartPhysics (pure single-track step) · tyres · axles · controls · BarrierCollider (circle vs segments, grid)
                       kartContacts (kart vs kart, slipstream)
  entities/            Kart (state + substeps) · KartModel (animation) · Ghost · model/ parts
  world/               Floor · TrackSurface · RubberLine (+ BrakeMarks) · Curbs · Barriers · Venue · Rig · Banners
                       Lighting · StartGantry · textures/ (all procedural canvas textures)
  fx/                  Particles (+ shader) · SkidMarks · KartFx · KerbFeel (kerb contact + kart ride)
  audio/               AudioEngine · EngineSound (engineRpm clutch model + engineVoice graph + Backfire)
                       PackSound (rival engines) · TyreSound · KerbRumble · Sfx (one-shots) · nodes
  race/                RaceSession (state machine) · LapTimer (pure) · storage · Autopilot
                       RaceField (order, gaps, finish) · AiDriver · racingLine · GhostRecorder
  ui/                  Hud · LapPanel · Standings · Speedo · Minimap · StartLights · Toasts
                       Screens · Results · TouchControls
                       DebugOverlay · format · dom · hud.css
  debug/topdown.js     overhead view of the whole hall (dev)
tests/                 physics · track · race
```

Each module has one job and stays at or under 80 lines, so when one grows past that it gets split. Data flows one way through `app/frame.js`:

1. **input** → actions (start / pause / reset / camera)
2. **kart** physics substeps + barrier collisions
3. **race session** (lights, lap timing)
4. **FX**
5. **camera**
6. **audio**
7. **HUD**
8. **render** (post-processing)

Cross-cutting events go through the bus: `countdown`, `light`, `go`, `lap`, `finish`, `overtake`, `impact`, `pause`, `reset`, `camera`, `mute`.

## Tuning

| Want to change… | Edit |
|---|---|
| Top speed, acceleration, braking | `config/physics.js` → `ENGINE_ACCEL`, `TOP_SPEED`, `BRAKE_FORCE` (rear brakes only) |
| How grippy / drifty it feels | `config/physics.js` → `MU_FRONT` / `MU_REAR`, `TYRE_SHAPE`, `TYRE_SLIDE_MIN`, `COG_HEIGHT`, `REAR_WEIGHT` (single-track tyre model) |
| Steering and drift help | `config/physics.js` → `STEER_LOCK`, `STEER_LIMIT_*`, `STEER_IN` / `STEER_OUT`, `STEER_ASSIST` (countersteer assist 0..1) |
| Camera distance, FOV kick, shake | `config/camera.js` |
| Cockpit head motion, engine / kerb vibration | `config/camera.js` → `HEAD`, `VIBE` |
| Engine revs, clutch, pops; tyre / kerb sounds | `config/audio.js` → `ENGINE`, `BACKFIRE`, `TYRES`, `KERB_RUMBLE` |
| Kerb hop and tilt | `config/kart.js` → `KERB_RIDE` |
| Rubbered line and brake marks | `config/track.js` → `RUBBER_LINE`, `BRAKE_MARKS` |
| Brightness, bloom, colour grade | `config/render.js` |
| Kart colours / number | `config/kart.js` → `LIVERY`, `KART_NUMBER` |
| Track shape | `config/trackWaypoints.js` (keep radii ≥ 3.5 m; `npm test` checks the barriers) |
| Banner texts, neon colours, lights | `config/venue.js` |
| Race length | the track file's `laps` (about 140 s of racing; `tests/tracks.test.js` checks it) |
| Grid slot, rival names / colours / pace | `config/race.js` → `GRID`, `RIVALS` |
| AI pace (difficulty) | `config/race.js` → `AI.paceMargin` (then `node tools/ai-pace.mjs` → `TRACK_PACE`), `RIVALS` skills |
| AI line, passing, pack pull, slipstream, contact | `config/race.js` → `AI`, `DRAFT`, `CONTACT` |

## Where to add X

| Want to add… | Touch these files |
|---|---|
| Another rival | add an entry to `RIVALS` in `config/race.js` (and a grid slot in `app/field.js`) |
| New HUD widget | new file in `ui/`, compose it in `ui/Hud.js` |
| New sound | method in `audio/Sfx.js`, subscribe in `app/wireEvents.js` |
| New scenery | new file in `world/`, add it in `app/buildWorld.js` |
| New key | `config/input.js` (+ handle it in `app/actions.js`) |

## Developer tools

The `` ` `` key shows frame rate, draw calls, and kart telemetry (plus a stats.js panel in dev). In dev builds the console has:

```js
__debug.topdown();         // overhead view of the whole hall
__debug.chase();           // back to the normal camera
__debug.advance(5);        // simulate 5 s instantly
__debug.teleport(x, z);    // move the kart
```

## Not yet

No online multiplayer, no championship across several races, and no track editor. Each would be a good next session.
