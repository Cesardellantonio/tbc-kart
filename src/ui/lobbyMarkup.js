// Static markup of the online lobby card: three panels (choose, status, room), one shown at a time.
// data-do="…" buttons are handled by Lobby.do(); host-only / client-only parts are hidden by CSS
// from the card's is-host class. Player names only ever go in through textContent (LobbyRoom.js).

import { DIFFICULTY } from '../config/race.js';
import { CODE_LENGTH, NAME_MAX } from '../config/lobby.js';

const levels = Object.entries(DIFFICULTY)
  .map(([id, d]) => `<button data-level="${id}">${d.label}</button>`)
  .join('');

const CHOOSE = `
  <section class="lobby-panel lobby-choose" data-panel="choose">
    <h2>RACE FRIENDS</h2>
    <label class="lobby-name"><span>YOUR NAME</span>
      <input data-ref="name" maxlength="${NAME_MAX * 2}" autocomplete="nickname" spellcheck="false" enterkeyhint="go"></label>
    <div class="lobby-options">
      <div class="lobby-option"><b>HOST A RACE</b><small>GET A CODE TO SHARE</small>
        <button class="btn btn-primary" data-do="create">CREATE ROOM <kbd>ENTER</kbd></button></div>
      <div class="lobby-option"><b>JOIN A FRIEND</b><small>TYPE THE ${CODE_LENGTH}-CHARACTER CODE</small>
        <div class="lobby-join">
          <input data-ref="codeInput" placeholder="CODE" autocomplete="off" autocapitalize="characters"
            spellcheck="false" enterkeyhint="join" aria-label="Room code">
          <button class="btn" data-do="join" data-ref="joinBtn">JOIN</button></div></div>
    </div>
    <div class="res-actions"><button class="btn" data-do="back">BACK <kbd>ESC</kbd></button></div>
  </section>`;

const STATUS = `
  <section class="lobby-panel lobby-status" data-panel="status">
    <div class="lobby-spinner" data-ref="spinner"></div>
    <h2 data-ref="statusTitle"></h2>
    <p data-ref="statusText"></p>
    <div class="res-actions">
      <button class="btn btn-primary" data-do="retry" data-ref="retry">TRY AGAIN <kbd>ENTER</kbd></button>
      <button class="btn" data-do="leave" data-ref="cancel">BACK <kbd>ESC</kbd></button></div>
  </section>`;

const ROOM = `
  <section class="lobby-panel lobby-room" data-panel="room">
    <div class="lobby-col">
      <div class="lobby-code"><small>ROOM CODE</small><b data-ref="roomCode"></b></div>
      <div class="lobby-share"><input data-ref="link" readonly aria-label="Invite link">
        <button class="btn" data-do="copy" data-ref="copy">COPY LINK</button></div>
      <div class="lobby-list-head"><span>DRIVERS</span><span data-ref="count"></span></div>
      <ol class="lobby-players" data-ref="players"></ol>
      <small class="lobby-ai" data-ref="aiNote"></small>
    </div>
    <div class="lobby-col">
      <div class="title-track lobby-track">
        <button class="tt-arrow host-only" data-do="prevTrack" aria-label="Previous track">◀</button>
        <canvas class="tt-map" data-ref="map"></canvas>
        <div class="tt-info"><small>TRACK</small><b data-ref="trackName"></b><span data-ref="trackFacts"></span></div>
        <button class="tt-arrow host-only" data-do="nextTrack" aria-label="Next track">▶</button>
      </div>
      <div class="title-level lobby-level"><span>RIVALS</span>${levels}</div>
      <button class="btn btn-primary lobby-start host-only" data-do="start" data-ref="start">START RACE <kbd>ENTER</kbd></button>
      <div class="lobby-wait client-only">WAITING FOR THE HOST TO START</div>
      <button class="btn lobby-leave" data-do="leave">LEAVE ROOM <kbd>ESC</kbd></button>
    </div>
  </section>`;

export const LOBBY_HTML = `<div class="lobby-card"><div class="title-kicker">ONLINE RACE</div>${CHOOSE}${STATUS}${ROOM}</div>`;
