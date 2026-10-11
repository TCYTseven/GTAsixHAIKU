import { Vec3 } from './vec3';

/** Axis-aligned box in world space. `min` and `max` are the corners. */
export class Aabb {
  readonly min: Vec3;
  readonly max: Vec3;

  constructor(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
    this.min = new Vec3(minX, minY, minZ);
    this.max = new Vec3(maxX, maxY, maxZ);
  }

  /** True when the boxes share volume. Boxes that only touch do not overlap. */
  overlaps(other: Aabb): boolean {
    return (
      this.min.x < other.max.x &&
      this.max.x > other.min.x &&
      this.min.y < other.max.y &&
      this.max.y > other.min.y &&
      this.min.z < other.max.z &&
      this.max.z > other.min.z
    );
  }

  containsPoint(p: Vec3): boolean {
    return (
      p.x >= this.min.x &&
      p.x <= this.max.x &&
      p.y >= this.min.y &&
      p.y <= this.max.y &&
      p.z >= this.min.z &&
      p.z <= this.max.z
    );
  }

  center(out: Vec3): Vec3 {
    return out.set(
      (this.min.x + this.max.x) / 2,
      (this.min.y + this.max.y) / 2,
      (this.min.z + this.max.z) / 2,
    );
  }

  /** Radius of the sphere around the center that encloses the whole box. */
  boundingRadius(): number {
    const dx = (this.max.x - this.min.x) / 2;
    const dy = (this.max.y - this.min.y) / 2;
    const dz = (this.max.z - this.min.z) / 2;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
