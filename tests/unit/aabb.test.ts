import { describe, expect, it } from 'vitest';
import { Aabb } from '../../src/math/aabb';
import { Vec3 } from '../../src/math/vec3';

describe('Aabb', () => {
  it('reports overlap only when volumes intersect', () => {
    const box = new Aabb(0, 0, 0, 2, 2, 2);
    expect(box.overlaps(new Aabb(1, 1, 1, 3, 3, 3))).toBe(true);
    // Boxes that only touch at a face do not overlap.
    expect(box.overlaps(new Aabb(2, 0, 0, 4, 2, 2))).toBe(false);
    expect(box.overlaps(new Aabb(0, 3, 0, 2, 4, 2))).toBe(false);
  });

  it('contains points on or inside its faces', () => {
    const box = new Aabb(0, 0, 0, 2, 2, 2);
    expect(box.containsPoint(new Vec3(1, 1, 1))).toBe(true);
    expect(box.containsPoint(new Vec3(2, 2, 2))).toBe(true);
    expect(box.containsPoint(new Vec3(2.1, 1, 1))).toBe(false);
  });

  it('gives its center and a bounding radius', () => {
    const box = new Aabb(-1, 0, -2, 1, 4, 2);
    const center = box.center(new Vec3());
    expect(center.x).toBeCloseTo(0, 12);
    expect(center.y).toBeCloseTo(2, 12);
    expect(center.z).toBeCloseTo(0, 12);
    expect(box.boundingRadius()).toBeCloseTo(3, 12);
  });
});
