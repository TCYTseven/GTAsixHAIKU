import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';

describe('Input', () => {
  it('reports a key as held until it is released', () => {
    const input = new Input();
    input.onKeyDown('KeyW');
    expect(input.isHeld('KeyW')).toBe(true);
    input.onKeyUp('KeyW');
    expect(input.isHeld('KeyW')).toBe(false);
  });

  it('latches a quick tap so it is seen once, even after release', () => {
    const input = new Input();
    input.onKeyDown('Space');
    input.onKeyUp('Space');
    expect(input.consumePress('Space')).toBe(true);
    expect(input.consumePress('Space')).toBe(false);
  });

  it('does not latch auto-repeat keydown events', () => {
    const input = new Input();
    input.onKeyDown('KeyF');
    expect(input.consumePress('KeyF')).toBe(true);
    input.onKeyDown('KeyF', true);
    expect(input.consumePress('KeyF')).toBe(false);
  });

  it('tracks mouse buttons as held and latches their presses', () => {
    const input = new Input();
    input.onMouseDown(0);
    expect(input.isButtonHeld(0)).toBe(true);
    expect(input.consumeButtonPress(0)).toBe(true);
    expect(input.consumeButtonPress(0)).toBe(false);
    input.onMouseUp(0);
    expect(input.isButtonHeld(0)).toBe(false);
  });

  it('accumulates mouse movement until it is taken', () => {
    const input = new Input();
    input.onMouseMove(3, -2);
    input.onMouseMove(1, 4);
    expect(input.takeMouseDelta()).toEqual({ x: 4, y: 2 });
    expect(input.takeMouseDelta()).toEqual({ x: 0, y: 0 });
  });
});
