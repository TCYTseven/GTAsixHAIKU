import { describe, expect, it } from 'vitest';
import { FIXED_STEP_SECONDS, GameLoop, MAX_FRAME_SECONDS } from '../../src/core/game-loop';

function createRecorder(stepSeconds: number) {
  const steps: number[] = [];
  const alphas: number[] = [];
  const loop = new GameLoop(
    {
      fixedUpdate: (dt) => steps.push(dt),
      render: (alpha) => alphas.push(alpha),
    },
    stepSeconds,
  );
  return { loop, steps, alphas };
}

describe('GameLoop', () => {
  it('uses a 60 Hz fixed step by default', () => {
    expect(FIXED_STEP_SECONDS).toBeCloseTo(1 / 60, 12);
    expect(MAX_FRAME_SECONDS).toBe(0.25);
  });

  it('runs whole fixed steps and reports the leftover fraction as alpha', () => {
    const { loop, steps, alphas } = createRecorder(0.5);

    loop.frame(0);
    loop.frame(0.25);
    expect(steps).toHaveLength(0);
    expect(alphas.at(-1)).toBe(0.5);

    loop.frame(0.5);
    expect(steps).toEqual([0.5]);
    expect(alphas.at(-1)).toBe(0);

    loop.frame(0.75);
    expect(steps).toHaveLength(1);
    expect(alphas.at(-1)).toBe(0.5);
  });

  it('keeps the simulation at about 60 steps per second when rendering at 120 Hz', () => {
    const { loop, steps } = createRecorder(FIXED_STEP_SECONDS);

    for (let frame = 0; frame <= 120; frame++) {
      loop.frame(frame / 120);
    }

    // Floating point accumulation may land one step short or long of exactly 60.
    expect(steps.length).toBeGreaterThanOrEqual(59);
    expect(steps.length).toBeLessThanOrEqual(61);
  });

  it('clamps a long stall so it cannot trigger a spiral of catch-up steps', () => {
    const { loop, steps } = createRecorder(0.125);

    loop.frame(0);
    loop.frame(10);

    expect(steps).toHaveLength(2);
  });

  it('ignores time running backwards', () => {
    const { loop, steps } = createRecorder(0.5);

    loop.frame(5);
    loop.frame(4);

    expect(steps).toHaveLength(0);
  });
});
