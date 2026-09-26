// On-screen touch buttons: held buttons follow where the fingers are now (ui/touchHits.js).

import { describe, it, expect } from 'vitest';
import { heldFrom } from '../src/ui/touchHits.js';

const rect = (name, left, top, size = 80) => ({ name, left, top, right: left + size, bottom: top + size });
const RECTS = [rect('left', 20, 280), rect('right', 120, 280), rect('brake', 620, 290, 70), rect('throttle', 720, 270, 96)];

describe('touch buttons', () => {
  it('holds the button under each finger, several at once', () => {
    expect([...heldFrom([[60, 320], [760, 310]], RECTS, 18)].sort()).toEqual(['left', 'throttle']);
  });

  it('moves the press with a finger that slides to the next button', () => {
    expect([...heldFrom([[160, 320]], RECTS, 18)]).toEqual(['right']);
  });

  it('keeps holding just off the edge (slop) and lets go further out', () => {
    expect(heldFrom([[20 - 10, 320]], RECTS, 18).has('left')).toBe(true);
    expect(heldFrom([[400, 100]], RECTS, 18).size).toBe(0);
  });

  it('holds nothing once no finger is on the screen — whatever happened to the last one', () => {
    expect(heldFrom([], RECTS, 18).size).toBe(0);
  });

  it('gives a finger between two buttons to the nearer one, never both', () => {
    const held = heldFrom([[108, 320]], RECTS, 18); // 8 px past ◀, 12 px before ▶
    expect([...held]).toEqual(['left']);
  });
});
