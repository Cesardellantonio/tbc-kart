// Renderer, lighting, shadows, fog and post-processing settings.

// Phones and tablets (coarse pointer) get a lighter pipeline to hold the frame rate.
const LITE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export const PIXEL_RATIO_CAP = LITE ? 1.5 : 2;
export const MSAA_SAMPLES = LITE ? 2 : 4;
export const EXPOSURE = 1.0;

export const BG_COLOR = 0x0b0d12;
export const FOG_COLOR = 0x0b0d12;
export const FOG_DENSITY = 0.0058; // FogExp2 — a light haze across the hall
export const ENV_INTENSITY = 1.0; // venue reflections (see core/venueEnvironment.js)

export const HEMI = { sky: 0xdfe8ff, ground: 0x3a3530, intensity: 1.4 };
// Key light almost straight down (overhead fixtures) → shadows fall under things, like indoors.
export const SUN = { color: 0xfff3e2, intensity: 2.4, offset: [7, 50, 5] };
// Shadowless fills from opposite sides so no wall, barrier face or kart side goes black.
export const FILLS = [
  { color: 0xdfe6ff, intensity: 0.95, direction: [-1, 0.75, -0.55] },
  { color: 0xffe9d6, intensity: 0.75, direction: [1, 0.7, 0.8] },
];
export const SHADOW_MAP_SIZE = LITE ? 2048 : 4096;
export const SHADOW_BIAS = -0.0003;
export const SHADOW_NORMAL_BIAS = 0.035;
// Shadow box: the whole hall when it fits in `maxHalf` m either side of centre (the home track);
// bigger halls get a box that size following the kart, so shadows stay as sharp as at home.
export const SHADOW_FIT = { maxHalf: 58 };
// On phones the barrier shadow (a ~1-texel sliver at the base) isn't worth 35-88k depth triangles.
export const BARRIER_SHADOWS = !LITE;

export const BLOOM = { strength: 0.65, radius: 0.08, threshold: 1.2 }; // small radius = tight glow, no haze
export const GRADE = { vignette: 0.42, saturation: 1.12, contrast: 1.06 };
