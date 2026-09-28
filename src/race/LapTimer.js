// Pure lap timing on centreline progress: line crossings, lap times, best lap, live delta, and three
// sectors per lap (thirds of the centreline) with the best time in each.

export const SECTORS = 3;

export class LapTimer {
  constructor(sampleCount, startIndex) {
    this.n = sampleCount;
    this.start = startIndex;
    this.best = null; // seconds
    this.bestSplits = null; // best-lap elapsed time at each sample of progress
    this.outLap = false; // qualifying: starting anywhere round the lap, the next line crossing starts lap 1
    this.bestSectors = Array(SECTORS).fill(null); // best time in each sector (any lap)
    this.bounds = Array.from({ length: SECTORS }, (_, k) => Math.floor(((k + 1) * sampleCount) / SECTORS)); // sample ends
    this.reset();
  }

  reset() {
    this.progress = null; // samples travelled relative to the start line (continuous, signed)
    this.lastIndex = null;
    this.lap = 0; // lap in progress; 0 = still on the run-up to the line
    this.lapStart = 0;
    this.lastLap = null;
    this.splits = new Float32Array(this.n).fill(NaN);
    [this._lastK, this._prevTime] = [-1, 0];
    this.sectors = Array(SECTORS).fill(null); // this lap's sector times so far
    this.sectorEvents = []; // sector events from the last update() (read them after it)
  }

  _wrap(d) {
    return d > this.n / 2 ? d - this.n : d < -this.n / 2 ? d + this.n : d; // shortest way round
  }

  // index: nearest centreline sample; time: seconds since the start. Returns a lap event or null.
  update(index, time) {
    if (this.lastIndex === null) {
      this.lastIndex = index;
      this.progress = this._wrap(index - this.start);
      if (this.outLap && this.progress >= 0) this.progress -= this.n; // past the line: a full out-lap to it
      this._prevTime = time;
      return null;
    }
    const prev = this.progress;
    this.progress += this._wrap(index - this.lastIndex);
    this.lastIndex = index;
    this.sectorEvents.length = 0;
    let event = null;
    const line = this.lap * this.n; // must drive a full lap forward to reach the next line
    if (prev < line && this.progress >= line) {
      const f = (line - prev) / (this.progress - prev);
      const tCross = this._prevTime + f * (time - this._prevTime);
      if (this.lap >= 1) {
        this._sector(SECTORS - 1, tCross - this.lapStart);
        event = this._complete(tCross);
      }
      this.lap += 1;
      this.lapStart = tCross;
      this.splits.fill(NaN);
      this.sectors.fill(null);
      this._lastK = -1;
    }
    if (this.lap >= 1) {
      const k = Math.floor(this.progress - (this.lap - 1) * this.n);
      for (let j = this._lastK + 1; j <= Math.min(k, this.n - 1); j++) {
        this.splits[j] = time - this.lapStart;
        const s = this.bounds.indexOf(j);
        if (s >= 0 && s < SECTORS - 1) this._sector(s, time - this.lapStart); // (the last one ends at the line)
      }
      this._lastK = Math.max(this._lastK, Math.min(k, this.n - 1));
    }
    this._prevTime = time;
    return event;
  }

  // Sector s closed at `elapsed` s into the lap: its time, and whether it is this timer's best there.
  _sector(s, elapsed) {
    const start = s === 0 ? 0 : this.splits[this.bounds[s - 1]];
    if (Number.isNaN(start) || (s > 0 && this.sectors[s - 1] === null)) return; // joined mid-lap: no time
    const time = elapsed - start;
    const previous = this.bestSectors[s];
    const isBest = previous === null || time < previous;
    if (isBest) this.bestSectors[s] = time;
    this.sectors[s] = time;
    this.sectorEvents.push({ type: 'sector', sector: s, lap: this.lap, time, isBest, delta: previous === null ? null : time - previous });
  }

  _complete(tCross) {
    const time = tCross - this.lapStart;
    const isBest = this.best === null || time < this.best;
    const delta = this.best === null ? null : time - this.best;
    this.lastLap = time;
    if (isBest) {
      this.best = time;
      this.bestSplits = Float32Array.from(this.splits);
    }
    return { type: 'lap', lap: this.lap, time, isBest, delta };
  }

  lapTime(time) {
    return this.lap >= 1 ? time - this.lapStart : 0;
  }

  // Live gap to the best lap at the current point (seconds, + = slower), or null.
  delta(time) {
    if (!this.bestSplits || this.lap < 1) return null;
    const k = Math.floor(this.progress - (this.lap - 1) * this.n);
    const ref = k >= 0 && k < this.n ? this.bestSplits[k] : NaN;
    return Number.isNaN(ref) ? null : time - this.lapStart - ref;
  }
}
