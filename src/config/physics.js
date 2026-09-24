// Kart dynamics: engine, brakes, tyre grip, drift and steering. Metres and seconds.

export const FIXED_STEP = 1 / 120; // physics substep ceiling

// Longitudinal
export const ENGINE_ACCEL = 9.0; // m/s² from standstill
export const TOP_SPEED = 19; // engine pull fades to zero here (drag caps real top ≈ 16 m/s)
export const BRAKE_DECEL = 12;
export const REVERSE_ACCEL = 4;
export const REVERSE_MAX = 4;
export const ROLLING_DECEL = 0.6;
export const AERO_DRAG = 0.008; // × v²
export const HANDBRAKE_DECEL = 3;
export const DRAFT_DRAG_CUT = 0.55; // share of aero drag removed in a full slipstream

// Lateral grip: how fast sideways velocity is scrubbed (1/s)
export const GRIP = 13;
export const GRIP_SLIDING = 6;
export const GRIP_HANDBRAKE = 3.2;
export const SLIDE_THRESHOLD = 2.8; // m/s sideways before the tyres let go

// Steering
export const STEER_RATE = 2.5; // max yaw rate, rad/s
export const STEER_FULL_SPEED = 3.5; // m/s where steering reaches full authority
export const STEER_HIGH_SPEED_CUT = 0.42; // share of yaw rate lost at top speed
export const DRIFT_YAW_BOOST = 1.25;
export const STEER_IN = 7; // input smoothing toward full lock (1/s)
export const STEER_OUT = 11; // input smoothing back to centre (1/s)

// Collisions
export const KART_RADIUS = 0.8;
export const WALL_RESTITUTION = 0.3;
export const WALL_SCRAPE = 0.05; // share of along-wall speed lost per m/s of impact
export const COLLISION_CELL = 4; // spatial hash cell size
