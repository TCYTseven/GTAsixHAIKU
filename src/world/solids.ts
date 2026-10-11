import type { Aabb } from '../math/aabb';
import type { CollisionWorld } from './collision-world';

/** Anything that can answer box queries. Physics only needs these two methods. */
export interface SolidQuery {
  query(region: Aabb, out?: Aabb[]): Aabb[];
  overlapsAny(region: Aabb): boolean;
}

/**
 * Static world colliders plus a short list of moving boxes, such as parked and driven vehicles.
 * The moving list is replaced each step, so a body on foot can be blocked by a car.
 */
export class SolidSet implements SolidQuery {
  private readonly moving: Aabb[] = [];

  constructor(readonly statics: CollisionWorld) {}

  setMoving(boxes: readonly Aabb[]): void {
    this.moving.length = 0;
    this.moving.push(...boxes);
  }

  query(region: Aabb, out: Aabb[] = []): Aabb[] {
    this.statics.query(region, out);
    for (const box of this.moving) {
      if (box.overlaps(region)) {
        out.push(box);
      }
    }
    return out;
  }

  overlapsAny(region: Aabb): boolean {
    if (this.statics.overlapsAny(region)) {
      return true;
    }
    return this.moving.some((box) => box.overlaps(region));
  }
}
