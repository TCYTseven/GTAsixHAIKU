import type { Aabb } from './aabb';
import type { Vec3 } from './vec3';

const PARALLEL_EPSILON = 1e-12;

/**
 * Distance along a ray to the point where it first enters `box`, or null when the ray misses the
 * box within [0, maxDistance]. `direction` must have unit length.
 */
export function intersectAabbRay(
  origin: Vec3,
  direction: Vec3,
  box: Aabb,
  maxDistance: number,
): number | null {
  let tNear = 0;
  let tFar = maxDistance;

  const axes: readonly [number, number, number][] = [
    [origin.x, direction.x, 0],
    [origin.y, direction.y, 1],
    [origin.z, direction.z, 2],
  ];
  for (const [start, dir, axis] of axes) {
    const lo = axis === 0 ? box.min.x : axis === 1 ? box.min.y : box.min.z;
    const hi = axis === 0 ? box.max.x : axis === 1 ? box.max.y : box.max.z;
    if (Math.abs(dir) < PARALLEL_EPSILON) {
      if (start < lo || start > hi) {
        return null;
      }
      continue;
    }
    let t1 = (lo - start) / dir;
    let t2 = (hi - start) / dir;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
    }
    tNear = Math.max(tNear, t1);
    tFar = Math.min(tFar, t2);
    if (tNear > tFar) {
      return null;
    }
  }
  return tNear;
}
