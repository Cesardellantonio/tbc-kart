// Warehouse venue around the track: walls, ceiling rig, light fixtures, signage.

export const VENUE_MARGIN = 7; // metres from the outermost barrier to the walls
export const WALL_HEIGHT = 10;
export const WALL_PANEL_WIDTH = 4; // metres per wall texture repeat
export const FLOOR_TILE = 8; // metres per concrete slab (texture repeat)

export const TRUSS_SPACING = 12;
export const TRUSS_Y = 8.8;
export const LIGHT_PANEL = {
  width: 3.4,
  depth: 0.6,
  y: 7.9,
  spacingX: 12,
  spacingZ: 10,
  intensity: 9,
  color: 0xf4f8ff,
};
export const NEON = { y: 3.2, thickness: 0.08, colors: [0x00e5ff, 0xff2bd6], intensity: 2.6 };

export const BANNERS = [
  { title: 'TBC KART', sub: 'INDOOR RACING', color: '#e63946' },
  { title: 'LAP ATTACK', sub: 'BEAT YOUR BEST', color: '#ffc21a' },
  { title: 'FULL THROTTLE', sub: 'SINCE 2026', color: '#22c3ee' },
  { title: 'RACE HARD', sub: 'RACE CLEAN', color: '#f4f4f4' },
];
export const BANNER_SIZE = [12, 3]; // metres
export const BANNER_Y = 5.6;
