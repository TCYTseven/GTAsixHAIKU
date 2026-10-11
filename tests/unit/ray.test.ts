import { describe, expect, it } from 'vitest';
import { Aabb } from '../../src/math/aabb';
import { intersectAabbRay } from '../../src/math/ray';
import { Vec3 } from '../../src/math/vec3';

describe('intersectAabbRay', () => {
  const box = new Aabb(10, 0, -1, 12, 5, 1);

  it('returns the distance to the face the ray enters', () => {
    expect(intersectAabbRay(new Vec3(0, 2, 0), new Vec3(1, 0, 0), box, 100)).toBeCloseTo(10, 12);
  });

  it('misses a ray that passes beside the box', () => {
    expect(intersectAabbRay(new Vec3(0, 2, 5), new Vec3(1, 0, 0), box, 100)).toBeNull();
  });

  it('misses when the box lies beyond maxDistance', () => {
    expect(intersectAabbRay(new Vec3(0, 2, 0), new Vec3(1, 0, 0), box, 9)).toBeNull();
  });

  it('misses a box that is behind the origin', () => {
    expect(intersectAabbRay(new Vec3(20, 2, 0), new Vec3(1, 0, 0), box, 100)).toBeNull();
  });

  it('reports zero when the origin is inside the box', () => {
    expect(intersectAabbRay(new Vec3(11, 2, 0), new Vec3(1, 0, 0), box, 100)).toBe(0);
  });

  it('handles diagonal rays that enter through the side', () => {
    const direction = new Vec3(1, 0, 0.05).normalize();
    // The ray reaches x = 10 at z = 0.5, which is inside the box's z range.
    expect(intersectAabbRay(new Vec3(0, 2, 0), direction, box, 100)).toBeCloseTo(
      10 * Math.sqrt(1.0025),
      9,
    );
  });
});
