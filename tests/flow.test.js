// Game flow outside the race itself: key / pad bindings on the results card, which track opens,
// record signatures, and the grid-accelerated centreline query track loading relies on.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Input } from '../src/core/Input.js';
import { BINDINGS } from '../src/config/input.js';
import { resultsChoice } from '../src/app/actions.js';
import { chooseTrack, recordSignature } from '../src/app/trackChoice.js';
import { TRACKS } from '../src/tracks/index.js';
import { pathOf } from '../src/track/validate.js';
import { seededRandom } from '../src/core/math.js';

describe('results card input', () => {
  let target;
  let pad;
  let input;
  const press = (code) => {
    const e = new Event('keydown');
    Object.assign(e, { code, repeat: false });
    target.dispatchEvent(e);
  };
  const padPress = (button) => {
    pad.buttons[button] = { pressed: true, value: 1 };
    input.poll();
  };
  const frame = () => {
    const choice = resultsChoice(input);
    input.endFrame();
    return choice;
  };

  beforeEach(() => {
    target = new EventTarget();
    pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    input = new Input(target);
    input.poll();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('ignores the driving keys a player is still pressing as they cross the line', () => {
    const driving = [...BINDINGS.throttle, ...BINDINGS.brake, ...BINDINGS.left, ...BINDINGS.right, ...BINDINGS.handbrake];
    for (const code of driving) {
      press(code);
      expect(frame(), code).toBe(null);
    }
  });

  it('has its own keys: Enter / R race again, N next track, Esc / Q menu', () => {
    for (const [code, want] of [['Enter', 'again'], ['KeyR', 'again'], ['KeyN', 'next'], ['Escape', 'menu'], ['KeyQ', 'menu']]) {
      press(code);
      expect(frame(), code).toBe(want);
    }
  });

  it('pad: Start races again (not the menu), D-pad down is next track, B is the menu', () => {
    padPress(9);
    expect(frame()).toBe('again');
    pad.buttons[9] = { pressed: false, value: 0 };
    padPress(13);
    expect(frame()).toBe('next');
    pad.buttons[13] = { pressed: false, value: 0 };
    padPress(1);
    expect(frame()).toBe('menu');
    pad.buttons[1] = { pressed: false, value: 0 };
    padPress(6); // LT: brake
    padPress(0); // A: handbrake
    expect(frame()).toBe(null);
  });

  it('pad D-pad drives the title card', () => {
    const fired = (b) => {
      pad.buttons = pad.buttons.map(() => ({ pressed: false, value: 0 }));
      input.poll();
      pad.buttons[b] = { pressed: true, value: 1 };
      input.poll();
      const names = ['prevTrack', 'nextTrack', 'left', 'right'].filter((n) => input.action(n));
      input.endFrame();
      return names;
    };
    expect(fired(12)).toEqual(['prevTrack']);
    expect(fired(13)).toEqual(['nextTrack']);
    expect(fired(14)).toEqual(['left']);
    expect(fired(15)).toEqual(['right']);
  });
});

describe('opening track', () => {
  const [tbc, monaco, spa] = ['tbc', 'monaco', 'spa'].map((id) => TRACKS.find((t) => t.id === id));

  it('takes a valid ?track= (any case) over the saved track', () => {
    expect(chooseTrack('spa', 'monaco', TRACKS)).toEqual({ track: spa, fromUrl: true, unknown: null });
    expect(chooseTrack('Spa', 'monaco', TRACKS).track).toBe(spa);
  });

  it('falls back to the saved track for an unknown or empty id, and reports only the unknown one', () => {
    expect(chooseTrack('bogus', 'monaco', TRACKS)).toEqual({ track: monaco, fromUrl: false, unknown: 'bogus' });
    expect(chooseTrack('', 'monaco', TRACKS)).toEqual({ track: monaco, fromUrl: false, unknown: null });
    expect(chooseTrack(null, 'monaco', TRACKS)).toEqual({ track: monaco, fromUrl: false, unknown: null });
  });

  it('falls back to the first track when nothing valid is saved', () => {
    expect(chooseTrack(null, null, TRACKS).track).toBe(tbc);
    expect(chooseTrack(null, 'gone', TRACKS).track).toBe(tbc);
  });
});

describe('record signature', () => {
  const sig = (track) => {
    const path = pathOf(track);
    return recordSignature(track, path, path.nearest(...track.waypoints[track.startIndex]));
  };
  const monza = TRACKS.find((t) => t.id === 'monza');

  it('keeps the v2 form (count:length) on the home track so old records stay valid', () => {
    const path = pathOf(TRACKS[0]);
    expect(sig(TRACKS[0])).toBe(`${path.count}:${path.length.toFixed(1)}`);
    expect(sig(TRACKS[0])).toBe('1000:248.6');
  });

  it('is unique per track and stable', () => {
    const all = TRACKS.map(sig);
    expect(new Set(all).size).toBe(all.length);
    expect(sig(monza)).toBe(sig({ ...monza }));
  });

  it('changes when the layout is re-started, re-widened, moved, mirrored or reversed', () => {
    const base = sig(monza);
    const wp = monza.waypoints;
    const variants = {
      start: { ...monza, startIndex: 42 },
      width: { ...monza, width: (monza.width ?? 6) + 1 },
      moved: { ...monza, waypoints: wp.map(([x, z]) => [x + 10, z]) },
      mirrored: { ...monza, waypoints: wp.map(([x, z]) => [-x, z]) },
      reversed: { ...monza, waypoints: [wp[0], ...wp.slice(1).reverse()] },
    };
    for (const [name, t] of Object.entries(variants)) expect(sig(t), name).not.toBe(base);
  });
});

describe('TrackPath.within', () => {
  it('matches a brute-force scan on every track', () => {
    const rnd = seededRandom(7);
    for (const track of TRACKS) {
      const path = pathOf(track);
      const brute = (x, z, r) => {
        for (let i = 0; i < path.count; i++) if ((path.x[i] - x) ** 2 + (path.z[i] - z) ** 2 < r * r) return true;
        return false;
      };
      for (let k = 0; k < 600; k++) {
        const i = Math.floor(rnd() * path.count);
        const r = 0.5 + rnd() * 12;
        const [x, z] = [path.x[i] + (rnd() - 0.5) * 3 * r, path.z[i] + (rnd() - 0.5) * 3 * r];
        expect(path.within(x, z, r), `${track.id} (${x}, ${z}) r=${r}`).toBe(brute(x, z, r));
      }
      expect(path.within(path.x[0], path.z[0], 0)).toBe(false);
    }
  });
});
