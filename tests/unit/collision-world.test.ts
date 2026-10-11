import { describe, expect, it } from 'vitest';
import { Aabb } from '../../src/math/aabb';
import { Vec3 } from '../../src/math/vec3';
import { CollisionWorld } from '../../src/world/collision-world';

describe('CollisionWorld', () => {
  // A wall that spans several 10 m grid cells, and a short pillar.
  const wall = new Aabb(20, 0, -40, 22, 10, 40);
  const pillar = new Aabb(-5, 0, -5, -3, 4, -3);
  const world = new CollisionWorld([wall, pillar]);

  it('returns only boxes that overlap the query region', () => {
    expect(world.query(new Aabb(19, 1, -1, 21, 2, 1))).toEqual([wall]);
    expect(world.query(new Aabb(0, 0, 0, 1, 1, 1))).toEqual([]);
  });

  it('lists a box once even when the query covers several of its cells', () => {
    expect(world.query(new Aabb(15, 0, -50, 30, 5, 50))).toEqual([wall]);
  });

  it('answers overlap checks without building a list', () => {
    expect(world.overlapsAny(new Aabb(21, 1, 0, 23, 2, 1))).toBe(true);
    expect(world.overlapsAny(new Aabb(30, 1, 0, 31, 2, 1))).toBe(false);
  });

  it('finds the first box along an axis-aligned ray', () => {
    expect(world.raycast(new Vec3(0, 1, 0), new Vec3(1, 0, 0), 100)).toBeCloseTo(20, 9);
  });

  it('finds the first box along a diagonal ray that crosses many cells', () => {
    const direction = new Vec3(1, 0, 0.5).normalize();
    // The ray crosses x = 20 at z = 10, which is inside the wall's span.
    expect(world.raycast(new Vec3(0, 1, 0), direction, 100)).toBeCloseTo(Math.hypot(20, 10), 9);
  });

  it('returns null when the ray stops short or passes outside the box', () => {
    expect(world.raycast(new Vec3(0, 1, 0), new Vec3(1, 0, 0), 15)).toBeNull();
    expect(world.raycast(new Vec3(0, 1, 60), new Vec3(1, 0, 0), 100)).toBeNull();
  });

  it('handles vertical rays', () => {
    expect(world.raycast(new Vec3(-4, 20, -4), new Vec3(0, -1, 0), 100)).toBeCloseTo(16, 9);
  });
});
