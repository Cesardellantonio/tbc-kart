// Tiny WebAudio builders shared by the continuous effect voices.

export const gainNode = (ctx, value = 0) => new GainNode(ctx, { gain: value });
export const filterNode = (ctx, type, frequency, Q = 1) => new BiquadFilterNode(ctx, { type, frequency, Q });

// Looping noise source, started at a random point so several loops don't correlate.
export function noiseLoop(ctx, buffer) {
  const src = new AudioBufferSourceNode(ctx, { buffer, loop: true });
  src.start(0, Math.random() * buffer.duration);
  return src;
}

// Oscillator (started) feeding `param` through a depth gain — an LFO. Returns { osc, depth }.
export function lfo(ctx, type, frequency, depth, param) {
  const osc = new OscillatorNode(ctx, { type, frequency });
  const d = gainNode(ctx, depth);
  osc.connect(d).connect(param);
  osc.start();
  return { osc, depth: d };
}

// Ramp an AudioParam toward `value` with time constant tau (s).
export const glide = (param, value, ctx, tau = 0.06) => param.setTargetAtTime(value, ctx.currentTime, tau);
