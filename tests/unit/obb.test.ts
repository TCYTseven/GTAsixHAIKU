import { describe, expect, it } from 'vitest';
import { Aabb } from '../../src/math/aabb';
import {
  obbBounds,
  separateObbFromAabb,
  separateObbFromObb,
  type Obb,
  type Separation,
} from '../../src/math/obb';

function blankSeparation(): Separation {
  return { nx: 0, nz: 0, depth: 0 };
}

describe('oriented box separation', () => {
  it('reports no contact for a box that is clear of the wall', () => {
    const car: Obb = { x: 0, z: 0, halfWidth: 1, halfLength: 2, yaw: 0 };
    expect(separateObbFromAabb(car, new Aabb(5, 0, -1, 6, 2, 1), blankSeparation())).toBe(false);
  });

  it('pushes a box out of a wall along the axis of least overlap', () => {
    const car: Obb = { x: 0, z: 0, halfWidth: 1, halfLength: 2, yaw: 0 };
    const separation = blankSeparation();
    // The wall starts 0.5 m inside the car's right side, and it is long enough that Z is no option.
    expect(separateObbFromAabb(car, new Aabb(0.5, 0, -10, 5, 2, 10), separation)).toBe(true);
    expect(separation.nx).toBeCloseTo(-1, 12);
    expect(separation.nz).toBeCloseTo(0, 12);
    expect(separation.depth).toBeCloseTo(0.5, 9);
  });

  it('tests the box in its rotated frame', () => {
    // Turned 90 degrees, the car's length runs along X, so it reaches x = 2 instead of z = 2.
    const car: Obb = { x: 0, z: 0, halfWidth: 1, halfLength: 2, yaw: Math.PI / 2 };
    expect(separateObbFromAabb(car, new Aabb(1.5, 0, -10, 5, 2, 10), blankSeparation())).toBe(true);
    expect(separateObbFromAabb(car, new Aabb(-10, 0, 1.5, 10, 2, 5), blankSeparation())).toBe(
      false,
    );
  });

  it('separates two boxes with the minimum translation', () => {
    const a: Obb = { x: 0, z: 0, halfWidth: 1, halfLength: 2, yaw: 0 };
    const b: Obb = { x: 1.5, z: 0, halfWidth: 1, halfLength: 2, yaw: 0 };
    const separation = blankSeparation();
    expect(separateObbFromObb(a, b, separation)).toBe(true);
    expect(separation.nx).toBeCloseTo(-1, 12);
    expect(separation.depth).toBeCloseTo(0.5, 9);
  });

  it('reports no contact for rotated boxes that are apart', () => {
    const a: Obb = { x: 0, z: 0, halfWidth: 1, halfLength: 2, yaw: 0.3 };
    const b: Obb = { x: 4, z: 4, halfWidth: 1, halfLength: 2, yaw: 0.9 };
    expect(separateObbFromObb(a, b, blankSeparation())).toBe(false);
  });

  it('bounds a rotated box by its projected extent', () => {
    const flat: Obb = { x: 0, z: 0, halfWidth: 1, halfLength: 3, yaw: 0 };
    const turned: Obb = { ...flat, yaw: Math.PI / 2 };
    expect(obbBounds(flat)).toEqual({ minX: -1, minZ: -3, maxX: 1, maxZ: 3 });
    const bounds = obbBounds(turned);
    expect(bounds.maxX).toBeCloseTo(3, 12);
    expect(bounds.maxZ).toBeCloseTo(1, 12);
  });
});
