/** A read-only triple, used for colors and directions in configuration. */
export type Triple = readonly [number, number, number];

/**
 * Mutable 3D vector. Mutators return `this` so calls chain, and hot loops can reuse scratch
 * instances instead of allocating.
 */
export class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vec3): this {
    return this.set(v.x, v.y, v.z);
  }

  toTuple(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v: Vec3): this {
    return this.set(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vec3): this {
    return this.set(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): this {
    return this.set(this.x * s, this.y * s, this.z * s);
  }

  /** this += v * s */
  addScaled(v: Vec3, s: number): this {
    return this.set(this.x + v.x * s, this.y + v.y * s, this.z + v.z * s);
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /** Sets this to a cross b. */
  setCross(a: Vec3, b: Vec3): this {
    return this.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  }

  lengthSquared(): number {
    return this.dot(this);
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  /** Scales to unit length. Zero vectors are left unchanged. */
  normalize(): this {
    const len = this.length();
    return len > 1e-12 ? this.scale(1 / len) : this;
  }

  distanceTo(v: Vec3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
