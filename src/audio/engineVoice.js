// WebAudio graph for one kart engine: a harmonic-rich exhaust tone + half-order sub, a chuffing
// noise layer, a soft-clip drive stage, a resonant low-pass, firing-pulse AM and a lumpy-idle wobble.

// Exhaust pulse spectrum (harmonic 1..16): strong low orders with a small bump around 3–5.
const HARMONICS = [1, 0.75, 0.9, 0.62, 0.55, 0.36, 0.3, 0.2, 0.18, 0.12, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03];

function softClip(n = 1024) {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) curve[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * 2.2) / Math.tanh(2.2);
  return curve;
}

export function buildEngineVoice(ctx, out, noiseBuffer) {
  const gain = (value) => new GainNode(ctx, { gain: value });
  const imag = new Float32Array(HARMONICS.length + 1);
  imag.set(HARMONICS, 1);
  const main = new OscillatorNode(ctx, { periodicWave: ctx.createPeriodicWave(new Float32Array(imag.length), imag) });
  const sub = new OscillatorNode(ctx, { type: 'sine' });
  const noise = new AudioBufferSourceNode(ctx, { buffer: noiseBuffer, loop: true });
  const noiseBand = new BiquadFilterNode(ctx, { type: 'bandpass', Q: 0.9, frequency: 400 });
  const noiseAmp = gain(0.2);
  const drive = gain(1);
  const shaper = new WaveShaperNode(ctx, { curve: softClip(), oversample: '2x' });
  const filter = new BiquadFilterNode(ctx, { type: 'lowpass', Q: 2.6, frequency: 600 });
  const amp = gain(0);
  const pulse = new OscillatorNode(ctx, { type: 'sine' }); // firing-rate amplitude pulse
  const pulseDepth = gain(0);
  const noisePulse = gain(0.15);
  const wobble = new OscillatorNode(ctx, { type: 'sine', frequency: 4.2 }); // uneven idle
  const wobbleDepth = gain(0);

  main.connect(gain(0.5)).connect(drive);
  sub.connect(gain(0.55)).connect(drive);
  noise.connect(noiseBand).connect(noiseAmp).connect(drive);
  drive.connect(shaper).connect(filter).connect(amp).connect(out);
  pulse.connect(pulseDepth).connect(amp.gain);
  pulse.connect(noisePulse).connect(noiseAmp.gain);
  wobble.connect(wobbleDepth);
  wobbleDepth.connect(main.detune);
  wobbleDepth.connect(sub.detune);
  for (const src of [main, sub, pulse, wobble]) src.start();
  noise.start(0, Math.random() * noiseBuffer.duration);
  return { ctx, main, sub, noiseBand, noiseAmp, drive, filter, amp, pulse, pulseDepth, wobble, wobbleDepth };
}
