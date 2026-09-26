# TBC Kart — indoor kart racing in Three.js

**▶ Play online: https://cesardellantonio.github.io/tbc-kart-play/**

A kart racing game set in indoor karting halls: the **TBC Indoor Racing** layout from Vancouver plus nine kart-scale circuits inspired by Formula 1 tracks. Vanilla JavaScript + Three.js, no framework, built one session at a time as a learning project.

- **v0.1–v0.2** — outdoor box car → indoor kart on a painted TBC trace
- **v0.3–v0.7** — collision, HUD, shadows, spinning wheels, bloom, audio, tests
- **v1.0** — look & feel overhaul: real-scale track with barriers, drift physics, detailed kart + driver, lap timing with live delta, start lights, title attract mode, venue lighting, particles, synthesized sound
- **v2.0** — Grand Prix: 5-lap races against five AI rivals, kart-to-kart contact, slipstream, live timing tower, results screen, best-lap ghost in time attack, touch controls for phones
- **v3.0** — Circuits: nine F1-inspired tracks with a track picker, a single-track tyre model (rear-only brakes, load transfer, holdable drifts), smarter rivals with three difficulty levels, kerbs you can feel, a clutch-engine sound, cockpit head motion and a rubbered-in racing line
- **v4.0** — Online + real physics (current): race up to five friends live from the static site (peer-to-peer rooms through the free PeerJS broker, no server of our own) with AI rivals filling the empty slots; a four-contact-patch kart model (per-wheel load transfer, caster jacking, solid rear axle), Pacejka-style tyres with load sensitivity, combined slip and relaxation length, an engine torque curve with a centrifugal clutch, tyre temperature and a track surface that rubbers in; a realistic rental kart and helmeted driver

## Run

```bash
npm install
npm run dev      # open the URL Vite prints (usually http://localhost:5173)
npm test         # unit tests: physics (engine, brakes, load transfer, tyres, temperature, surface), zip feel, tracks (rules + a six-kart AI race on every circuit), AI pace, race logic, flow, online (protocol, clock, rooms, races over an in-memory network)
node tools/track-report.mjs monza --svg monza.svg   # design check + AI race + map for one circuit
npm run build    # production bundle in dist/
```

**Publishing:** the playable build lives in the repo `Cesardellantonio/tbc-kart-play` (GitHub Pages, `main` branch root). To update it, run `npm run build`, copy `dist/` over that repo's contents (keep its `README.md` and `.nojekyll`), commit and push.

## How to play

Pick a track (`↑` `↓` or the ◀ ▶ arrows), a mode (`←` `→`) and the rivals' level (`L`, or click **Amateur / Club / Pro**) on the title screen, then **Enter** — or click / tap a mode:

- **Grand Prix** — a race of about two and a half minutes (each circuit sets its lap count) against five rivals, from 5th on the grid. Tuck in behind a kart to catch its slipstream (the speedo shows **SLIPSTREAM**), then pull out and pass. Rubbing is racing: karts bump and shove each other. The timing tower shows the running order and real time gaps; the results card fills in as the field takes the flag.
- **Online** — race friends. Type a name, **CREATE ROOM** and share the 5-character code or the link (`…?room=K7QX2` opens the lobby and joins straight away); up to six humans, AI rivals fill the rest of the grid. The host picks the track and the rivals' level and starts; everyone's lights go out together. Each driver's kart runs on their own machine, so there is no input lag; the others are shown a tenth of a second or so in the past, smoothly. `Esc` shows a small card over the running race (nothing pauses; **LEAVE RACE** quits). The host's results are final for everyone: the host then picks **RACE AGAIN** or **NEXT TRACK** for the whole room, and **LEAVE** takes anyone back to the menu. If the host leaves, everyone returns to the menu. A phone that switches apps for a few seconds (up to 15 s) stays in the room and the race; the others see its kart wait ("HOST AWAY" if it is the host's).
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
| `↑` `↓` / `←` `→` / `L` | Title screen: track / mode / rivals' level |
| `Enter` / `N` | Results: race again / next track |
| `Enter` / `N` / `Esc` | Results card: race again / next track / menu (the driving keys do nothing there) |
| `` ` `` / `F3` | Developer overlay |

A standard gamepad works too: left stick steers, RT throttle, LT brake, A handbrake, Y camera, Back reset, Start start / pause / race again, B menu. On the title card the D-pad picks the track (up / down) and mode (left / right); on the results card D-pad down is next track.

## What's in it

- **Tracks**: ten circuits, each 6 m (up to 7 m) wide asphalt with edge lines, red/white curbs on the inside of tight corners, a checkered start/finish line and a six-kart grid, lined with rounded plastic barriers that actually stop you, inside a hall sized to the layout — TBC Indoor (Vancouver, the home track) · Monte Carlo (Monaco) · Monza · Silverstone · Spa · Interlagos · Montréal · Austin (COTA) · Spielberg (Red Bull Ring) · Marina Bay (Singapore). The F1 layouts are scaled to kart size (390–612 m) and keep each circuit's direction, silhouette and corner sequence; every one was reviewed corner by corner against the real map. Best laps and ghosts are saved per track.
- **Physics (v5)** — built from the standard racing-sim ingredients (see *Physics notes* below): four contact patches with per-wheel loads (longitudinal and lateral load transfer plus **caster jacking**, which lifts the inside rear so a kart with no differential can turn); a Pacejka-style tyre with **load sensitivity**, **combined slip** (drive/brake and cornering share one friction ellipse) and a **relaxation length**; a **solid, driven rear axle** that scrubs in corners, spun by a ~20 hp engine **torque curve** through a **centrifugal clutch** (it slips at ~3000 rpm off the line, locks up, gives engine braking) and stopped by **rear-only brakes**; **tyre temperature** per axle (cold on lap one, best at ~55 °C, cooked by long slides — shown on the HUD); and a **track surface** with a rubbered racing line, dusty off-line, slippery painted kerbs and rubber that builds up as karts lap. Driver aids for keyboards / touch (as sims use): throttle shaping, a threshold-braking assist and a countersteer assist. Fixed 1/240 s substeps; barriers bounce and scrape with Coulomb friction.
- **Kart**: a modern indoor rental kart — tubular steel frame (rails, kingpins, tie rods, bumper loops, nerf bars), wide nose fairing and front panel with number roundels, side pods, full-width rear bumper, moulded bucket seat, fuel tank between the driver's legs, pedals, a Honda GX-style engine (finned cylinder, red fan shroud and recoil starter, air box, silencer, chain guard) and the rear axle with brake disc and sprocket. Slick tyres are lathed from a real cross-section on spoked 5-inch rims. The driver lies back ~20° in the seat in a race suit with the kart's colour on its chest-side panels, a stand-up collar and a neck brace; skinned arms keep the gloves on the rim at quarter to three as the wheel turns; the full-face helmet has a broad egg-shaped shell with a nearly level lower edge and a deep chin bar with a vent grille, a tinted visor on side pivots, a brow peak, vents, a livery stripe and a neck roll. Wheels spin and steer, the body rolls and pitches with load, and the driver's head leans into corners. The best-lap ghost draws as one lit translucent shell (a depth-only pass first, so no inner parts show through).
- **Venue**: concrete floor with slab joints, ribbed-metal walls with an accent stripe and neon, banners, roof trusses, LED panels with floor light pools, and a start gantry with real start lights.
- **Look (v5 graphics)**: physically based rendering lit by the hall itself — after each track loads a cube camera captures the built venue (LED panels, banners, neon, barriers) into the image-based lighting, so paint, visors and the polished floor reflect what is really overhead; filmic AgX tone mapping; realistic albedos (white paint is not a light source); bloom only on real light sources; ground-truth ambient occlusion (Ultra); light shafts through the hall's haze; procedural normal + roughness maps on asphalt (aggregate), the polished concrete floor, the ribbed walls and the scuffed barriers; kart materials with clearcoat plastic, rubber sheen, fabric sheen on the suits and an iridium visor; depth of field on the TV cameras; fine film grain and lens fringing. Four quality tiers (Low / Medium / High / Ultra, the title card's GRAPHICS row or `G`, or `?gfx=`): phones start on Medium, desktops on High.
- **Feel**: speed-driven FOV, a chase camera that swings to show your drift angle, impact shake, tyre smoke, skid marks, and sparks.
- **Race**: title attract mode with TV-style trackside cameras, F1-style start lights (gantry and HUD), lap timing with sub-frame line crossing, a live delta to your best lap, and a persisted record.
- **Rivals**: five AI drivers with their own liveries, pace, preferred line and start reactions. They follow a least-curvature racing line (outside–inside–outside, `race/racingLine.js`), brake as late as a speed plan along that line allows (`race/speedPlan.js`), tuck into a slower kart's slipstream and then pull out to the inside of the next corner to pass it, dropping back in line to try again if a move doesn't stick (`race/passing.js`), back off when boxed in, and reset themselves if stuck. Skill is a straight pace setting, and each circuit's rival pace is calibrated so a skill-1 rival laps the same 6 % off that circuit's reference lap (`config/race.js` → `TRACK_PACE`, regenerated by `node tools/ai-pace.mjs`). A light pack pull keeps races close, and a shuffled grid plus a random form factor change the order from race to race.
- **Race physics**: equal-mass kart-to-kart contacts (push apart, trade momentum, sparks and shake), and slipstream that cuts up to 55% of aero drag within 9 m behind another kart.
- **Sound** (all synthesized with WebAudio, no files): a single-cylinder rental-kart engine behind a centrifugal clutch (lumpy idle, revs hang at the bite point on launch then climb with road speed, flare when the rear steps out, pops and crackles on a high-rev lift), tyre squeal that grows with cornering load and slip, a juddering scrub under hard braking, a scrape when grinding a barrier, a kerb rumble, impacts, start beeps, and lap chimes.
- **Kerbs you can feel**: ride a kerb and the kart hops and tilts over the ribs, the camera judders and the rumble plays at the rib rate. A per-sample kerb table (`track/curbTable.js`) keeps the check O(1) per frame.
- **Cockpit head**: in the cockpit view the driver's head sways and tilts against lateral g, surges and nods under braking, and looks into the corner with the steering. Chase views get a fine speed-dependent engine buzz.
- **Rubbered-in line**: a soft, streaky darker band follows the AI racing line (darker where it's loaded hardest), with faint rear-tyre marks where the rivals actually brake (darker where they brake harder).

## Physics notes

The v5 model follows how racing simulators build car physics, scaled to a rental kart:

- **Tyres** — force from a Pacejka "magic formula" style curve on the *combined* normalised slip, so a tyre that is driving or braking has less left for cornering; friction falls as load rises (load sensitivity), so moving load off an axle costs it grip overall; side force builds over a relaxation length (~0.25 m) instead of instantly, which also keeps the model stable at low speed.
- **Karts have no differential** — the solid rear axle drives both rear wheels at one speed, so in a corner they scrub against each other. Real karts turn because lateral load transfer and caster jacking (the steering geometry lifts the chassis on the inside front) unload the inside rear wheel until it lifts. Both are modelled per wheel, which is where the kart's understeer at low speed, rotation at the limit and power oversteer come from.
- **Driveline** — a performance rental engine (torque plateau ~39 N·m at 3000–3800 rpm, falling to the limiter) through a centrifugal clutch that bites at ~2200 rpm, a 4.7:1 chain drive and a rear axle whose spin is integrated implicitly against the tyres' grip; wheelspin and lock-ups emerge from it (and the engine sound follows its rpm).
- **Brakes** — rear only, as on real karts, so under braking the load goes forward and the rear lets go early; a threshold-braking assist holds it at the edge for keyboard players, and the drift button deliberately locks it.
- **Temperature and track** — tyres heat with slip power and cool with speed (grip window ~25–85 °C, best ~55 °C), and the surface has a rubbered-in racing line, dust off-line and kerbs, with rubber building up over the session — like rFactor 2's "Real Road".

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
    field.js           rival karts: grid, AI stepping, contacts and slipstream (online: against read-only remote karts too)
    online.js          ONLINE mode glue: lobby card ↔ Room, ?room= links, START → OnlineRace, keys in / after an online race, LEAVE
    onlineRace.js      one online race: host's track + grid, shared-clock countdown, NetRace in / out per frame, flags, results
    onlineGrid.js      roster → timing field and grid slots (host runs the AI, clients none); host results / flags onto the field
    RemoteKart.js      another driver's kart: posed from the network state, telemetry rebuilt so it rolls, smokes and revs
    remotePool.js      those karts by roster id, models reused race to race while the look matches, disposed when not
  tracks/              one data module per circuit (waypoints in metres, start, laps, blurb) + index.js registry
  config/              every tunable value, grouped by topic (no magic numbers elsewhere)
    track · physics · kart · camera · render · venue · audio · input · race · lobby · net
  core/                engine-level pieces, no game rules
    Renderer · PostFX · GradeShader · venueEnvironment
    CameraRig → FollowCam (+ HeadMotion) · BroadcastCam · CameraShake · CameraVibe (+ pure cameraModes, FrameSines: per-frame sines that can't alias)
    Input · events (EventBus) · math
  track/               centreline geometry shared by everything
    TrackPath          sampled spline: nearest(), offset(), lateral(), curvature
    offsetChain        clean barrier lines (cuts corner loops, keeps off the asphalt)
    stripGeometry      flat strips for asphalt, paint, curbs and the rubbered line (optional vertex alpha)
    curbRuns · curbTable  where the curbs are, and a per-sample lookup for "which wheels are on a kerb"
    brakingZones       a point-mass lap driven by the AI's own speed rule → where karts brake (tyre marks)
    bounds             venue size from the barriers + a wall loop collider
    validate           the design rules every circuit must pass (length, radius, separation, straight grid, footprint)
    barrierLines       barrier geometry shared by the scene, collider, simulator and tests
  physics/             kartPhysics (four-patch step) · wheelLoads · patches · tyreForce · rearAxle · engine · thermal · pointMass · controls · throttle · BarrierCollider (circle vs segments, grid)
                       kartContacts (kart vs kart, slipstream)
  entities/            Kart (state + substeps) · KartModel (animation) · Ghost · model/ parts (merged per material: 18 draws, ~11.8k triangles a kart)
                       model/: shapes + primitives (surface helpers) · frame · bodywork · cockpit · engine · wheels · driver + suit · arms (skinned, IK) · helmet + helmetShell · ghostShell
  world/               Floor · TrackSurface · RubberLine (+ BrakeMarks) · Curbs · Barriers · Venue · Rig · Banners
                       Lighting (shadow box follows the kart in big halls) · StartGantry · textures/ (all procedural canvas textures)
  fx/                  Particles (+ shader) · SkidMarks · KartFx · KerbFeel (kerb contact + kart ride)
  audio/               AudioEngine (suspends while the tab is hidden) · EngineSound (engineRpm clutch model + engineVoice graph + Backfire)
                       PackSound (rival engines: an rpm model per kart, voices stay with their kart) · TyreSound · KerbRumble · Sfx (one-shots) · nodes
  race/                RaceSession (state machine) · LapTimer (pure) · storage · Autopilot
                       RaceField (order, gaps, finish) · AiDriver · racingLine · GhostRecorder
  ui/                  Hud · LapPanel · Standings · Speedo · Minimap · StartLights · Toasts
                       Screens · Results · TouchControls
                       Lobby (online lobby card: LobbyChoose · LobbyRoom · pure lobbyView / lobbyText / lobbyErrors) · OnlinePause
                       DebugOverlay · format · dom · hud.css
  net/                 online multiplayer, no THREE and no Game (unit-tested over LoopbackTransport)
                       Transport (PeerJS: WebRTC data channels via the free PeerJS cloud broker, a star round the host) · LoopbackTransport (in-memory, tests) · linkShaper (?netlag / ?netloss)
                       protocol + messages + schema (strict validation: malformed or oversized → dropped) · roomCode
                       Room (+ roomHost · roomClient · roster): lobby, names / codes / liveries, 6-player cap, heartbeats, START roster
                       NetRace (+ RemoteKarts · Interpolator · kartState · raceResults): 20 Hz kart / snapshot exchange, interpolation, finishes → results
                       ClockSync: the host clock from ping / pong (median of the lowest-round-trip samples)
  debug/topdown.js     overhead view of the whole hall (dev)
  debug/netTest.js     net-test.html (dev only, not built): the real network stack without the game, for two-browser tests
tools/                 simulate.js (headless six-kart race) · track-report.mjs (rules + race + SVG map) · ai-pace.mjs (TRACK_PACE)
tests/                 physics · track · tracks · race · grandprix · feel · flow · ai · difficulty · lobby · net · netroom · nettransport · online
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

Online, `game.online.step(dt)` is the one extra call in that pipeline (after the race session): the room's heartbeats every frame, and in a race the remote karts, the host's AI, contacts and slipstream with them, and the timing field. The race session follows the host's clock (`RaceSession.follow`), so GO and every flag land at the same host time on every peer. START goes out only once every client's clock is synced (a few ping round trips after it joins), so a START pressed just as a friend joins waits a moment rather than start them on an unsynced clock.

Cross-cutting events go through the bus: `countdown`, `light`, `go`, `lap`, `finish`, `overtake`, `impact`, `pause`, `reset`, `camera`, `mute`.

## Tuning

| Want to change… | Edit |
|---|---|
| Engine, gearing, brakes | `config/physics.js` → `TORQUE_CURVE`, `CLUTCH_*`, `GEAR_RATIO`, `BRAKE_TORQUE`, `AERO_DRAG` (rear brakes only) |
| Tyres and balance | `config/physics.js` → `MU_LAT_FRONT` / `MU_LAT_REAR`, `LOAD_SENSITIVITY`, `PEAK_SLIP_*`, `RELAXATION`, `COG_HEIGHT`, `FRONT_ROLL_SHARE`, `JACKING` |
| Tyre temperature, track grip | `config/physics.js` → `TYRE_OPTIMUM`, `TYRE_WINDOW`, …; `config/track.js` → `SURFACE` |
| Steering and drift help | `config/physics.js` → `STEER_LOCK`, `STEER_LIMIT_*`, `STEER_IN` / `STEER_OUT`, `STEER_ASSIST` (countersteer assist 0..1) |
| Camera distance, FOV kick, shake | `config/camera.js` |
| Cockpit head motion, engine / kerb vibration | `config/camera.js` → `HEAD`, `VIBE` |
| Engine revs, clutch, pops; tyre / kerb sounds | `config/audio.js` → `ENGINE`, `BACKFIRE`, `TYRES`, `KERB_RUMBLE` |
| Kerb hop and tilt | `config/kart.js` → `KERB_RIDE` |
| Rubbered line and brake marks | `config/track.js` → `RUBBER_LINE`, `BRAKE_MARKS` |
| Graphics tiers | `config/graphics.js` → `TIERS` (pixel ratio, MSAA, shadows, AO, haze, detail maps, depth of field) |
| Brightness, bloom, colour grade, AO, haze | `config/render.js` → `TONE_MAPPING`, `ENV_INTENSITY`, `BLOOM`, `GRADE`, `AO`, `HAZE`, `DOF` |
| Kart colours / number | `config/kart.js` → `LIVERY`, `KART_NUMBER` |
| Driver pose, steering wheel position, arm lengths | `config/kart.js` → `COCKPIT` |
| Track shape | `src/tracks/<id>.js` → `waypoints` (then `node tools/track-report.mjs <id>`: the rules in `track/validate.js` + an AI race) |
| Banner texts, neon colours, lights | `config/venue.js` |
| Race length | the track file's `laps` (about 140 s of racing; `tests/tracks.test.js` checks it) |
| Grid slot, rival names / colours / pace | `config/race.js` → `GRID`, `RIVALS` |
| Rival levels (Amateur / Club / Pro) | `config/race.js` → `DIFFICULTY` (corner + braking pace only), `DEFAULT_DIFFICULTY` |
| AI base pace | `config/race.js` → `AI.paceMargin` (then `node tools/ai-pace.mjs` → `TRACK_PACE`), `RIVALS` skills |
| AI line, passing, pack pull, slipstream, contact | `config/race.js` → `AI`, `DRAFT`, `CONTACT` |
| Online send rates, timeouts, interpolation delay, other players' liveries | `config/net.js` (room-code alphabet / length and the player cap: `config/lobby.js`) |
| How far ahead remote karts are dead-reckoned for contacts / slipstream, how they look | `config/net.js` → `CONTACT_EXTRAPOLATE`, `REMOTE_SLIDE_ANGLE`, `REMOTE_ACCEL_RATE` |

## Where to add X

| Want to add… | Touch these files |
|---|---|
| Another circuit | new `src/tracks/<id>.js` (same format as `tbc.js`), add it to `src/tracks/index.js`, iterate with `node tools/track-report.mjs <id> --svg map.svg` until it passes, then `node tools/ai-pace.mjs` for `TRACK_PACE` |
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

No global leaderboards, no championship across several races, no elevation (Eau Rouge is flat indoors), and no track editor. Each would be a good next session.
