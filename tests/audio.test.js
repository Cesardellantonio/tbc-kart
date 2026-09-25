// Audio lifecycle and rival engine voices (no real WebAudio: a fake context / no graph).

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { AudioEngine } from '../src/audio/AudioEngine.js';
import { PackSound } from '../src/audio/PackSound.js';
import { MASTER_VOLUME, LIFECYCLE, PACK } from '../src/config/audio.js';

describe('audio context lifecycle', () => {
  beforeAll(() => {
    globalThis.window ??= new EventTarget();
    globalThis.document ??= Object.assign(new EventTarget(), { hidden: false });
  });
  afterEach(() => vi.useRealTimers());

  const fakeAudio = () => {
    const audio = new AudioEngine();
    const gain = { targets: [], setTargetAtTime: (v) => gain.targets.push(v) };
    audio.ctx = { currentTime: 0, state: 'running', suspend: vi.fn(), resume: vi.fn() };
    audio.master = { gain };
    return { audio, gain };
  };
  const hide = (hidden) => {
    document.hidden = hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  it('fades out and suspends while the page is hidden, and comes back when it is shown', () => {
    vi.useFakeTimers();
    const { audio, gain } = fakeAudio();
    hide(true);
    expect(gain.targets.at(-1)).toBe(0);
    expect(audio.ctx.suspend).not.toHaveBeenCalled(); // not before the fade
    vi.advanceTimersByTime(LIFECYCLE.suspendMs);
    expect(audio.ctx.suspend).toHaveBeenCalledOnce();
    hide(false);
    expect(audio.ctx.resume).toHaveBeenCalledOnce();
    expect(gain.targets.at(-1)).toBe(MASTER_VOLUME);
  });

  it('does not suspend after a quick hide / show, and stays silent when shown while muted', () => {
    vi.useFakeTimers();
    const { audio, gain } = fakeAudio();
    audio.toggleMute();
    hide(true);
    hide(false);
    vi.advanceTimersByTime(LIFECYCLE.suspendMs * 2);
    expect(audio.ctx.suspend).not.toHaveBeenCalled();
    expect(gain.targets.at(-1)).toBe(0);
    hide(true);
    audio.unlock(); // a late gesture handler must not wake a hidden page
    expect(audio.ctx.resume).toHaveBeenCalledOnce(); // only from the earlier show
  });
});

describe('rival engine voices', () => {
  const kart = (x, z = 0) => ({ state: { x, z }, telemetry: { speed: 15, forwardSpeed: 15, slip: 0, sliding: false, throttle: 1 } });
  const listener = { x: 0, z: 0 };
  const newPack = () => new PackSound({ onReady() {}, ctx: null });

  it('keeps each voice on its kart while two karts swap which is nearer', () => {
    const pack = newPack();
    const [a, b, c] = [kart(5), kart(-5.2), kart(20)];
    pack.update(listener, [a, b, c], 1 / 60, true);
    const first = [...pack.bound];
    expect(first).toEqual(expect.arrayContaining([a, b]));
    for (let f = 0; f < 60; f++) {
      [a.state.x, b.state.x] = f % 2 ? [5, -5.2] : [5.3, -5]; // neck and neck, order flipping every frame
      pack.update(listener, [a, b, c], 1 / 60, true);
      expect(pack.bound).toEqual(first);
    }
    c.state.x = 5 - PACK.hold - 1; // a third kart comes clearly closer: it takes over one voice
    b.state.x = 9;
    pack.update(listener, [a, b, c], 1 / 60, true);
    expect(pack.bound).toContain(c);
    expect(pack.bound).toContain(a);
    expect(pack.bound.indexOf(a)).toBe(first.indexOf(a)); // the kart that stayed kept its voice
  });

  it("pops only when the voiced kart itself lifts, from that kart's own revs", () => {
    const pack = newPack();
    const [flat, coasting] = [kart(4), kart(-4.5)];
    coasting.telemetry.throttle = 0;
    const pops = pack.voices.map((v) => vi.spyOn(v.pops, 'trigger'));
    for (let f = 0; f < 120; f++) {
      [flat.state.x, coasting.state.x] = f % 2 ? [4, -4.5] : [4.6, -4]; // order flipping every frame
      pack.update(listener, [flat, coasting], 1 / 60, true);
    }
    for (const p of pops) expect(p).not.toHaveBeenCalled();
    flat.telemetry.throttle = 0; // now the flat-out kart really lifts
    pack.update(listener, [flat, coasting], 1 / 60, true);
    expect(pops[pack.bound.indexOf(flat)]).toHaveBeenCalledOnce();
    expect(pops[pack.bound.indexOf(coasting)]).not.toHaveBeenCalled();
  });

  it("restarts a kart's revs from idle when it is placed somewhere else (grid, reset)", () => {
    const pack = newPack();
    const k = kart(3);
    for (let f = 0; f < 120; f++) pack.update(listener, [k], 1 / 60, true);
    expect(pack.model(k).rpm).toBeGreaterThan(4000);
    Object.assign(k.telemetry, { speed: 0, forwardSpeed: 0, throttle: 0 });
    k.state.x = 40;
    pack.update(listener, [k], 1 / 60, true);
    expect(pack.model(k).rpm).toBeLessThan(1800);
  });
});
