// Race-field helpers shared by the game (app/field.js) and the headless simulator (tools/simulate.js).

import { AI } from '../config/race.js';
import { clamp } from '../core/math.js';

// Pack pull: a rival `gap` metres behind the player (negative = ahead) gets this skill multiplier.
export const catchUpPace = (gap) => 1 + clamp(gap / AI.catchUpGap, -1, 1) * AI.catchUp;

// Grid slots for the rivals, shuffled every race (Fisher–Yates with `random`), skipping the player's.
// A fixed order put the fastest rival on pole, and the pole-sitter nearly always won.
export function rivalSlots(count, playerSlot, random = Math.random) {
  const slots = Array.from({ length: count + 1 }, (_, s) => s).filter((s) => s !== playerSlot);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}
