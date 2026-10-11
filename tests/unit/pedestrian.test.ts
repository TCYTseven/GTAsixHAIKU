import { describe, expect, it } from 'vitest';
import { perimeterPoint, Pedestrian, stepPedestrian } from '../../src/entities/pedestrian';
import { Vec3 } from '../../src/math/vec3';
import { CollisionWorld } from '../../src/world/collision-world';

const WALKWAY = { minX: 0, minZ: 0, maxX: 40, maxZ: 40 };
const NO_WALLS = new CollisionWorld([]);

describe('pedestrians', () => {
  it('walks the perimeter of its walkway and stays on it', () => {
    const walker = new Pedestrian(WALKWAY, 0, 1.4, 0);
    for (let step = 0; step < 60 * 120; step++) {
      stepPedestrian(walker, 1 / 60, NO_WALLS);
      const onEdge =
        walker.position.x === WALKWAY.minX ||
        walker.position.x === WALKWAY.maxX ||
        walker.position.z === WALKWAY.minZ ||
        walker.position.z === WALKWAY.maxZ ||
        Math.abs(walker.position.x - WALKWAY.minX) < 1e-6 ||
        Math.abs(walker.position.z - WALKWAY.maxZ) < 1e-6 ||
        Math.abs(walker.position.x - WALKWAY.maxX) < 1e-6 ||
        Math.abs(walker.position.z - WALKWAY.minZ) < 1e-6;
      expect(onEdge).toBe(true);
    }
  });

  it('maps perimeter distances to corners and midpoints', () => {
    const out = new Vec3();
    perimeterPoint(WALKWAY, 40, out);
    expect([out.x, out.z]).toEqual([40, 0]);
    perimeterPoint(WALKWAY, 60, out);
    expect([out.x, out.z]).toEqual([40, 20]);
    perimeterPoint(WALKWAY, 120, out);
    expect([out.x, out.z]).toEqual([0, 40]);
  });

  it('runs away from a threat for a few seconds, then resumes walking', () => {
    const walker = new Pedestrian(WALKWAY, 0, 1.4, 0);
    walker.position.set(20, 0, 20);
    walker.startFleeing(18, 20);
    const start = walker.position.clone();
    stepPedestrian(walker, 0.5, NO_WALLS);
    expect(walker.position.x).toBeGreaterThan(start.x);
    expect(walker.fleeing).toBe(true);
    stepPedestrian(walker, 10, NO_WALLS);
    expect(walker.fleeing).toBe(false);
  });
});
