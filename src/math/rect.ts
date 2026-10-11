/** Axis-aligned rectangle on the ground plane (x and z). Used for roads, blocks, and footprints. */
export interface Rect {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}

export function insetRect(rect: Rect, amount: number): Rect {
  return {
    minX: rect.minX + amount,
    minZ: rect.minZ + amount,
    maxX: rect.maxX - amount,
    maxZ: rect.maxZ - amount,
  };
}

/** True when the rectangles share area. Rectangles that only touch do not overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

export function rectContainsPoint(rect: Rect, x: number, z: number): boolean {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minZ >= outer.minZ &&
    inner.maxZ <= outer.maxZ
  );
}
