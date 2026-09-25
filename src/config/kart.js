// Kart model proportions, livery and body-motion response. Metres.

export const WHEELBASE = 1.05;
export const FRONT_TRACK = 1.0;
export const REAR_TRACK = 1.12;
export const FRONT_WHEEL = { radius: 0.14, width: 0.13 };
export const REAR_WHEEL = { radius: 0.15, width: 0.21 };

export const LIVERY = {
  body: 0xffc21a, // bright yellow bodywork
  accent: 0x1b1c20, // moulded black plastic: bumpers, air box, chain guard, wheel grips
  frame: 0x7d838c, // painted steel tubes
  rim: 0xd9dde3,
  hub: 0x8f959e, // wheel hubs and nuts
  tyre: 0x141414,
  engine: 0xa4a9b0, // cast-aluminium crankcase and head
  exhaust: 0xc9ccd0, // silencer
  shroud: 0xc4262e, // engine fan shroud and recoil starter (Honda-style red)
  tank: 0xd8d2c0, // translucent-white fuel tank
  seat: 0x23252a,
  suit: 0x1d3557,
  glove: 0x15161a,
  boot: 0x141518,
  collar: 0x202226, // neck brace
  helmet: 0xf4f4f4,
  helmetStripe: 0xe63946,
  trim: 0x16171a, // helmet vents, neck roll, visor pivots
  visor: 0x0b0f1a,
};
export const KART_NUMBER = '07';

export const MAX_STEER_ANGLE = 0.45; // front wheel visual steer, rad
export const STEERING_WHEEL_TURN = 1.8; // steering wheel rotation at full lock, rad
export const BODY_ROLL = 0.012; // rad per m/s² of lateral acceleration
export const BODY_PITCH = 0.01; // rad per m/s² of longitudinal acceleration
export const BODY_MOTION_LIMIT = 0.07; // rad clamp for roll/pitch
export const DRIVER_LEAN = 0.35; // share of body roll the driver leans into

// Cockpit layout the driver is posed around (kart space: −Z forward, +Y up, x = right; metres).
// The gloves stay on the rim at quarter to three and the arms follow the wheel as it turns.
export const COCKPIT = {
  wheelCentre: [0, 0.45, -0.15], // steering wheel hub
  wheelTilt: 0.76, // rad the wheel face leans back toward the driver
  wheelRadius: 0.15, // m to the middle of the rim (a ~300 mm rental wheel)
  shoulder: [0.185, 0.551, 0.413], // right shoulder joint (the left one is mirrored), torso reclined ~20°
  upperArm: 0.29, // m shoulder → elbow
  forearm: 0.32, // m elbow → middle of the glove on the rim
  elbowOut: [1, -0.8, 0.3], // direction the right elbow bends toward (x mirrored for the left)
  headPivot: [0, 0.66, 0.372], // neck joint the helmet leans about
};

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
