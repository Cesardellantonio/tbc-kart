// Kart model proportions, livery and body-motion response. Metres.

export const WHEELBASE = 1.05;
export const FRONT_TRACK = 1.0;
export const REAR_TRACK = 1.12;
export const FRONT_WHEEL = { radius: 0.14, width: 0.13 };
export const REAR_WHEEL = { radius: 0.15, width: 0.21 };

export const LIVERY = {
  body: 0xffc21a, // bright yellow bodywork
  accent: 0x15161a, // bumpers, seat, nose trim
  frame: 0x3a3f47,
  rim: 0xd9dde3,
  tyre: 0x141414,
  engine: 0x8a9099,
  suit: 0x1d3557,
  glove: 0x15161a,
  helmet: 0xf4f4f4,
  helmetStripe: 0xe63946,
  visor: 0x0b0f1a,
};
export const KART_NUMBER = '07';

export const MAX_STEER_ANGLE = 0.45; // front wheel visual steer, rad
export const STEERING_WHEEL_TURN = 1.8; // steering wheel rotation at full lock, rad
export const BODY_ROLL = 0.012; // rad per m/s² of lateral acceleration
export const BODY_PITCH = 0.01; // rad per m/s² of longitudinal acceleration
export const BODY_MOTION_LIMIT = 0.07; // rad clamp for roll/pitch
export const DRIVER_LEAN = 0.35; // share of body roll the driver leans into

// Riding a kerb: the kart hops over the ribs and tilts toward the side that is up on the kerb
export const KERB_RIDE = {
  ridge: 0.32, // m between kerb ribs → rumble rate = speed / ridge
  tyreHalfWidth: 0.09, // m of tyre past its centre that can touch the kerb
  lift: 0.022, // m the kart rides up at full contact
  hop: 0.012, // m of rib-to-rib bounce
  roll: 0.035, // rad tilt with one side fully on the kerb
  attack: 40, // 1/s how fast contact builds
  release: 14, // 1/s how fast it fades after leaving the kerb
};
