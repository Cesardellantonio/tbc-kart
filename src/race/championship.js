// Championship season (pure, plus its save): a round per circuit in menu order, qualifying then the
// race, points to the top ten (and one for the fastest lap), the standings after every round.

import { CHAMPIONSHIP } from '../config/race.js';

// rounds: track ids in order; drivers: [{ code, name, color }] (you included, code 'YOU').
export function newSeason(rounds, drivers, level) {
  return {
    version: 1,
    rounds: [...rounds],
    round: 0, // index of the next round to run
    level,
    drivers: drivers.map(({ code, name, color }) => ({ code, name, color, points: 0, wins: 0, podiums: 0, finishes: [] })),
    results: [], // per round: { track, order: [codes], fastest: code | null }
  };
}

export const seasonDone = (season) => season.round >= season.rounds.length;
export const roundTrack = (season) => season.rounds[Math.min(season.round, season.rounds.length - 1)];

// Points for finishing position p (1-based), plus the fastest-lap point for a top-ten finisher.
export const pointsFor = (p, fastest = false) => (CHAMPIONSHIP.points[p - 1] ?? 0) + (fastest && p <= CHAMPIONSHIP.points.length ? CHAMPIONSHIP.fastestLap : 0);

// classification: [{ code, bestLap }] in finishing order. Returns the new season (the old one is left
// alone) and what each driver scored: { season, scored: { code: points } }.
export function scoreRound(season, classification) {
  const next = structuredClone(season);
  let fastest = null;
  for (const e of classification) if (e.bestLap != null && (fastest === null || e.bestLap < fastest.bestLap)) fastest = e;
  const scored = {};
  classification.forEach((e, i) => {
    const d = next.drivers.find((x) => x.code === e.code);
    if (!d) return;
    const pts = pointsFor(i + 1, fastest?.code === e.code);
    scored[e.code] = pts;
    d.points += pts;
    d.finishes.push(i + 1);
    if (i === 0) d.wins++;
    if (i < 3) d.podiums++;
  });
  next.results.push({ track: season.rounds[season.round], order: classification.map((e) => e.code), fastest: fastest?.code ?? null });
  next.round++;
  return { season: next, scored };
}

// Drivers by points; ties go to more wins, then more of each better finish (countback), then name.
export function standings(season) {
  const countback = (a, b) => {
    for (let p = 1; p <= 12; p++) {
      const d = b.finishes.filter((f) => f === p).length - a.finishes.filter((f) => f === p).length;
      if (d) return d;
    }
    return 0;
  };
  return [...season.drivers].sort((a, b) => b.points - a.points || b.wins - a.wins || countback(a, b) || a.name.localeCompare(b.name));
}

// Your line for the title card: { round, of, position, points } or null with no season running.
export function summary(season, code = 'YOU') {
  if (!season) return null;
  const table = standings(season);
  const me = table.find((d) => d.code === code);
  return { round: season.round + 1, of: season.rounds.length, position: table.indexOf(me) + 1, points: me?.points ?? 0, done: seasonDone(season) };
}

// Saved in the browser between sessions (one season per edition: see CHAMPIONSHIP.key).
export function loadSeason(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage?.getItem(CHAMPIONSHIP.key) ?? 'null');
    return s?.version === 1 && Array.isArray(s.rounds) && Array.isArray(s.drivers) ? s : null;
  } catch {
    return null;
  }
}

export function saveSeason(season, storage = globalThis.localStorage) {
  try {
    if (season) storage?.setItem(CHAMPIONSHIP.key, JSON.stringify(season));
    else storage?.removeItem(CHAMPIONSHIP.key);
  } catch {
    // storage unavailable: the season lasts as long as the page
  }
}
