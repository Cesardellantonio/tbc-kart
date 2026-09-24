// Entry point: fonts and HUD styles, then the game. Dev builds expose handles for debugging.

import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/chakra-petch/latin-700.css';
import '@fontsource/chakra-petch/latin-700-italic.css';
import './ui/hud.css';
import { Game } from './app/Game.js';

const game = new Game();
game.start();

if (import.meta.env.DEV) {
  const topdown = () => import('./debug/topdown.js');
  window.__game = game;
  window.__debug = {
    game,
    topdown: async () => (await topdown()).enter(game),
    chase: async () => (await topdown()).exit(game),
    advance: (seconds) => game.advance(seconds),
    teleport: (x, z, yaw = game.kart.state.yaw) => game.kart.place(x, z, yaw),
    togglePause: () => game.session.togglePause(),
  };
}
