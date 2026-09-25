// The host's finish book for one online race (pure, unit-tested): who took the flag when, who left,
// when the classification is final (every human still here has finished, or RESULTS_GRACE after the
// first human's flag), and the final order: finishers by time, then karts still running by how far
// they got, then those who left (DNF).

export class FinishBook {
  constructor(roster, grace) {
    this.humans = roster.filter((e) => e.kind === 'human').map((e) => e.id);
    this.ids = roster.map((e) => e.id);
    this.grace = grace; // s
    this.done = new Map(); // id → { time, best }
    this.gone = new Set();
    this.firstHuman = null; // host-clock s of the first human's flag
  }

  // Returns false for a repeat, an unknown kart, or one that already left.
  record(id, time, best, now) {
    if (this.done.has(id) || this.gone.has(id) || !this.ids.includes(id)) return false;
    this.done.set(id, { time, best });
    if (this.humans.includes(id) && this.firstHuman === null) this.firstHuman = now;
    return true;
  }

  leave(id) {
    if (!this.done.has(id)) this.gone.add(id); // a finisher who then leaves keeps the result
  }

  due(now) {
    const humansDone = this.humans.every((id) => this.done.has(id) || this.gone.has(id));
    if (this.firstHuman === null) return false;
    return humansDone || now - this.firstHuman >= this.grace;
  }

  // progress(id): how far a kart still running got (larger = further), for the unfinished order.
  entries(progress) {
    const rank = (id) => (this.done.has(id) ? 0 : this.gone.has(id) ? 2 : 1);
    const order = [...this.ids].sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d) return d;
      if (rank(a) === 0) return this.done.get(a).time - this.done.get(b).time;
      return rank(a) === 1 ? progress(b) - progress(a) : 0;
    });
    return order.map((id) => {
      const f = this.done.get(id);
      return { id, time: f?.time ?? null, best: f?.best ?? null, dnf: this.gone.has(id) };
    });
  }
}
