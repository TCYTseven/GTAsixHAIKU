import type { Aabb } from './aabb';

/**
 * Box lying flat on the ground: a rectangle in XZ, rotated by `yaw`. `halfWidth` runs along the
 * box's right axis and `halfLength` along its forward axis (yaw 0 faces +Z).
 */
export interface Obb {
  readonly x: number;
  readonly z: number;
  readonly halfWidth: number;
  readonly halfLength: number;
  readonly yaw: number;
}

/** Push that separates two shapes: a unit direction and how far to move along it. */
export interface Separation {
  nx: number;
  nz: number;
  depth: number;
}

/** Axis-aligned XZ bounds of a rotated box. */
export function obbBounds(box: Obb): { minX: number; minZ: number; maxX: number; maxZ: number } {
  const sin = Math.abs(Math.sin(box.yaw));
  const cos = Math.abs(Math.cos(box.yaw));
  // A rotated rectangle's extent along an axis is its projected half sizes.
  const ex = box.halfWidth * cos + box.halfLength * sin;
  const ez = box.halfWidth * sin + box.halfLength * cos;
  return { minX: box.x - ex, minZ: box.z - ez, maxX: box.x + ex, maxZ: box.z + ez };
}

/**
 * Separating-axis test between an oriented box and an axis-aligned box in XZ. Returns the push
 * that moves `box` out of `wall` along the axis of least overlap, or null when they are apart.
 */
export function separateObbFromAabb(box: Obb, wall: Aabb, out: Separation): boolean {
  const forwardX = Math.sin(box.yaw);
  const forwardZ = Math.cos(box.yaw);
  const rightX = -forwardZ;
  const rightZ = forwardX;
  const wallCx = (wall.min.x + wall.max.x) / 2;
  const wallCz = (wall.min.z + wall.max.z) / 2;
  const wallHx = (wall.max.x - wall.min.x) / 2;
  const wallHz = (wall.max.z - wall.min.z) / 2;

  let bestOverlap = Infinity;
  let bestNx = 0;
  let bestNz = 0;

  // Candidate axes: the world X and Z axes (the wall's faces), then the box's own two axes.
  const axes: readonly [number, number][] = [
    [1, 0],
    [0, 1],
    [forwardX, forwardZ],
    [rightX, rightZ],
  ];
  for (const [ax, az] of axes) {
    const boxRadius =
      box.halfWidth * Math.abs(rightX * ax + rightZ * az) +
      box.halfLength * Math.abs(forwardX * ax + forwardZ * az);
    const wallRadius = wallHx * Math.abs(ax) + wallHz * Math.abs(az);
    const delta = (box.x - wallCx) * ax + (box.z - wallCz) * az;
    const overlap = boxRadius + wallRadius - Math.abs(delta);
    if (overlap <= 0) {
      return false;
    }
    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      const sign = delta >= 0 ? 1 : -1;
      bestNx = ax * sign;
      bestNz = az * sign;
    }
  }

  out.nx = bestNx;
  out.nz = bestNz;
  out.depth = bestOverlap;
  return true;
}

/** Separating-axis test between two oriented boxes. Same contract as `separateObbFromAabb`. */
export function separateObbFromObb(box: Obb, other: Obb, out: Separation): boolean {
  const axes: [number, number][] = [];
  for (const shape of [box, other]) {
    const forwardX = Math.sin(shape.yaw);
    const forwardZ = Math.cos(shape.yaw);
    axes.push([forwardX, forwardZ], [-forwardZ, forwardX]);
  }

  let bestOverlap = Infinity;
  let bestNx = 0;
  let bestNz = 0;
  for (const [ax, az] of axes) {
    const radius = (shape: Obb): number => {
      const fx = Math.sin(shape.yaw);
      const fz = Math.cos(shape.yaw);
      return (
        shape.halfWidth * Math.abs(-fz * ax + fx * az) +
        shape.halfLength * Math.abs(fx * ax + fz * az)
      );
    };
    const delta = (box.x - other.x) * ax + (box.z - other.z) * az;
    const overlap = radius(box) + radius(other) - Math.abs(delta);
    if (overlap <= 0) {
      return false;
    }
    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      const sign = delta >= 0 ? 1 : -1;
      bestNx = ax * sign;
      bestNz = az * sign;
    }
  }

  out.nx = bestNx;
  out.nz = bestNz;
  out.depth = bestOverlap;
  return true;
}
