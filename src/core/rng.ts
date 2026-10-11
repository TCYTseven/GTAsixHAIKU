export interface Rng {
  /** Uniform number in [0, 1). */
  next(): number;
  /** Uniform number in [min, max). */
  range(min: number, max: number): number;
  /** Uniform integer in [min, max], both ends included. */
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

/** Seeded mulberry32 generator. The same seed always gives the same sequence. */
export function createRng(seed: number): Rng {
  let state = seed | 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) {
        throw new Error('pick() needs at least one item.');
      }
      return items[Math.floor(next() * items.length)];
    },
  };
}
