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

export const ALL_TRACKS = [tbc, monaco, monza, silverstone, spa, interlagos, montreal, austin, spielberg, singapore];

// Only layouts with waypoints are raceable (a stub has waypoints: null).
export const TRACKS = ALL_TRACKS.filter((t) => Array.isArray(t.waypoints));

export const trackById = (id) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
