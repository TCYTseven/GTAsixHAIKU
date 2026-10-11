import { describe, expect, it } from 'vitest';
import { Vec3 } from '../../src/math/vec3';

function expectVec(v: Vec3, x: number, y: number, z: number): void {
  expect(v.x).toBeCloseTo(x, 12);
  expect(v.y).toBeCloseTo(y, 12);
  expect(v.z).toBeCloseTo(z, 12);
}

describe('Vec3', () => {
  it('chains arithmetic in place', () => {
    const v = new Vec3(1, 2, 3)
      .add(new Vec3(1, 1, 1))
      .scale(2)
      .sub(new Vec3(0, 0, 4));
    expectVec(v, 4, 6, 4);
  });

  it('adds a scaled vector', () => {
    expectVec(new Vec3(1, 0, 0).addScaled(new Vec3(0, 2, 0), 0.5), 1, 1, 0);
  });

  it('computes a right-handed cross product', () => {
    expectVec(new Vec3().setCross(new Vec3(1, 0, 0), new Vec3(0, 1, 0)), 0, 0, 1);
  });

  it('normalizes to unit length and leaves zero vectors alone', () => {
    expect(new Vec3(3, 0, 4).normalize().length()).toBeCloseTo(1, 12);
    expect(new Vec3().normalize().length()).toBe(0);
  });

  it('measures the distance between two points', () => {
    expect(new Vec3(0, 0, 0).distanceTo(new Vec3(3, 4, 0))).toBe(5);
  });
});
