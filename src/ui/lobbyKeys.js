// Keyboard for the open lobby card: Enter = the panel's main action, Esc = back / leave. Registered
// in the capture phase on window, so it runs before the game's Input (a window bubble listener) and
// stops the event there: typing a name must not steer the attract race, change the title's track
// (W / S) or start a single-player race (Enter). Typing itself is the browser's default action,
// which stopping propagation doesn't prevent.

import { primaryAction, escapeAction } from './lobbyView.js';
import { isCompleteCode } from './lobbyText.js';

export function lobbyKeys(lobby) {
  return (e) => {
    if (!lobby.visible) return;
    e.stopPropagation();
    if (e.repeat || e.isComposing) return; // a held Enter must not create room after room
    const target = e.target;
    if (e.key === 'Escape') {
      e.preventDefault();
      lobby.do(escapeAction(lobby.state.phase));
    } else if (e.key === 'Enter' && target?.tagName !== 'BUTTON') {
      // (a focused button is clicked by the browser itself)
      e.preventDefault();
      const r = lobby.r;
      const action = primaryAction(lobby.state.phase, {
        focus: target === r.name ? 'name' : target === r.codeInput ? 'code' : null,
        codeComplete: isCompleteCode(r.codeInput.value),
        isHost: lobby.view.isHost,
        canStart: lobby.view.canStart,
        canRetry: lobby.view.status.retry,
      });
      if (action) lobby.do(action);
    }
  };
}
