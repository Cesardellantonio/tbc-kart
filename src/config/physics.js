// Kart dynamics, v5: a four-contact-patch model of a performance rental kart on an indoor track. SI units.
// Built on the standard racing-sim ingredients: per-wheel normal loads with longitudinal, lateral and
// steering-jacking load transfer; a Pacejka-style tyre with load sensitivity, combined slip and a
// relaxation length; a solid, driven rear axle (no differential) spun by an engine through a
// centrifugal clutch; rear-only brakes; tyre temperature; and a track surface with a rubbered line.

export const FIXED_STEP = 1 / 240; // s, physics substep ceiling (the rear axle's spin is stiff)

// Chassis
export const MASS = 160; // kg, kart + driver
export const GRAVITY = 9.81; // m/s²
export const WHEELBASE = 1.05; // m, front to rear axle (config/kart.js draws the same)
export const FRONT_TRACK = 1.0; // m, between the front contact patches
export const REAR_TRACK = 1.12; // m, between the rear contact patches
export const REAR_WEIGHT = 0.58; // share of static weight on the rear axle
export const COG_HEIGHT = 0.25; // m, centre of gravity above the ground (driver sits low, upright)
export const YAW_INERTIA = 52; // kg·m² about the vertical axis
export const PITCH_RATE = 6; // 1/s, how fast longitudinal load transfer follows the acceleration
export const ROLL_RATE = 16; // 1/s, how fast lateral load transfer follows (a stiff, unsprung frame)
export const FRONT_ROLL_SHARE = 0.45; // share of lateral load transfer carried by the front axle
// Caster jacking: steering lifts the chassis on the inside front, loading the inside front and the
// outside rear and unloading the other two. It is what lifts the inside rear so a kart with no
// differential can turn at all. N of diagonal transfer per N of weight per rad of road-wheel angle.
export const JACKING = 1.05;

// Tyres (per contact patch): F = μ(Fz)·Fz·sin(C·atan(B·s)), s = combined normalised slip
export const MU_LAT_FRONT = 1.3; // peak lateral friction at nominal load, front
export const MU_LAT_REAR = 1.4; // peak lateral friction at nominal load, rear (wider tyres)
export const MU_LONG = 1.1; // longitudinal peak μ relative to lateral (friction ellipse aspect)
export const LOAD_SENSITIVITY = 0.12; // μ falls this share per 100 % load above nominal (and rises below)
export const PEAK_SLIP_ANGLE = 0.11; // rad (~6°), lateral peak
export const PEAK_SLIP_RATIO = 0.1; // longitudinal peak
export const TYRE_SHAPE = 1.7; // Pacejka C: past the peak the force falls…
export const TYRE_SLIDE_MIN = 0.7; // …to this share of peak for a tyre sliding well past it
export const RELAXATION = 0.25; // m, lateral relaxation length: side force builds over this distance
export const SLIP_SPEED_MIN = 1.5; // m/s, floor on slip denominators (numerics at walking pace)
export const ROLLING_RESIST = 0.018; // rolling-resistance coefficient (× normal load)

// Tyre temperature (per axle): slip power heats the tread, speed cools it; grip peaks in a window
export const AMBIENT_TEMP = 22; // °C, the hall and a kart that has been sitting on the grid
export const TYRE_OPTIMUM = 55; // °C, peak grip for a hard rental compound
export const TYRE_WINDOW = 30; // °C either side where grip has fallen by TYRE_TEMP_LOSS
export const TYRE_TEMP_LOSS = 0.08; // share of grip lost at the edge of the window (cold tyres on lap 1)
export const TYRE_HEAT_CAPACITY = 420; // J/°C per axle (the tread's working layer)
export const TYRE_ROLL_HEAT = 6; // W per m/s of speed from carcass flexing
export const TYRE_COOLING = 2; // W/°C at rest…
export const TYRE_COOLING_SPEED = 0.55; // …plus this per m/s of airflow

// Engine and driveline: a ~20 hp 390 cc performance rental single behind a centrifugal clutch
// [rpm, N·m at full throttle]: a broad torque plateau, falling off hard toward the rev limiter.
export const TORQUE_CURVE = [
  [1500, 22], [2400, 34], [3000, 39], [3800, 39], [4300, 31], [4700, 20], [5100, 11], [5500, 6], [5900, 2], [6200, 0],
];
export const IDLE_RPM = 1700;
export const ENGINE_INERTIA = 0.035; // kg·m², crank + flywheel + clutch drum
export const ENGINE_FRICTION = 3.2; // N·m of engine braking at the limiter, closed throttle (∝ rpm)
export const CLUTCH_ENGAGE = 2200; // rpm where the centrifugal shoes start to bite…
export const CLUTCH_LOCKUP = 3300; // …and the rpm where they carry CLUTCH_TORQUE (launch near peak torque)
export const CLUTCH_TORQUE = 45; // N·m the clutch can carry locked up (a little over peak torque)
export const GEAR_RATIO = 4.7; // engine turns per axle turn (chain + sprockets)
export const DRIVELINE_EFFICIENCY = 0.92;
export const AXLE_INERTIA = 0.32; // kg·m², rear axle + wheels + disc + sprocket
export const REAR_RADIUS = 0.14; // m, rolling radius of the rear tyres
export const BRAKE_TORQUE = 520; // N·m at the rear axle, full pedal: a hydraulic disc that locks the axle at will
export const HANDBRAKE_KICK = 0.3; // s the drift button stabs the rear brake (locks it at speed)
export const REVERSE_ACCEL = 4; // m/s², the push-back helper (a rental kart has no reverse gear)
export const REVERSE_MAX = 4; // m/s
export const CREEP_SPEED = 0.3; // m/s, below this the brake pedal selects the push-back helper

// Aerodynamics: kart + upright driver, CdA ≈ 0.9 m² → ½·ρ·CdA
export const AERO_DRAG = 0.54; // N per (m/s)²
export const DRAFT_DRAG_CUT = 0.55; // share of aero drag removed in a full slipstream

// Low-speed blend to a kinematic (no-slip) model, by total speed (m/s)
export const KINEMATIC_BELOW = 1.5; // m/s, fully kinematic below this
export const DYNAMIC_ABOVE = 3; // m/s, fully dynamic above this
export const LOW_SPEED_SCRUB = 15; // 1/s, how fast sideways creep dies in the kinematic regime

// Driver aids (keyboard / touch / AI). A real rental kart has none; sims add input filters like these.
// Brake assist: holds the rear at the edge of locking (threshold braking) unless the drift button asks
// for a lock; a digital brake key is otherwise a guaranteed spin in a kart with rear-only brakes.
export const BRAKE_ASSIST_SLIP = 0.13; // rear slip ratio the assist holds under braking
// Player's digital throttle, physics/throttle.js rampThrottle:
export const THROTTLE_RISE = 5; // 1/s, the throttle opens at this rate (a keyboard's feathering in corners)…
export const THROTTLE_RISE_LOW = 10; // 1/s, …quicker at walking pace when running straight…
export const LOW_SPEED_END = 5; // m/s, …(walking pace ends here…
export const LOW_SPEED_FADE = 7; // m/s, …and is gone by here)…
export const THROTTLE_LOW_SLIP = 0.008; // rad, …(turning at walking pace the body slips this much or more)…
export const THROTTLE_JUMP = 4; // m/s², …and at speed a key press gives this much drive at once…
export const THROTTLE_JUMP_FROM = 10; // m/s, …phased in from here…
export const THROTTLE_JUMP_FULL = 14; // m/s, …to all of it here…
export const THROTTLE_JUMP_SLIP = 0.04; // rad, …unless the body slips this much
export const THROTTLE_RAMP_SLIP = 0.25; // rad of body slip past which it all acts at once (the throttle steers a slide)

// Steering
export const STEER_IN = 10; // 1/s, input smoothing toward full lock
export const STEER_OUT = 11; // 1/s, input smoothing back to centre
export const STEER_LOCK = 0.4; // rad, road-wheel angle at full lock
export const STEER_LIMIT_ACCEL = 13; // m/s², full lock at speed aims at this lateral acceleration…
export const STEER_LIMIT_SLIP = 0.12; // rad, …plus this front slip angle (speed-sensitive lock)
export const STEER_ASSIST = 1; // 0..1, countersteer assist: front wheels follow the direction of travel
export const ASSIST_SLIP_START = 0.04; // rad of body slip where the assist starts to blend in
export const ASSIST_SLIP_FULL = 0.15; // rad of body slip where the assist is at full strength
export const ASSIST_STEER_SHARE = 0.4; // share of the driver's lock kept on top of it at full assist

// Collisions
export const KART_RADIUS = 0.8; // m
export const WALL_RESTITUTION = 0.3;
// A barrier is no rail: sliding friction along its face (Coulomb) takes friction × the normal speed
// change off the along-wall speed, so a brush costs little, a hard hit or wall-riding costs a lot.
export const WALL_FRICTION = 0.8;
export const COLLISION_CELL = 4; // m, spatial hash cell size
