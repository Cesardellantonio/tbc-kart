// NOVA: one alien world per circuit (same layouts as the classic game). Each is a palette plus what
// grows and floats there; the scene is generated from it with a seed (nova/buildPlanet.js).
//
// sky: [zenith, horizon] · haze: fog colour and density · sun: colour, intensity, direction [x, y, z]
// ground: [flat, high, patch] · apron: the pad around the track · rock · flora: stalk, cap, glow
// crystal: colour (glows) · accent: barrier and kerb light · body: the big planet or moon in the sky
// (colour, ring or null, direction, size) · stars 0..1 · aurora 0..1 · peaks: mountain height (m)
// density: trees, crystals, rocks, floaters (share of the tier's budget) · night: dim sun, glowing life

export const PLANETS = {
  tbc: {
    name: 'Kairos Prime',
    system: 'Hilbert-7 · Home World',
    blurb: 'Tangerine meadows under a turquoise sky, bulb-trees and a ringed giant on the horizon.',
    sky: [0x2e7fd0, 0xa8f0e6], haze: [0x9fe6df, 0.0032],
    sun: [0xfff0cf, 3.0, [0.5, 0.55, -0.4]],
    ground: [0xe0913c, 0x9a4f7a, 0xf0b25a], apron: 0x3a3450, rock: 0x6b5a86,
    flora: [0xf3dcb0, 0xff4f8a, 0x57fff0], crystal: 0x5ffcff, accent: 0x33f0ff,
    body: { color: 0xef8a5e, ring: 0xf6d6b0, dir: [-0.6, 0.32, -0.75], size: 150 },
    stars: 0, aurora: 0, peaks: 60, density: { trees: 1, crystals: 0.4, rocks: 0.7, floaters: 0.5 },
  },
  monaco: {
    name: 'Vespera Coast',
    system: 'Oyrokh Loop · Tidal World',
    blurb: 'A magenta dusk over teal lowlands. Golden fronds sway beside a twisting harbour run.',
    sky: [0x3d1b6e, 0xff8a6b], haze: [0xe07a86, 0.0036],
    sun: [0xffb070, 2.4, [-0.7, 0.18, -0.5]],
    ground: [0x1f8f86, 0x2a4f7a, 0x49c9a6], apron: 0x2a2440, rock: 0x3b2f5c,
    flora: [0x2b2240, 0xffc93c, 0xffe27a], crystal: 0xff5cc8, accent: 0xff4fb0,
    body: { color: 0xc3a6ff, ring: null, dir: [0.5, 0.25, -0.8], size: 110 },
    stars: 0.35, aurora: 0, peaks: 45, density: { trees: 1, crystals: 0.5, rocks: 0.5, floaters: 0.3 },
  },
  monza: {
    name: 'Okkar Drift',
    system: 'Veyl Reach · Desert World',
    blurb: 'Endless rust dunes, wind-carved arches and cyan crystal fields. Flat out, all the way.',
    sky: [0x6aa7d8, 0xffd9b0], haze: [0xf2c79a, 0.0034],
    sun: [0xfff2dc, 3.4, [0.3, 0.7, 0.4]],
    ground: [0xd0663a, 0xa04428, 0xe88a52], apron: 0x4a3530, rock: 0xb0583a,
    flora: [0x6e3a2a, 0xe6b060, 0xfff0a0], crystal: 0x3ff5ff, accent: 0x40e8ff,
    body: { color: 0xf2e0c0, ring: 0xc8a888, dir: [-0.4, 0.4, -0.8], size: 90 },
    stars: 0, aurora: 0, peaks: 35, density: { trees: 0.25, crystals: 1, rocks: 1, floaters: 0.2 },
  },
  silverstone: {
    name: 'Helix Verdant',
    system: 'Aslari Cluster · Lush World',
    blurb: 'Acid-green plains under a lemon sky, violet mushroom forests and floating stone.',
    sky: [0x8fc93a, 0xf2f2a0], haze: [0xd7eb8c, 0.0035],
    sun: [0xffffe0, 2.8, [-0.45, 0.6, 0.5]],
    ground: [0x62c440, 0x2f7d4a, 0x9be05a], apron: 0x2c3a38, rock: 0x4f5c62,
    flora: [0xe8e0ff, 0x9a4dff, 0xd08cff], crystal: 0xff9cf0, accent: 0xb56bff,
    body: { color: 0x4fd1c5, ring: 0xbff0e0, dir: [0.7, 0.3, -0.6], size: 120 },
    stars: 0, aurora: 0, peaks: 55, density: { trees: 1, crystals: 0.3, rocks: 0.6, floaters: 1 },
  },
  spa: {
    name: 'Boreal Kess',
    system: 'Tyrannic Deep · Frozen World',
    blurb: 'Blue ice, pink crystal spires and an aurora over the long climb through the pines.',
    sky: [0x0d1a3a, 0x7fb6e8], haze: [0x9cc6ec, 0.0038],
    sun: [0xd6e8ff, 1.6, [0.6, 0.22, -0.6]],
    ground: [0xdcecff, 0x8fb0d8, 0xffffff], apron: 0x283248, rock: 0x6f86a8,
    flora: [0x1f3050, 0x2e6b8f, 0x8ff7ff], crystal: 0xff7ad8, accent: 0x7affea,
    body: { color: 0xa0c0ff, ring: 0xe0ecff, dir: [-0.5, 0.35, -0.8], size: 100 },
    stars: 0.7, aurora: 1, peaks: 80, density: { trees: 0.8, crystals: 1, rocks: 0.6, floaters: 0 },
    night: true,
  },
  interlagos: {
    name: 'Emberfall',
    system: 'Karrow Rift · Volcanic World',
    blurb: 'Black glass plains split by glowing seams under a blood-red sky. Mind the heat.',
    sky: [0x2a0508, 0xd8452a], haze: [0x7a2418, 0.0042],
    sun: [0xffa060, 2.0, [0.2, 0.35, -0.9]],
    ground: [0x3a2424, 0x5a2a26, 0x4a2020], apron: 0x1e1618, rock: 0x3a2624,
    flora: [0x201010, 0x40140e, 0xff6a1a], crystal: 0xff5a14, accent: 0xff7a1a,
    body: { color: 0x3a1010, ring: 0xff9a5a, dir: [-0.6, 0.3, -0.7], size: 170 },
    stars: 0.2, aurora: 0, peaks: 90, density: { trees: 0.2, crystals: 1, rocks: 1, floaters: 0.3 },
    night: true,
  },
  montreal: {
    name: 'Lumen Reach',
    system: 'Ooxin Veil · Bioluminescent World',
    blurb: 'Eternal night. The forest glows cyan and rose, and the island loop is lit by life.',
    sky: [0x03051a, 0x1f2a6a], haze: [0x1a2254, 0.0045],
    sun: [0x9fb4ff, 1.1, [-0.3, 0.6, 0.6]],
    ground: [0x2a1f55, 0x14123a, 0x3b2a78], apron: 0x121226, rock: 0x241f4a,
    flora: [0x1a1638, 0xff4fd8, 0x4ffcff], crystal: 0x4ffcff, accent: 0x4ffcff,
    body: { color: 0x6a4fff, ring: 0x9f8aff, dir: [0.4, 0.45, -0.8], size: 140 },
    stars: 1, aurora: 0.4, peaks: 50, density: { trees: 1, crystals: 0.6, rocks: 0.4, floaters: 0.4 },
    night: true,
  },
  austin: {
    name: 'Solani Dunes',
    system: 'Eissen Arm · Golden World',
    blurb: 'Honey-gold hills and tall teal spires. A big climb, a bigger view.',
    sky: [0x3a8fbf, 0xffe7a0], haze: [0xf7d98a, 0.0033],
    sun: [0xfff4d8, 3.2, [0.55, 0.5, 0.35]],
    ground: [0xd9a53c, 0xa8702a, 0xf0c860], apron: 0x3a3228, rock: 0x8a6a4a,
    flora: [0x2a6a6a, 0x3fd0c0, 0xa0fff0], crystal: 0xffe45a, accent: 0xffc83a,
    body: { color: 0xff8f6a, ring: null, dir: [-0.7, 0.28, -0.6], size: 80 },
    stars: 0, aurora: 0, peaks: 70, density: { trees: 0.7, crystals: 0.5, rocks: 0.8, floaters: 0.2 },
  },
  spielberg: {
    name: 'Azure Talos',
    system: 'Gugesti Rim · Highland World',
    blurb: 'Blue grass, white cliffs and islands of rock drifting over a mountain bowl.',
    sky: [0x1a5fd8, 0xbfe6ff], haze: [0xb8dcff, 0.003],
    sun: [0xffffff, 3.2, [-0.4, 0.65, -0.5]],
    ground: [0x3a8fc0, 0x2a5a8a, 0x6ac0e8], apron: 0x2a3040, rock: 0xd8d8e8,
    flora: [0xf0f0ff, 0xffffff, 0xaef6ff], crystal: 0x8af0ff, accent: 0x5ab8ff,
    body: { color: 0xf0e6d0, ring: 0xd0c8b8, dir: [0.6, 0.35, -0.7], size: 130 },
    stars: 0, aurora: 0, peaks: 110, density: { trees: 0.6, crystals: 0.3, rocks: 1, floaters: 1 },
  },
  singapore: {
    name: 'Neon Void',
    system: 'Galactic Core · Anomaly',
    blurb: 'A dead world at the galaxy’s heart: black glass, a violet nebula and a sky full of light.',
    sky: [0x05020f, 0x3a0f5a], haze: [0x1c0a30, 0.0042],
    sun: [0xffd0ff, 1.2, [0.3, 0.5, -0.8]],
    ground: [0x0c0a16, 0x1a1030, 0x221640], apron: 0x08060e, rock: 0x151024,
    flora: [0x100a1a, 0xff3fb4, 0x7a4fff], crystal: 0xff3fb4, accent: 0xff3fb4,
    body: { color: 0xff7ad8, ring: 0xffc0f0, dir: [-0.3, 0.5, -0.8], size: 190 },
    stars: 1, aurora: 0, nebula: 1, peaks: 60, density: { trees: 0.3, crystals: 1, rocks: 0.5, floaters: 0.8 },
    night: true,
  },
};

export const planetOf = (id) => PLANETS[id] ?? PLANETS.tbc;

// How much is placed at each graphics tier (config/graphics.js), before a planet's density share.
export const FLORA_BUDGET = { low: 0.35, medium: 0.6, high: 1, ultra: 1.3 };
export const NOVA_WORLD = {
  reach: 320, // m of terrain beyond the circuit's bounds
  cell: 2, // m, distance-to-track grid
  flat: 5, // m beyond the barriers kept flat…
  rise: 40, // m …then the land rises to full relief over this distance
  hills: 7, // m of rolling relief near the circuit
  segments: 220, // terrain grid resolution per side
  trees: 420, crystals: 160, rocks: 260, floaters: 26, glowBulbs: 500, // budgets at 'high'
  skyRadius: 850, // m; the cameras see this far (config/camera.js FAR in NOVA)
  hover: 0.26, // m, how high the karts float
};
