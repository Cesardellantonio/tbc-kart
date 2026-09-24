# TBC Kart — indoor kart racing in Three.js

A time-attack kart game set in an indoor karting hall, on a layout traced from the **TBC Indoor Racing** track in Vancouver. Vanilla JavaScript + Three.js, no framework, built one session at a time as a learning project.

- **v0.1–v0.2** — outdoor box car → indoor kart on a painted TBC trace
- **v0.3–v0.7** — collision, HUD, shadows, spinning wheels, bloom, audio, tests
- **v1.0** — look & feel overhaul (current): real-scale track with barriers, drift physics, detailed kart + driver, lap timing with live delta, start lights, title attract mode, venue lighting, particles, synthesized sound

## Run

```bash
npm install
npm run dev      # open the URL Vite prints (usually http://localhost:5173)
npm test         # 17 unit tests: physics, track geometry, barriers, lap timing
npm run build    # production bundle in dist/
```

## How to play

Press **Enter** on the title screen. Wait for the five red lights to go out, then set the fastest lap you can. Your best lap is saved in the browser and shown in purple.

| Key | Action |
|---|---|
| `W` / `↑` | Throttle |
| `S` / `↓` | Brake, then reverse once stopped |
| `A` `D` / `←` `→` | Steer |
| `Space` / `Shift` | Handbrake — tap into tight corners to drift |
| `C` | Camera: chase → far → cockpit |
| `R` | Reset kart onto the track (restart when paused) |
| `M` | Sound on/off |
| `Esc` / `P` | Pause |
| `` ` `` / `F3` | Developer overlay |

A standard gamepad works too: left stick steers, RT throttle, LT brake, A handbrake, Y camera, Back reset, Start pause.

## What's in it

- **Track**: 249 m lap, 6 m wide asphalt with edge lines, red/white curbs on the inside of every tight corner, a checkered start/finish line, and a grid box. Rounded plastic barriers line both sides and actually stop you.
- **Physics**: velocity-based kart model. Tyre grip scrubs sideways speed, and the handbrake lets the rear slide. Steering is speed-sensitive, braking is strong, and reverse is slow. It steps in fixed 1/120 s substeps, and barrier collisions bounce and scrape.
- **Kart**: low-poly chassis, nose cone with number plate, side pods, engine, and a driver in a helmet. Wheels spin and steer, the body rolls and pitches with load, and the driver's head leans into corners.
- **Venue**: concrete floor with slab joints, ribbed-metal walls with an accent stripe and neon, banners, roof trusses, LED panels with floor light pools, and a start gantry with real start lights.
- **Look**: ACES tone mapping, a custom reflection environment of the hall itself, soft shadows, tight bloom, a colour grade with vignette, and 4× MSAA.
- **Feel**: speed-driven FOV, a chase camera that swings to show your drift angle, impact shake, tyre smoke, skid marks, and sparks.
- **Race**: title attract mode with TV-style trackside cameras, F1-style start lights (gantry and HUD), lap timing with sub-frame line crossing, a live delta to your best lap, and a persisted record.
- **Sound** (all synthesized with WebAudio, no files): engine with throttle and RPM, tyre screech, impacts, start beeps, and lap chimes.

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
  config/              every tunable value, grouped by topic (no magic numbers elsewhere)
    trackWaypoints.js  the TBC layout in metres (data only)
    track · physics · kart · camera · render · venue · audio · input · race
  core/                engine-level pieces, no game rules
    Renderer · PostFX · GradeShader · venueEnvironment
    CameraRig → FollowCam · BroadcastCam · CameraShake (+ pure cameraModes)
    Input · events (EventBus) · math
  track/               centreline geometry shared by everything
    TrackPath          sampled spline: nearest(), offset(), lateral(), curvature
    offsetChain        clean barrier lines (cuts corner loops, keeps off the asphalt)
    stripGeometry      flat strips for asphalt, paint and curbs
    bounds             venue size from the barriers + a wall loop collider
  physics/             kartPhysics (pure step) · BarrierCollider (circle vs segments, grid)
  entities/            Kart (state + substeps) · KartModel (animation) · model/ parts
  world/               Floor · TrackSurface · Curbs · Barriers · Venue · Rig · Banners
                       Lighting · StartGantry · textures/ (all procedural canvas textures)
  fx/                  Particles (+ shader) · SkidMarks · KartFx
  audio/               AudioEngine · EngineSound · Sfx
  race/                RaceSession (state machine) · LapTimer (pure) · storage · Autopilot
  ui/                  Hud · LapPanel · Speedo · Minimap · StartLights · Toasts · Screens
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

Cross-cutting events go through the bus: `countdown`, `light`, `go`, `lap`, `impact`, `pause`, `reset`, `camera`, `mute`.

## Tuning

| Want to change… | Edit |
|---|---|
| Top speed, acceleration, braking | `config/physics.js` → `ENGINE_ACCEL`, `TOP_SPEED`, `BRAKE_DECEL` |
| How grippy / drifty it feels | `config/physics.js` → `GRIP*`, `SLIDE_THRESHOLD`, `DRIFT_YAW_BOOST` |
| Steering speed | `config/physics.js` → `STEER_RATE`, `STEER_IN`, `STEER_OUT` |
| Camera distance, FOV kick, shake | `config/camera.js` |
| Brightness, bloom, colour grade | `config/render.js` |
| Kart colours / number | `config/kart.js` → `LIVERY`, `KART_NUMBER` |
| Track shape | `config/trackWaypoints.js` (keep radii ≥ 3.5 m; `npm test` checks the barriers) |
| Banner texts, neon colours, lights | `config/venue.js` |

## Where to add X

| Want to add… | Touch these files |
|---|---|
| AI opponent | new `entities/` kart driven by `race/Autopilot`; add it in `app/Game.js` + `app/frame.js` |
| Ghost of your best lap | record `kart.state` in `race/`, replay a second `KartModel` |
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

No AI opponents, no ghost car, no touch controls, and no track editor. Each would be a good next session.
