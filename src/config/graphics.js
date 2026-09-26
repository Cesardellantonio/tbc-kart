// Graphics quality presets. The tier is chosen once per page load: ?gfx=<tier> in the URL, else the
// player's saved choice (title card), else a guess — phones and tablets get 'medium', others 'high'.
// Ultra adds ground-truth ambient occlusion (roughly half the frame rate of high), for strong GPUs.

export const TIERS = {
  low: { label: 'LOW', pixelRatio: 1, msaa: 0, shadowMap: 1024, gtao: false, envSize: 128, dof: false, haze: false, detail: false, barrierShadows: false },
  medium: { label: 'MEDIUM', pixelRatio: 1.5, msaa: 2, shadowMap: 2048, gtao: false, envSize: 128, dof: false, haze: false, detail: true, barrierShadows: false },
  high: { label: 'HIGH', pixelRatio: 1.5, msaa: 4, shadowMap: 4096, gtao: false, envSize: 256, dof: true, haze: true, detail: true, barrierShadows: true },
  ultra: { label: 'ULTRA', pixelRatio: 2, msaa: 4, shadowMap: 4096, gtao: true, envSize: 512, dof: true, haze: true, detail: true, barrierShadows: true },
};
export const GFX_KEY = 'tbc-kart.gfx';

function pick() {
  if (typeof window === 'undefined') return 'high'; // tests / tools (Node)
  const url = new URLSearchParams(window.location.search).get('gfx');
  if (TIERS[url]) return url;
  let saved = null;
  try {
    saved = localStorage.getItem(GFX_KEY);
  } catch {
    // storage unavailable
  }
  if (TIERS[saved]) return saved;
  return window.matchMedia?.('(pointer: coarse)').matches ? 'medium' : 'high';
}

export const QUALITY_ID = pick();
export const QUALITY = TIERS[QUALITY_ID];
