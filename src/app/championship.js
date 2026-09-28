// The championship in the game: a season saved in the browser; each round is qualifying on the
// round's circuit, then the race from the qualifying grid, then the standings (race/championship.js).

import { TRACKS, trackById } from '../tracks/index.js';
import { newSeason, scoreRound, roundTrack, seasonDone, saveSeason, summary } from '../race/championship.js';
import { gridOrder } from '../race/qualifying.js';
import { RIVALS, PLAYER } from '../config/race.js';
import { LIVERY } from '../config/kart.js';
import { startRace } from './actions.js';

export const seasonDrivers = () => [
  { code: PLAYER.code, name: PLAYER.name, color: LIVERY.body },
  ...RIVALS.map((r) => ({ code: r.code, name: r.name, color: r.body })),
];

// The season to race: the saved one, or a new one if there is none or the last one is over.
function currentSeason(game) {
  if (!game.season || seasonDone(game.season)) {
    game.season = newSeason(TRACKS.map((t) => t.id), seasonDrivers(), game.difficulty);
    saveSeason(game.season);
    game.screens.setSeason(summary(game.season));
  }
  return game.season;
}

// Title (or the standings card) → the next round: its circuit, then qualifying.
export function startRound(game) {
  const id = roundTrack(currentSeason(game));
  if (game.track.id !== id) game.loadTrack(trackById(id));
  game.qualiGrid = null;
  game.roundScored = false;
  game.screens.showSeason(false);
  startRace(game, 'quali');
}

// Qualifying results → the race, from the grid set by best laps.
export function startChampRace(game) {
  const times = game.field.entries.map((e) => ({ code: e.code, bestLap: e.bestLap }));
  game.qualiGrid = gridOrder(times).map((e) => e.code);
  startRace(game, 'champ');
}

// Race results → points for the round (once), saved; show = true brings up the standings card.
export function finishRound(game, show = true) {
  if (!game.roundScored) {
    const classification = game.field.order.map((e) => ({ code: e.code, bestLap: e.bestLap }));
    const { season, scored } = scoreRound(game.season, classification);
    Object.assign(game, { season, lastScored: scored, roundScored: true });
    saveSeason(season);
    game.screens.setSeason(summary(season));
  }
  if (show) {
    game.screens.showResults(false);
    game.screens.showSeason(true, game.season, game.lastScored, game.season.rounds.map((id) => trackById(id).name));
  }
}

// A fresh season from round one (the standings card's NEW SEASON).
export function newSeasonNow(game) {
  game.season = null;
  saveSeason(null);
  currentSeason(game);
  startRound(game);
}
