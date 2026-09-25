// Kart dynamics (single-track model): engine, rear-only brakes, reverse, grip, load transfer,
// power oversteer, lift-off rotation, handbrake slides, countersteer assist and numerical health.

import { describe, it, expect } from 'vitest';
import { stepKart } from '../src/physics/kartPhysics.js';
import { axleLoads } from '../src/physics/tyres.js';
import { frontAxle } from '../src/physics/axles.js';
import { TYRE_PEAK_SLIP } from '../src/config/physics.js';
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

  it('tops out around 55–60 km/h on the flat', () => {
    const s = run(rest(), input({ throttle: 1 }), 15);
    expect(s.forwardSpeed * 3.6).toBeGreaterThan(55);
    expect(s.forwardSpeed * 3.6).toBeLessThan(60);
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
    expect(t).toBeLessThan(2.3);
    expect(Math.hypot(s.x - start.x, s.z - start.z)).toBeLessThan(18);
    expect(Math.abs(s.yaw)).toBeLessThan(1e-9);
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

  it('a keyboard driver can hold a drift by feathering the throttle', () => {
    let c = input();
    let n = 0;
    let held = 0;
    let spun = false;
    const keys = (s) => {
      if (n++ % 8 === 0) {
        // 15 decisions a second on digital keys, reading the slide and where it is heading
        const angle = -s.slipAngle + 0.12 * (s.yawRate - s.latAccel / Math.max(3, speedOf(s)));
        c = input({ steer: angle > 0.45 ? 0 : 1, throttle: angle > 0.3 ? 0 : 1 });
      }
      return c;
    };
    const end = run(stabbed(), keys, 3, (s) => {
      if (-s.slipAngle > 0.15 && -s.slipAngle < 0.7) held += DT;
      spun ||= Math.abs(s.slipAngle) > 1.2;
    });
    expect(spun).toBe(false);
    expect(held).toBeGreaterThan(2.5);
    expect(end.forwardSpeed).toBeGreaterThan(5);
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
