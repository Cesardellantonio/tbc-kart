// The ONLINE mode's glue: one Room for the page (bound to the lobby card by onlineLobby.js), the room's
// START becoming an OnlineRace, the room stepped every frame, the keys during and after an online race,
// and the way back to the title (LEAVE, or the host going away).

import { Room } from '../net/Room.js';
import { Transport } from '../net/Transport.js';
import { OnlineRace } from './onlineRace.js';
import { RemotePool } from './remotePool.js';
import { dressOwnKart } from './RemoteKart.js';
import { goTitle, respawn, resultsChoice } from './actions.js';
import { setFieldTrack } from './field.js';
import { randomHold } from '../race/RaceSession.js';
import { bindLobby, stepTrack } from './onlineLobby.js';
import { trackById } from '../tracks/index.js';
import { NET_TICK } from '../config/net.js';

export class Online {
  constructor(game, makeTransport = () => new Transport()) {
    this.game = game;
    this.room = new Room({ makeTransport });
    this.pool = new RemotePool(game.renderer.scene);
    this.race = null;
    this.room.on('start', (start) => this.begin(start));
    bindLobby(this, game); // after the room is ready: a ?room= link joins at once
    // Frames stop in a background tab, timers don't: the room's heartbeat must not depend on frames.
    setInterval(() => this.room.update(), NET_TICK * 1000);
    // Closing the tab: say goodbye, so the others read "host left" / "driver left" at once.
    window.addEventListener('pagehide', () => this.room.leave());
  }

  get active() {
    return !!this.race;
  }

  // Karts driven elsewhere or by the host's AI: the minimap's dots and the pack's engines.
  get others() {
    return this.race?.others ?? [];
  }

  // Host: START from the lobby, RACE AGAIN (offset 0) or NEXT TRACK (1) from the results card.
  start(offset = 0) {
    const { room } = this;
    if (!room.isHost || room.racing) return;
    if (offset) room.setLobby({ track: stepTrack(room.state.track, offset) });
    room.start({ laps: trackById(room.state.track).laps, hold: randomHold() });
  }

  begin(start) {
    this.race?.dispose();
    this.game.screens.lobby.show(false);
    this.game.screens.showOnlinePause(false);
    this.game.screens.results.setOnline(this.room.isHost ? 'host' : 'client');
    this.race = new OnlineRace(this.game, this.room, start, this.pool, this.notify);
  }

  notify = (text, sub = '') => this.game.screens.notify(text, sub);

  // Every frame (heartbeats and clock pings, also in the lobby), then the race if there is one.
  step(dt) {
    this.room.update();
    this.race?.step(dt);
    const gone = this.race?.hostGone;
    if (gone) this.leave(gone === 'closed' ? 'HOST LEFT' : 'CONNECTION LOST');
  }

  // Keys in an online race: Esc toggles the small card over the running race (nothing pauses), Q on
  // it leaves; on the results card the host picks what's next for everyone and anyone can leave.
  handle(input, state) {
    const { screens } = this.game;
    if (state === 'finished') {
      screens.showOnlinePause(false);
      const choice = resultsChoice(input);
      if (choice === 'menu') this.leave();
      else if (choice) this.start(choice === 'next' ? 1 : 0);
      return;
    }
    if (input.action('pause')) screens.showOnlinePause(!screens.onlinePause.visible);
    if (input.action('quit') && screens.onlinePause.visible) return this.leave();
    if (input.action('reset') && state === 'racing') respawn(this.game);
  }

  // Back to the title: out of the room, the online karts gone, single-player put back as it was.
  leave(notice = null) {
    const { game } = this;
    this.room.leave();
    this.race?.dispose();
    this.race = null;
    this.pool.clear();
    dressOwnKart(game, null);
    game.field = game.soloField;
    game.field.reset();
    setFieldTrack(game); // the rivals' level goes back to the title card's
    game.screens.results.setOnline(null);
    game.screens.showOnlinePause(false);
    game.screens.lobby.show(false);
    goTitle(game);
    if (notice) this.notify(notice, 'BACK TO THE MENU');
    const url = new URL(window.location.href);
    if (url.searchParams.has('room')) {
      url.searchParams.delete('room'); // a reload must not rejoin a room that is gone
      window.history.replaceState(window.history.state, '', url);
    }
  }
}
