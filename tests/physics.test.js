// Kart dynamics (single-track model): engine, rear-only brakes, reverse, grip, load transfer,
// power oversteer, lift-off rotation, handbrake slides, countersteer assist and numerical health.

import { describe, it, expect } from 'vitest';
import { stepKart } from '../src/physics/kartPhysics.js';
import { axleLoads } from '../src/physics/tyres.js';
import { frontAxle, rearAxle } from '../src/physics/axles.js';
import { rampThrottle, engineAccel } from '../src/physics/controls.js';
import {
  TYRE_PEAK_SLIP, THROTTLE_JUMP, THROTTLE_JUMP_FROM, THROTTLE_JUMP_FULL, THROTTLE_JUMP_SLIP, THROTTLE_RISE, THROTTLE_RISE_LOW,
  THROTTLE_LOW_SLIP, ENGINE_ACCEL, TOP_SPEED, LOW_SPEED_PULL, LOW_SPEED_TURN, LOW_SPEED_FADE,
} from '../src/config/physics.js';
import { seededRandom, wrapAngle } from '../src/core/math.js';

const DT = 1 / 120;
const rest = () => ({ x: 0, z: 0, yaw: 0, vx: 0, vz: 0, steer: 0, yawRate: 0 });
const moving = (v) => ({ ...rest(), vz: -v }); // yaw 0 faces −Z
const input = (o = {}) => ({ throttle: 0, brake: 0, steer: 0, handbrake: false, ...o });
const speedOf = (s) => Math.hypot(s.vx, s.vz);
const heading = (s) => Math.atan2(-s.vx, -s.vz);

// controls: input object or (state, t) => input. onStep(state, t) sees every step.
function run(state, controls, seconds, onStep) {
  let s = state;
  for (let i = 0, n = Math.round(seconds / DT); i < n; i++) {
    s = stepKart(s, typeof controls === 'function' ? controls(s, i * DT) : controls, DT);
    onStep?.(s, (i + 1) * DT);
  }
  return s;
}

// Throttle that holds roughly `v` m/s, like a driver keeping a steady pace through a corner.
const holdSpeed = (v, steer) => (s) => input({ steer, throttle: Math.min(1, Math.max(0, 0.15 + (v - s.forwardSpeed) * 0.5)) });
// Settled mid-corner at the grip limit: 9.5 m/s at 0.8 lock ≈ 12 m/s² lateral.
const atTheLimit = () => run(moving(10), holdSpeed(10, 0.8), 3);
// A drift started the way a player would: full lock and throttle, then a 0.2 s stab of the drift button.
const stabbed = () => run(moving(12), (s, t) => input({ throttle: 1, steer: 1, handbrake: t < 0.2 }), 0.2);

describe('kartPhysics — straight line', () => {
  it('pulls away briskly and moves forward (−Z at yaw 0)', () => {
    const s = run(rest(), input({ throttle: 1 }), 1);
    expect(s.forwardSpeed).toBeGreaterThan(6);
    expect(s.z).toBeLessThan(0);
    expect(Math.abs(s.x)).toBeLessThan(1e-6);
  });

  it('tops out around 60–63 km/h on the flat', () => {
    const s = run(rest(), input({ throttle: 1 }), 15);
    expect(s.forwardSpeed * 3.6).toBeGreaterThan(59);
    expect(s.forwardSpeed * 3.6).toBeLessThan(64);
  });

  it('stops from top speed on the rear brakes alone in about two seconds, straight and true', () => {
    let s = run(rest(), input({ throttle: 1 }), 15);
    const start = { x: s.x, z: s.z };
    let t = 0;
    while (s.forwardSpeed > 0.05 && t < 4) {
      s = stepKart(s, input({ brake: 1 }), DT);
      t += DT;
    }
    expect(t).toBeGreaterThan(1.4); // rear-only brakes: ~0.75 g average including drag
    expect(t).toBeLessThan(2.5);
    expect(Math.hypot(s.x - start.x, s.z - start.z)).toBeLessThan(20);
    expect(Math.abs(s.yaw)).toBeLessThan(1e-9);
  });

  it('stays straight under a stamped brake pedal when nudged off line', () => {
    for (const start of [{ yawRate: 0.05 }, { vx: -0.2 }]) {
      let worst = 0;
      run({ ...moving(14), ...start }, input({ brake: 1 }), 1.4, (s) => (worst = Math.max(worst, Math.abs(s.slipAngle))));
      expect(worst).toBeLessThan(0.05);
    }
  });

  it('a full brake pedal still leaves the rear some cornering grip', () => {
    // rear at its braking limit, sliding sideways: it must push back, not give all its grip to the brake
    const r = rearAxle(12, 0.3, 640, { drive: 0, brake: 1100 }, false, DT);
    expect(r.lateral).toBeLessThan(-150);
    expect(r.brake).toBeGreaterThan(700);
    for (const v of [8, 11, 14]) {
      let s = run(moving(16), input({ brake: 1 }), 0.1);
      while (s.forwardSpeed > v) s = stepKart(s, input({ brake: 1 }), DT);
      let worst = 0;
      run(s, (_, t) => input({ brake: 1, steer: t < 0.15 ? 1 : 0 }), 1.5, (st) => speedOf(st) > 3 && (worst = Math.max(worst, Math.abs(st.slipAngle))));
      expect(worst, `steer tap braking at ${v} m/s`).toBeLessThan(0.3);
    }
  });

  it('then reverses slowly, capped at about 4 m/s, and steers in reverse', () => {
    const stopped = run(run(rest(), input({ throttle: 1 }), 5), input({ brake: 1 }), 2.5);
    const reversing = run(stopped, input({ brake: 1 }), 3);
    expect(reversing.forwardSpeed).toBeLessThan(-3);
    expect(reversing.forwardSpeed).toBeGreaterThanOrEqual(-4.0001);
    const turning = run(reversing, input({ brake: 1, steer: 1 }), 1);
    expect(turning.yaw).toBeLessThan(-0.3); // backing up with left lock swings the nose right
  });

  it('cuts drag in a slipstream', () => {
    const top = (draft) => run(rest(), input({ throttle: 1, draft }), 20).forwardSpeed;
    expect(top(1)).toBeGreaterThan(top(0) + 0.4);
  });
});

describe('kartPhysics — standstill and numerics', () => {
  it('does not rotate or creep when stationary, whatever the inputs', () => {
    for (const c of [input({ steer: 1 }), input({ steer: -1, handbrake: true }), input({ brake: 0.01, throttle: 0.01 })]) {
      const s = run(rest(), c, 1);
      expect(s.yaw).toBe(0);
      expect(s.yawRate).toBe(0);
    }
    const settled = run({ ...rest(), vx: 0.05, yawRate: 0.02 }, input(), 1);
    expect(speedOf(settled)).toBeLessThan(1e-6);
    expect(Math.abs(settled.yawRate)).toBeLessThan(1e-6);
  });

  it('treats a zero-length step as a no-op (no NaN — it once made the kart vanish)', () => {
    const s0 = run(rest(), input({ throttle: 1, steer: 0.5 }), 1);
    const same = stepKart(s0, input({ throttle: 1, steer: 1 }), 0);
    for (const k of ['x', 'z', 'yaw', 'vx', 'vz', 'yawRate', 'longAccel', 'latAccel', 'slipAngle', 'drift']) {
      expect(Number.isFinite(same[k]), k).toBe(true);
    }
    for (const k of ['x', 'z', 'yaw', 'vx', 'vz', 'yawRate', 'steer']) expect(same[k]).toBe(s0[k]);
  });

  it('stays finite and bounded over a long random-input run', () => {
    const rnd = seededRandom(7);
    let c = input();
    const fields = ['x', 'z', 'yaw', 'vx', 'vz', 'yawRate', 'longAccel', 'latAccel', 'slipAngle', 'frontSlip', 'rearSlip', 'drift'];
    const pick = () =>
      input({ throttle: rnd() < 0.6 ? rnd() : 0, brake: rnd() < 0.25 ? rnd() : 0, steer: rnd() * 2 - 1, handbrake: rnd() < 0.15, draft: rnd() });
    const s = run(rest(), (_, t) => (Math.abs(t % 0.3) < DT / 2 ? (c = pick()) : c), 180, (st) => {
      for (const k of fields) if (!Number.isFinite(st[k])) throw new Error(`${k} went non-finite`);
      if (speedOf(st) > 20 || Math.abs(st.yawRate) > 12) throw new Error('unbounded motion');
    });
    expect(Number.isFinite(s.x)).toBe(true);
  });
});

describe('player throttle shaping', () => {
  // Drive (m/s²) a throttle share asks for at speed v.
  const drive = (thr, v) => thr * engineAccel(v);

  const opened = (v, slip, frames = 6) => {
    let t = 0;
    for (let i = 0; i < frames; i++) t = rampThrottle(t, 1, slip, 1 / 60, v); // 0.1 s
    return t;
  };

  it('opens over ~0.2 s in corners (a keyboard feathers there), with an instant shove at speed', () => {
    const turning = THROTTLE_LOW_SLIP; // body slip of a kart turning at walking pace
    for (const v of [4, 6, THROTTLE_JUMP_FROM]) expect(opened(v, turning), `${v} m/s`).toBeCloseTo(0.5, 5);
    expect(opened(THROTTLE_JUMP_FROM, 0)).toBeCloseTo(0.5, 5); // 36 km/h, straight: still the ramp
    for (const v of [THROTTLE_JUMP_FULL, 15]) {
      expect(drive(rampThrottle(0, 1, 0, 1 / 60, v), v), `${v} m/s`).toBeCloseTo(THROTTLE_JUMP, 5);
    }
    const mid = (THROTTLE_JUMP_FROM + THROTTLE_JUMP_FULL) / 2; // phased in between
    expect(drive(rampThrottle(0, 1, 0, 1 / 60, mid), mid)).toBeCloseTo(THROTTLE_JUMP / 2, 5);
    expect(rampThrottle(0, 1, 0, 1 / 60, 16)).toBe(1); // near the top the engine has less than the shove to give
  });

  it('opens quicker at walking pace when the kart runs straight (lift and go), not while it turns', () => {
    expect(opened(4, 0, 3)).toBeCloseTo(THROTTLE_RISE_LOW / 20, 5); // 0.05 s
    expect(opened(4, THROTTLE_LOW_SLIP, 3)).toBeCloseTo(THROTTLE_RISE / 20, 5);
    expect(opened(4, -THROTTLE_LOW_SLIP, 3)).toBeCloseTo(THROTTLE_RISE / 20, 5);
  });

  it('takes the shove away once the tail is out mid-corner', () => {
    expect(rampThrottle(0, 1, THROTTLE_JUMP_SLIP, 1 / 60, 15)).toBeCloseTo(THROTTLE_RISE / 60, 9);
    expect(rampThrottle(0, 1, -THROTTLE_JUMP_SLIP, 1 / 60, 15)).toBeCloseTo(THROTTLE_RISE / 60, 9);
    const half = drive(rampThrottle(0, 1, THROTTLE_JUMP_SLIP / 2, 1 / 60, 15), 15);
    expect(half).toBeCloseTo(THROTTLE_JUMP / 2, 5);
  });

  it('pulls harder at walking pace, but only once the kart stops rotating', () => {
        expect(engineAccel(3) - (ENGINE_ACCEL * (1 - (3 / TOP_SPEED) ** 2))).toBeCloseTo(LOW_SPEED_PULL, 9);
    expect(engineAccel(3, LOW_SPEED_TURN)).toBeCloseTo(ENGINE_ACCEL * (1 - (3 / TOP_SPEED) ** 2), 9); // swinging round a hairpin
    expect(engineAccel(3, -LOW_SPEED_TURN)).toBeCloseTo(engineAccel(3, LOW_SPEED_TURN), 9);
    expect(engineAccel(LOW_SPEED_FADE)).toBeCloseTo(ENGINE_ACCEL * (1 - (LOW_SPEED_FADE / TOP_SPEED) ** 2), 9);
  });

  it('falls back to the plain ramp when the speed is missing or not finite (never NaN, never a free pass)', () => {
    for (const v of [undefined, NaN, Infinity]) expect(rampThrottle(0, 1, 0, 1 / 60, v), String(v)).toBeCloseTo(THROTTLE_RISE / 60, 9);
  });

  it('closes at once, and passes straight through in a slide', () => {
    expect(rampThrottle(0.5, 0, 0, 1 / 60, 10)).toBe(0);
    expect(rampThrottle(0, 1, 0.4, 1 / 60, 10)).toBe(1);
    expect(rampThrottle(0, 1, -0.4, 1 / 60, 10)).toBe(1);
  });

  it('does not hold back a launch from the grid or from walking pace', () => {
    expect(rampThrottle(0, 1, 0, 1 / 60, 0)).toBe(1);
    expect(rampThrottle(0, 1, 0, 1 / 60, 2.5)).toBe(1);
    expect(rampThrottle(0, 1, 0, 1 / 60, 6)).toBeLessThan(0.2);
  });

  it('stops a floored exit from a tight corner snapping the rear', () => {
    const s0 = run(moving(6), holdSpeed(6, 1), 3);
    const peak = (ramped) => {
      let [thr, beta] = [0, 0];
      const c = (s) => input({ steer: 1, throttle: ramped ? (thr = rampThrottle(thr, 1, s.slipAngle, DT, speedOf(s))) : 1 });
      run(s0, c, 0.5, (st) => (beta = Math.max(beta, Math.abs(st.slipAngle))));
      return beta;
    };
    expect(peak(false)).toBeGreaterThan(0.5); // a raw 0.9 g step spins the rear out
    expect(peak(true)).toBeLessThan(0.45);
  });
});

describe('kartPhysics — grip, load transfer and balance', () => {
  it('holds a grippy line below the limit', () => {
    let worst = 0;
    const s = run(moving(10), holdSpeed(10, 0.35), 3, (st, t) => t > 0.5 && (worst = Math.max(worst, st.drift)));
    expect(worst).toBe(0);
    expect(Math.abs(s.slipAngle)).toBeLessThan(0.05);
    expect(Math.abs(s.rearSlip)).toBeLessThan(TYRE_PEAK_SLIP);
    expect(s.latAccel).toBeGreaterThan(4);
    expect(s.latAccel).toBeCloseTo(s.forwardSpeed * s.yawRate, 0); // steady state: a = v·r
  });

  it('holds a grippy line at full lock (speed-sensitive lock, no slide)', () => {
    const s = run(moving(12), input({ throttle: 1, steer: 1 }), 3);
    expect(s.yaw).toBeGreaterThan(2); // turned left a long way
    expect(s.sliding).toBe(false);
    expect(s.slip).toBeLessThan(2.5);
  });

  it('loads the front under braking, so the front tyres grip harder', () => {
    const braking = axleLoads(-7);
    const coasting = axleLoads(0);
    expect(braking.front).toBeGreaterThan(coasting.front * 1.3);
    expect(braking.rear).toBeLessThan(coasting.rear);
    const fy = (load) => frontAxle(10, 0, 0.12, load, DT).fy; // same slip angle, different load
    expect(fy(braking.front)).toBeGreaterThan(fy(coasting.front) * 1.3);
    const s = run(moving(14), input({ brake: 1 }), 0.5);
    expect(s.loadAccel).toBeLessThan(-4); // the chassis has pitched forward
  });

  it('power oversteer: full throttle at the limit mid-corner steps the rear out', () => {
    const s0 = atTheLimit();
    const peak = (controls) => {
      let beta = 0;
      let rear = 0;
      run(s0, controls, 0.6, (st) => ((beta = Math.max(beta, -st.slipAngle)), (rear = Math.max(rear, Math.abs(st.rearSlip)))));
      return { beta, rear };
    };
    const neutral = peak(holdSpeed(10, 0.8));
    const power = peak(input({ steer: 0.8, throttle: 1 }));
    expect(power.beta).toBeGreaterThan(neutral.beta + 0.05);
    expect(power.rear).toBeGreaterThan(TYRE_PEAK_SLIP); // rear past its peak
  });

  it('lift-off and trail-braking rotate the kart', () => {
    const s0 = atTheLimit();
    const yawRateAfter = (controls) => run(s0, controls, 0.35).yawRate;
    const neutral = yawRateAfter(holdSpeed(10, 0.8));
    expect(yawRateAfter(input({ steer: 0.8 }))).toBeGreaterThan(neutral * 1.15); // lift
    expect(yawRateAfter(input({ steer: 0.8, brake: 0.3 }))).toBeGreaterThan(neutral * 1.15); // trail brake
  });
});

describe('kartPhysics — drifting', () => {
  it('a stab of the drift button into a corner starts a slide and scrubs speed', () => {
    const grip = run(moving(12), input({ throttle: 1, steer: 1 }), 0.2);
    const stab = stabbed();
    expect(stab.forwardSpeed).toBeLessThan(grip.forwardSpeed - 0.8); // locked rear decelerates
    const s = run(stab, input({ throttle: 1, steer: 0.5 }), 0.2);
    expect(s.drift).toBeGreaterThan(0.5);
    expect(s.sliding).toBe(true);
    expect(-s.slipAngle).toBeGreaterThan(0.15); // tail out to the right in a left-hander
  });

  it('holding the drift button never stops the kart: the lock is a short kick, then drive returns', () => {
    const fromRest = run(rest(), input({ throttle: 1, handbrake: true }), 2);
    expect(fromRest.forwardSpeed).toBeGreaterThan(10);
    const held = run(moving(12), input({ throttle: 1, handbrake: true }), 2);
    expect(held.forwardSpeed).toBeGreaterThan(12);
    const cornering = run(moving(12), input({ throttle: 0.5, steer: 1, handbrake: true }), 2);
    expect(cornering.forwardSpeed).toBeGreaterThan(7);
    expect(Math.abs(cornering.slipAngle)).toBeLessThan(0.3);
  });

  it('countersteer assist catches a slide instead of spinning', () => {
    const s0 = stabbed();
    let worst = 0;
    const caught = run(s0, input({ throttle: 0.5 }), 2, (st) => (worst = Math.max(worst, Math.abs(st.slipAngle))));
    expect(worst).toBeLessThan(0.6);
    expect(Math.abs(caught.slipAngle)).toBeLessThan(0.05);
    expect(Math.abs(wrapAngle(caught.yaw - heading(caught)))).toBeLessThan(0.05);
    expect(caught.forwardSpeed).toBeGreaterThan(9);
    // The same hands-off driving with the wheels left straight (no assist) spins the kart.
    let spun = false;
    run(s0, input({ throttle: 0.5, assist: 0 }), 2, (st) => (spun ||= Math.abs(st.slipAngle) > Math.PI / 2 || st.forwardSpeed < 0));
    expect(spun).toBe(true);
  });

  // A human on keys: sees the body angle 110 ms late with its trend over the last 50 ms, holds a key at
  // least 60 ms, keeps full lock, lifts when the angle 0.2 s ahead passes 26° and floors it below 17°.
  // The throttle goes through the game's rise limiter, as the player's does.
  function keyboardDrift(v, tap) {
    const lag = Math.round(0.11 / DT);
    const trendN = Math.round(0.05 / DT);
    const seen = [];
    let [s, key, want, since, thr, cur, best, spun] = [moving(v), 1, 1, -1, 1, 0, 0, false];
    for (let i = 0; i < 4 / DT; i++) {
      const t = i * DT;
      seen.push(-s.slipAngle);
      if (t >= tap) {
        const k = Math.max(0, seen.length - 1 - lag);
        const ahead = seen[k] + (0.2 * (seen[k] - seen[Math.max(0, k - trendN)])) / (trendN * DT);
        want = ahead > 0.45 ? 0 : ahead < 0.3 ? 1 : want;
        if (want !== key && t - since >= 0.06) [key, since] = [want, t];
      }
      thr = rampThrottle(thr, key, s.slipAngle, DT, speedOf(s));
      s = stepKart(s, input({ steer: 1, throttle: thr, handbrake: t < tap }), DT);
      cur = t > tap && -s.slipAngle > 0.175 && -s.slipAngle < 0.61 ? cur + DT : 0; // 10–35°
      best = Math.max(best, cur);
      spun ||= Math.abs(s.slipAngle) > 1.2 || s.forwardSpeed < 0;
    }
    return { best, spun, end: s.forwardSpeed };
  }

  it('a keyboard driver with human reaction time can hold a drift by feathering the throttle', () => {
    for (const tap of [0.2, 0.25, 0.3]) {
      for (const v of [11, 12, 13, 14]) {
        const r = keyboardDrift(v, tap);
        expect(r.spun, `tap ${tap} s at ${v} m/s`).toBe(false);
        expect(r.best, `tap ${tap} s at ${v} m/s`).toBeGreaterThan(2);
        expect(r.end).toBeGreaterThan(4);
      }
    }
    expect(keyboardDrift(12, 0.12).best).toBeLessThan(0.6); // a brush of the button is not a drift
  });

  it('throttle sets the drift angle, and flooring it from a big slide spins the kart', () => {
    const peak = (start, throttle) => {
      let worst = 0;
      run(start, input({ throttle, steer: 1 }), 2, (s) => (worst = Math.max(worst, -s.slipAngle)));
      return worst;
    };
    expect(peak(stabbed(), 1)).toBeGreaterThan(peak(stabbed(), 0.3) + 0.2);
    const bigSlide = run(moving(12), (s, t) => input({ throttle: 1, steer: 1, handbrake: t < 0.3 }), 0.3);
    expect(peak(bigSlide, 1)).toBeGreaterThan(1.2);
  });
});
