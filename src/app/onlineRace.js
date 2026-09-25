// One online race inside the game, START to results. At START every browser loads the host's track,
// lines up the roster's grid and runs the countdown on the host's clock (so the lights go out together).
// Then, once a frame: your kart goes out to the room (NetRace), the other humans and the host's AI come
// back and are drawn from interpolation, contacts and slipstream against them move only the karts run
// here, the timing tower covers everyone, flags go to the host, and the host's classification ends it.

import { NetRace } from '../net/NetRace.js';
import { startRace } from './actions.js';
import { stepField } from './field.js';
import { announceOvertakes } from './frame.js';
import { onlineField, placeGrid, applyResults, applyFlag } from './onlineGrid.js';
import { dressOwnKart } from './RemoteKart.js';
import { kartSnapshot, physicsView } from './onlineStates.js';
import { trackById } from '../tracks/index.js';
import { DIFFICULTY } from '../config/race.js';
import { CONTACT_EXTRAPOLATE } from '../config/net.js';

export class OnlineRace {
  // pool: the RemotePool (kept across races); notify(text, sub): an on-screen notice.
  constructor(game, room, start, pool, notify) {
    Object.assign(this, { game, room, pool, notify, roster: start.roster, you: room.state.you });
    this.isHost = room.isHost;
    this.net = new NetRace({ room, start });
    this.final = false;
    const track = trackById(start.track);
    if (track !== game.track) game.loadTrack(track);
    for (const r of game.rivals) r.driver.difficulty = DIFFICULTY[start.level]?.pace ?? 1; // host's pick
    game.field = onlineField(game.world, start.roster, this.you, start.laps);
    game.session.laps = start.laps;
    game.session.follow(() => room.hostNow() - start.countdownAt);
    startRace(game, 'online', start.hold);
    dressOwnKart(game, start.roster.find((e) => e.id === this.you));
    const grid = placeGrid(game, start.roster, this.you, this.isHost);
    this.ai = grid.ai;
    pool.setRoster(start.roster.filter((e) => e.id !== this.you && !this.ai.some((r) => r.id === e.id)), grid.spots);
    this.others = [...this.ai, ...pool.list]; // minimap dots and engine sounds
    this.indices = game.field.entries.map((e) => this.indexSource(e));
  }

  // Where each kart's centreline sample comes from for the timing field.
  indexSource(entry) {
    const { game } = this;
    if (entry.id === this.you) return () => game.trackIndex;
    const rival = this.ai.find((r) => r.id === entry.id);
    if (rival) return () => rival.index;
    return () => this.pool.get(entry.id)?.index ?? entry.timer.lastIndex ?? 0; // gone: stays put
  }

  step(dt) {
    const { game, net } = this;
    const { session } = game;
    const state = session.state;
    const now = net.room.hostNow();
    const others = [...net.remoteStates(now, CONTACT_EXTRAPOLATE)].map(([, st]) => physicsView(st));
    stepField(game, dt, state !== 'countdown', this.ai, others);
    net.update(dt, { own: kartSnapshot(game.kart, game.trackIndex, game.field.player), ai: this.aiStates() });
    this.pool.draw(net.remoteStates(), dt, game.camera.three, game.renderer.three.domElement.height);
    if ((state === 'racing' || state === 'finished') && !this.final) this.time(state, dt);
    for (const e of net.poll()) this.on(e);
  }

  time(state, dt) {
    const { game, net } = this;
    for (const e of game.field.update(this.indices.map((index) => index()), game.session.clock)) {
      if (e.isPlayer && state === 'racing') {
        game.session.finish();
        net.finish(e.finishTime, e.bestLap);
      } else if (e.profile && this.isHost) net.aiFinish(e.id, e.finishTime, e.bestLap);
    }
    announceOvertakes(game, dt);
  }

  on(e) {
    const { game } = this;
    const entry = game.field.entries.find((d) => d.id === e.id);
    if (e.type === 'finish') applyFlag(game.field, e);
    else if (e.type === 'left') {
      const gone = this.pool.get(e.id);
      this.pool.remove(e.id);
      this.others = this.others.filter((o) => o !== gone);
      const out = entry && !this.final && entry.finishTime === null; // a finisher keeps the result
      if (out) entry.dnf = true;
      this.notify(`${(entry?.name ?? 'A driver').toUpperCase()} LEFT`, out ? 'DNF' : '');
    } else if (e.type === 'results') {
      applyResults(game.field, e.entries);
      this.final = true;
      if (this.isHost) this.room.endRace(); // the room can start the next race
      if (game.session.state === 'racing') game.session.finish(); // out of time: the card takes over
    } else if (e.type === 'host-gone') this.hostGone = true;
  }

  aiStates() {
    if (!this.isHost) return [];
    const { entries } = this.game.field;
    return this.ai.map((r) => ({ id: r.id, ...kartSnapshot(r.kart, r.index, entries.find((e) => e.id === r.id)) }));
  }

  dispose() {
    this.net.dispose();
    this.game.session.follow(null);
  }
}
