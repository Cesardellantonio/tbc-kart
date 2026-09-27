// Which game this page is: 'classic' (TBC Kart, the indoor hall) or 'nova' (TBC Kart NOVA: anti-gravity
// karts on alien worlds, nova/index.html). The page says so on <html data-edition>; Node (tests and
// tools) runs the classic game. Both share the physics, the drivers and the race logic.

export const EDITION = (typeof document !== 'undefined' && document.documentElement.dataset.edition) || 'classic';
export const NOVA = EDITION === 'nova';
