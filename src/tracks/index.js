// Every circuit in the game, in menu order. Each module default-exports
// { id, name, location, inspiredBy, blurb, laps, waypoints, startIndex, width?, samples?, exempt? }
// — see tracks/tbc.js and track/validate.js for the format and the design rules.

import tbc from './tbc.js';
import monaco from './monaco.js';
import monza from './monza.js';
import silverstone from './silverstone.js';
import spa from './spa.js';
import interlagos from './interlagos.js';
import montreal from './montreal.js';
import austin from './austin.js';
import spielberg from './spielberg.js';
import singapore from './singapore.js';
import { NOVA } from '../config/edition.js';
import { PLANETS } from '../config/planets.js';

const LAYOUTS = [tbc, monaco, monza, silverstone, spa, interlagos, montreal, austin, spielberg, singapore];

// NOVA races the same layouts on alien worlds: each takes its planet's name, system and blurb.
const onPlanet = (t) => {
  const p = PLANETS[t.id];
  return p ? { ...t, name: p.name, location: p.system, blurb: p.blurb } : t;
};
export const ALL_TRACKS = NOVA ? LAYOUTS.map(onPlanet) : LAYOUTS;

// Only layouts with waypoints are raceable (a stub has waypoints: null).
export const TRACKS = ALL_TRACKS.filter((t) => Array.isArray(t.waypoints));

export const trackById = (id) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
