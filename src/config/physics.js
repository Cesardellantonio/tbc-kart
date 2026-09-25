// Kart dynamics: single-track (bicycle) model of a rental kart on indoor concrete. SI units.

export const FIXED_STEP = 1 / 120; // physics substep ceiling (s)

// Chassis
export const MASS = 160; // kg, kart + driver
export const GRAVITY = 9.81; // m/s²
export const WHEELBASE = 1.05; // m, front to rear axle
export const REAR_WEIGHT = 0.58; // share of static weight on the rear axle
export const COG_HEIGHT = 0.25; // m, centre of gravity above the ground
export const YAW_INERTIA = 58; // kg·m² about the vertical axis
export const PITCH_RATE = 6; // 1/s, how fast longitudinal load transfer follows the acceleration

// Tyres (simplified Pacejka: F = μ·N·sin(C·atan(B·α)), B set so the peak sits at TYRE_PEAK_SLIP)
export const MU_FRONT = 1.3; // peak friction coefficient, front
export const MU_REAR = 1.4; // peak friction coefficient, rear (wider tyres)
export const TYRE_PEAK_SLIP = 0.12; // rad, slip angle of peak lateral force (~7°)
export const TYRE_SHAPE = 1.7; // Pacejka C (dimensionless): past the peak the force falls ~25 % by 0.4 rad…
export const TYRE_SLIDE_MIN = 0.7; // …down to this share of peak μ for a tyre sliding well sideways
export const LONG_GRIP = 1.1; // longitudinal peak μ relative to lateral (friction ellipse aspect)
export const LOCKED_GRIP = 0.78; // share of peak μ a locked (sliding) rear axle keeps
export const BRAKE_SLIP = 0.1; // slip ratio of a rear braked to its limit: sets the way it slides, so it
// keeps a side force against any sideways speed instead of giving all its grip to the brake
// Drift button: a press locks the rear for a short kick (above DYNAMIC_ABOVE); holding it longer gives
// the rear back to the pedals, so a held button can never stop the kart dead or hold it on the grid.
export const HANDBRAKE_KICK = 0.3; // s the rear stays locked after a press
export const SLIP_SPEED_MIN = 1.5; // m/s, floor on the slip-angle denominator
export const LOAD_MIN = 0.15; // share of static axle load an axle never drops below

// Low-speed blend to a kinematic (no-slip) model, by total speed (m/s)
export const KINEMATIC_BELOW = 1.5; // m/s, fully kinematic below this
export const DYNAMIC_ABOVE = 3; // m/s, fully dynamic above this
export const LOW_SPEED_SCRUB = 15; // 1/s, how fast sideways creep dies in the kinematic regime

// Longitudinal
export const ENGINE_ACCEL = 9.0; // m/s², drive force per kg from standstill
export const TOP_SPEED = 19; // m/s, engine pull fades to zero here (drag caps real top ≈ 16 m/s)
export const BRAKE_FORCE = 1100; // N, rear-only brakes at full pedal (just under the straight-line lock)
export const REVERSE_ACCEL = 4; // m/s²
export const REVERSE_MAX = 4; // m/s
export const ROLLING_DECEL = 0.6; // m/s², rolling resistance
export const AERO_DRAG = 0.008; // 1/m, drag deceleration = AERO_DRAG·v²
export const DRAFT_DRAG_CUT = 0.55; // share of aero drag removed in a full slipstream
export const CREEP_SPEED = 0.3; // m/s, below this the brake pedal selects reverse
export const THROTTLE_RISE = 5; // 1/s, how fast the player's (keyboard / touch 0-1) throttle can open…
export const THROTTLE_RAMP_SLIP = 0.25; // …unless body slip (rad) is past this: in a slide it acts at once

// Steering
export const STEER_IN = 7; // 1/s, input smoothing toward full lock
export const STEER_OUT = 11; // 1/s, input smoothing back to centre
export const STEER_LOCK = 0.4; // rad, road-wheel angle at full lock
export const STEER_LIMIT_ACCEL = 13; // m/s², full lock at speed aims at this lateral acceleration…
export const STEER_LIMIT_SLIP = 0.13; // rad, …plus this front slip angle (speed-sensitive lock)
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
