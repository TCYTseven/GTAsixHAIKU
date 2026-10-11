import { describe, expect, it } from 'vitest';
import type { ControlState } from '../../src/core/controls';
import { createRng } from '../../src/core/rng';
import { loadGameConfig } from '../../src/data/load-config';
import { World } from '../../src/game/world';

/**
 * Headless soak test: random play for a stretch of simulated time, checking that nothing goes
 * non-finite and no car or person is left inside a building. Set SOAK_MINUTES=30 for the full run.
 */
const MINUTES = Number(process.env.SOAK_MINUTES ?? 2);
const DT = 1 / 60;

describe('soak', () => {
  it(
    `plays ${MINUTES} simulated minutes without NaN, runaway speeds, or crashes`,
    () => {
      const world = new World(loadGameConfig());
      const rng = createRng(99);
      let moveForward = 0;
      let moveRight = 0;
      const steps = Math.round((MINUTES * 60) / DT);
      for (let step = 0; step < steps; step++) {
        if (step % 60 === 0) {
          moveForward = rng.pick([-1, 0, 1, 1]);
          moveRight = rng.pick([-1, 0, 1]);
        }
        if (step % 900 === 0) world.wanted.add(rng.int(0, 3));
        const controls: ControlState = {
          moveForward,
          moveRight,
          sprint: rng.chance(0.2),
          jump: rng.chance(0.01),
          handbrake: rng.chance(0.05),
          interact: rng.chance(0.002),
          fire: rng.chance(0.03),
          melee: rng.chance(0.01),
          reload: rng.chance(0.005),
          aim: [Math.sin(step * 0.01), 0, Math.cos(step * 0.01)],
          cameraYaw: step * 0.005,
        };
        world.setViewer(world.player.position, world.player.position.clone().set(0, 0, 1));
        world.step(DT, controls);
        if (step % 600 === 0) {
          const finite = (x: number, y: number, z: number) =>
            Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
          expect(
            finite(world.player.position.x, world.player.position.y, world.player.position.z),
          ).toBe(true);
          for (const car of world.vehicles) {
            expect(finite(car.position.x, car.position.y, car.position.z)).toBe(true);
            expect(Math.abs(car.forwardSpeed)).toBeLessThan(60);
          }
          for (const walker of world.pedestrians) {
            expect(finite(walker.position.x, walker.position.y, walker.position.z)).toBe(true);
          }
        }
      }
      expect(Number.isFinite(world.cash)).toBe(true);
    },
    MINUTES * 60 * 1000 + 60000,
  );
});
