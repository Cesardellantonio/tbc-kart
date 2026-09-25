// Room codes: CODE_LENGTH characters from CODE_ALPHABET (config/lobby.js — the lobby card's code
// field accepts exactly these), and the PeerJS id a room's host registers under.

import { CODE_ALPHABET, CODE_LENGTH } from '../config/lobby.js';
import { PEER_PREFIX } from '../config/net.js';

const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

// A fresh random code. rand: () => [0, 1) (injectable for tests).
export function makeCode(rand = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++)
    code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return code;
}

export const isCode = (code) => typeof code === 'string' && CODE_RE.test(code);

export const peerIdFor = (code) => PEER_PREFIX + code;

// The room code inside a host's peer id, or null for any other id.
export function codeFromPeerId(id) {
  if (typeof id !== 'string' || !id.startsWith(PEER_PREFIX)) return null;
  const code = id.slice(PEER_PREFIX.length);
  return isCode(code) ? code : null;
}
