// Every kart's race: laps and finish time, running order, and gaps to the leader. Pure (no THREE).
// Gaps are real time gaps: when the leader passed the point where you are now.

import { LapTimer } from './LapTimer.js';

export class RaceField {
  // drivers: [{ code, name, color, isPlayer }]
  constructor(sampleCount, startIndex, laps, drivers) {
    this.n = sampleCount;
    this.laps = laps;
    this.entries = drivers.map((d) => ({
      ...d,
      timer: new LapTimer(sampleCount, startIndex),
      passTimes: new Float32Array(sampleCount * laps + 1),
    }));
    this.reset();
  }

  reset() {
    for (const e of this.entries) {
      e.timer.reset();
      e.passTimes.fill(NaN);
      Object.assign(e, { finishTime: null, bestLap: null, lapsDone: 0, progress: 0, _recorded: -1 });
    }
    this.order = [...this.entries];
  }

  get player() {
    return this.entries.find((e) => e.isPlayer);
  }

  // indices: nearest centreline sample for each entry (same order). Returns entries that just finished.
  update(indices, clock) {
    const finished = [];
    this.entries.forEach((e, k) => {
      if (e.finishTime !== null) return;
      const lap = e.timer.update(indices[k], clock);
      e.progress = e.timer.progress;
      const top = Math.min(Math.floor(e.progress), this.n * this.laps);
      for (let j = Math.max(0, e._recorded + 1); j <= top; j++) e.passTimes[j] = clock;
      e._recorded = Math.max(e._recorded, top);
      if (!lap) return;
      e.lapsDone = lap.lap;
      e.bestLap = e.bestLap === null ? lap.time : Math.min(e.bestLap, lap.time);
      if (lap.lap >= this.laps) {
        e.finishTime = e.timer.lapStart; // the crossing time of the chequered flag
        finished.push(e);
      }
    });
    this.order = [...this.entries].sort((a, b) => {
      if (a.finishTime !== null || b.finishTime !== null) {
        return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
      }
      return b.progress - a.progress;
    });
    return finished;
  }

  position(entry) {
    return this.order.indexOf(entry) + 1;
  }

  // Seconds behind the leader (0 for the leader), { laps } when lapped, or null before the line.
  gap(entry, clock) {
    const lead = this.order[0];
    if (entry === lead) return 0;
    if (entry.finishTime !== null) return entry.finishTime - lead.finishTime;
    const laps = Math.floor((lead.progress - entry.progress) / this.n);
    if (laps >= 1) return { laps };
    const at = lead.passTimes[Math.floor(entry.progress)];
    return Number.isNaN(at) || at === undefined ? null : Math.max(0, clock - at);
  }
}
