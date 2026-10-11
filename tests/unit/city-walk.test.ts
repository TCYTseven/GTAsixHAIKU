import { describe, expect, it } from 'vitest';
import type { ControlState } from '../../src/core/controls';
import { createRng } from '../../src/core/rng';
import { loadGameConfig } from '../../src/data/load-config';
import { World } from '../../src/game/world';
import { Aabb } from '../../src/math/aabb';

const DT = 1 / 60;

function controls(overrides: Partial<ControlState> = {}): ControlState {
  return {
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
    ...overrides,
  };
}

function playerRegion(world: World): Aabb {
  const { x, y, z } = world.player.position;
  const hw = world.player.halfWidth;
  return new Aabb(x - hw, y, z - hw, x + hw, y + world.player.height, z + hw);
}

function walk(world: World, state: ControlState, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += DT) {
    world.step(DT, state);
  }
}

/**
 * Finds a building whose near wall can be reached in a straight line from the sidewalk without
 * passing another collider. Returns where to stand and where the wall is.
 */
function clearApproach(world: World): { x: number; z: number; wallZ: number } {
  const hw = world.player.halfWidth;
  const padTop = world.layout.sidewalkHeight;
  for (const block of world.layout.blocks) {
    for (const building of block.buildings) {
      const f = building.footprint;
      const x = (f.minX + f.maxX) / 2;
      const startZ = f.minZ - 3;
      const sweep = new Aabb(
        x - hw,
        padTop,
        startZ - hw,
        x + hw,
        padTop + world.player.height,
        f.minZ,
      );
      if (world.collision.query(sweep).length === 0) {
        return { x, z: startZ, wallZ: f.minZ };
      }
    }
  }
  throw new Error('The city has no building with a clear approach.');
}

describe('walking the generated city', () => {
  const config = loadGameConfig();

  it('starts on the open road at the origin and stays put without input', () => {
    const world = new World(config);
    walk(world, controls(), 1);
    expect(world.player.position.x).toBeCloseTo(0, 6);
    expect(world.player.position.z).toBeCloseTo(0, 6);
    expect(world.player.position.y).toBeCloseTo(0, 6);
    expect(world.player.grounded).toBe(true);
  });

  it('stops at the wall of a building instead of walking through it', () => {
    const world = new World(config);
    const approach = clearApproach(world);

    // Stand on the sidewalk in front of the building, then walk straight at its near wall.
    world.player.position.set(approach.x, config.city.sidewalkHeight, approach.z);
    world.player.previousPosition.copy(world.player.position);
    world.player.grounded = true;
    walk(world, controls({ moveForward: 1 }), 3);

    expect(world.player.position.z).toBeCloseTo(approach.wallZ - config.player.halfWidth, 2);
    expect(world.collision.overlapsAny(playerRegion(world))).toBe(false);
  });

  it('climbs from the road onto a sidewalk', () => {
    const world = new World(config);
    const pad = world.layout.blocks[0].pad;
    // Stand on the road just before the pad's west edge, then walk east onto the sidewalk.
    // Two metres short of the pad, which is still on the asphalt.
    const roadX = pad.minX - 2;
    const z = (pad.minZ + pad.maxZ) / 2;
    world.player.position.set(roadX, 0, z);
    world.player.previousPosition.copy(world.player.position);
    world.player.grounded = true;

    walk(world, controls({ moveRight: -1 }), 1.5);

    expect(world.player.position.x).toBeGreaterThan(pad.minX);
    expect(world.player.position.y).toBeCloseTo(config.city.sidewalkHeight, 3);
  });

  it('never ends a step inside a collision box during a long random walk', () => {
    const world = new World(config);
    const rng = createRng(7);
    const bounds = world.layout.bounds;

    for (let step = 0; step < 30 * 60; step++) {
      const state = controls({
        moveForward: rng.pick([-1, 0, 1]),
        moveRight: rng.pick([-1, 0, 1]),
        sprint: rng.chance(0.3),
        jump: rng.chance(0.02),
        cameraYaw: rng.range(-Math.PI, Math.PI),
      });
      world.step(DT, state);

      const p = world.player.position;
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(p.x).toBeLessThanOrEqual(bounds.maxX);
      expect(world.collision.overlapsAny(playerRegion(world))).toBe(false);
    }
  });
});
