import { describe, expect, it } from 'vitest';
import { FpsCounter } from '../../src/core/fps-counter';

describe('FpsCounter', () => {
  it('holds the previous value until a full window has elapsed', () => {
    const counter = new FpsCounter(1);

    expect(counter.tick(0.25)).toBe(0);
    expect(counter.tick(0.25)).toBe(0);
    expect(counter.tick(0.25)).toBe(0);
  });

  it('reports frames divided by elapsed seconds once the window closes', () => {
    const counter = new FpsCounter(1);

    counter.tick(0.25);
    counter.tick(0.25);
    counter.tick(0.25);
    expect(counter.tick(0.25)).toBe(4);
    expect(counter.value).toBe(4);
  });
});
