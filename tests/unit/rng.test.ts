import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('keeps values in [0, 1) with a mean near one half', () => {
    const rng = createRng(7);
    const samples = 20000;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      sum += value;
    }
    expect(sum / samples).toBeCloseTo(0.5, 1);
  });

  it('draws integers with both ends included and picks from lists', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const value = rng.int(2, 4);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([2, 3, 4]);
    expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']));
  });
});
