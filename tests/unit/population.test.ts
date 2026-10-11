import { describe, expect, it } from 'vitest';
import type { ControlState } from '../../src/core/controls';
import { loadGameConfig } from '../../src/data/load-config';
import { World } from '../../src/game/world';
import { Vec3 } from '../../src/math/vec3';

const config = loadGameConfig();
const IDLE: ControlState = {
  moveForward: 0,
  moveRight: 0,
  sprint: false,
  jump: false,
  handbrake: false,
  interact: false,
  fire: false,
  melee: false,
  reload: false,
  aim: [0, 0, 1],
  cameraYaw: 0,
};

describe('population around the player', () => {
  it('fills toward the configured crowd and traffic, out of view and beyond the spawn ring', () => {
    const world = new World(config);
    world.setViewer(new Vec3(0, 1.6, 0), new Vec3(0, 0, 1));
    for (let step = 0; step < 60 * 3; step++) {
      world.step(1 / 60, IDLE);
    }
    expect(world.pedestrians.length).toBeGreaterThan(config.population.pedestrians * 0.5);
    expect(world.vehicles.filter((v) => v.route).length).toBeGreaterThan(0);
    for (const walker of world.pedestrians) {
      const distance = Math.hypot(walker.position.x, walker.position.z);
      // Walkers drift for a few seconds after spawning, so allow for the ground they cover.
      expect(distance).toBeGreaterThanOrEqual(config.population.spawnMinDistance - 10);
      expect(distance).toBeLessThanOrEqual(config.population.despawnDistance);
    }
  });
});
