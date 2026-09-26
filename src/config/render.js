// Renderer, lighting, shadows, fog and post-processing settings.

// Most of the pipeline scales with the graphics tier (config/graphics.js).
import { QUALITY } from './graphics.js';

export const PIXEL_RATIO_CAP = QUALITY.pixelRatio;
export const MSAA_SAMPLES = QUALITY.msaa;
export const EXPOSURE = 1.0;
export const TONE_MAPPING = 'agx'; // filmic highlight roll-off (AgX), like a camera rather than a monitor

export const BG_COLOR = 0x0b0d12;
export const FOG_COLOR = 0x0b0d12;
export const FOG_DENSITY = 0.0058; // FogExp2 — a light haze across the hall
export const ENV_INTENSITY = 0.8; // image-based light from the captured hall (core/environmentCapture.js)

export const HEMI = { sky: 0xdfe8ff, ground: 0x3a3530, intensity: 0.35 }; // the captured hall does most of the fill
// Key light almost straight down (overhead fixtures) → shadows fall under things, like indoors.
export const SUN = { color: 0xfff3e2, intensity: 2.4, offset: [7, 50, 5] };
// Shadowless fills from opposite sides so no wall, barrier face or kart side goes black.
export const FILLS = [
  { color: 0xdfe6ff, intensity: 0.3, direction: [-1, 0.75, -0.55] },
  { color: 0xffe9d6, intensity: 0.25, direction: [1, 0.7, 0.8] },
];
export const SHADOW_MAP_SIZE = QUALITY.shadowMap;
export const SHADOW_BIAS = -0.0003;
export const SHADOW_NORMAL_BIAS = 0.035;
// Shadow box: the whole hall when it fits in `maxHalf` m either side of centre (the home track);
// bigger halls get a box that size following the kart, so shadows stay as sharp as at home.
export const SHADOW_FIT = { maxHalf: 58 };
// On phones the barrier shadow (a ~1-texel sliver at the base) isn't worth 35-88k depth triangles.
export const BARRIER_SHADOWS = QUALITY.barrierShadows;

export const BLOOM = { strength: 0.45, radius: 0.22, threshold: 3 }; // only real light sources bloom, not lit paint
export const GRADE = { vignette: 0.38, saturation: 1.08, contrast: 1.08, grain: 0.035, fringe: 0.012 };
// Ground-truth ambient occlusion (high tiers): radius in metres; denoise per three's GTAOPass.
export const AO = {
  intensity: 1,
  resolution: 0.5, // of the drawing buffer
  gtao: { radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12, distanceFallOff: 1 },
  denoise: { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 },
};
// Light shafts in the haze under each panel (high tiers): brightness and radius at the floor (m).
export const HAZE = { intensity: 0.05, spread: 2.2 };
// Depth of field on the TV cameras (title / attract mode): a long lens focused on the kart.
export const DOF = { aperture: 0.00018, maxBlur: 0.008 };
