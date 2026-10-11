import { mat4TransformDirection, mat4TransformPoint, type Mat4 } from '../math/mat4';
import { Vec3, type Triple } from '../math/vec3';
import type { Rgb } from './color';

/** Position (3), normal (3), and color (3) per vertex. */
export const FLOATS_PER_VERTEX = 9;

export interface MeshData {
  /** Interleaved position, normal, and color for each vertex. */
  readonly vertices: Float32Array;
  readonly indices: Uint32Array;
  /** Local-space bounds. */
  readonly min: Vec3;
  readonly max: Vec3;
}

const scratchPoint = new Vec3();
const scratchNormal = new Vec3();

/**
 * Accumulates triangles in local space. Every polygon gets its own vertices, so each face has a
 * flat normal. Faces wind counter-clockwise when seen from outside the solid.
 */
export class MeshBuilder {
  private readonly data: number[] = [];
  private readonly indices: number[] = [];
  private readonly min = new Vec3(Infinity, Infinity, Infinity);
  private readonly max = new Vec3(-Infinity, -Infinity, -Infinity);

  get vertexCount(): number {
    return this.data.length / FLOATS_PER_VERTEX;
  }

  /** Adds an axis-aligned box. An optional transform is applied to every vertex. */
  addBox(min: Vec3, max: Vec3, color: Rgb, transform?: Mat4): this {
    const x0 = min.x;
    const y0 = min.y;
    const z0 = min.z;
    const x1 = max.x;
    const y1 = max.y;
    const z1 = max.z;
    this.addPolygon(
      [point(x1, y0, z0), point(x1, y1, z0), point(x1, y1, z1), point(x1, y0, z1)],
      [1, 0, 0],
      color,
      transform,
    );
    this.addPolygon(
      [point(x0, y0, z1), point(x0, y1, z1), point(x0, y1, z0), point(x0, y0, z0)],
      [-1, 0, 0],
      color,
      transform,
    );
    this.addPolygon(
      [point(x0, y1, z0), point(x0, y1, z1), point(x1, y1, z1), point(x1, y1, z0)],
      [0, 1, 0],
      color,
      transform,
    );
    this.addPolygon(
      [point(x0, y0, z0), point(x1, y0, z0), point(x1, y0, z1), point(x0, y0, z1)],
      [0, -1, 0],
      color,
      transform,
    );
    this.addPolygon(
      [point(x0, y0, z1), point(x1, y0, z1), point(x1, y1, z1), point(x0, y1, z1)],
      [0, 0, 1],
      color,
      transform,
    );
    this.addPolygon(
      [point(x1, y0, z0), point(x0, y0, z0), point(x0, y1, z0), point(x1, y1, z0)],
      [0, 0, -1],
      color,
      transform,
    );
    return this;
  }

  /**
   * Adds a wedge that rises from y = min.y at z = min.z to y = max.y at z = max.z. Useful for
   * ramps and curbs you can drive or walk up.
   */
  addRamp(min: Vec3, max: Vec3, color: Rgb, transform?: Mat4): this {
    const x0 = min.x;
    const y0 = min.y;
    const z0 = min.z;
    const x1 = max.x;
    const y1 = max.y;
    const z1 = max.z;
    const a = point(x0, y0, z0);
    const b = point(x1, y0, z0);
    const c = point(x1, y0, z1);
    const d = point(x0, y0, z1);
    const e = point(x0, y1, z1);
    const f = point(x1, y1, z1);
    this.addPolygon([a, b, c, d], [0, -1, 0], color, transform);
    this.addPolygon([a, e, f, b], [0, z1 - z0, -(y1 - y0)], color, transform);
    this.addPolygon([d, c, f, e], [0, 0, 1], color, transform);
    this.addPolygon([a, d, e], [-1, 0, 0], color, transform);
    this.addPolygon([b, f, c], [1, 0, 0], color, transform);
    return this;
  }

  /** Adds an upright cylinder standing on `base`, with flat caps. */
  addCylinder(
    base: Vec3,
    radius: number,
    height: number,
    segments: number,
    color: Rgb,
    transform?: Mat4,
  ): this {
    const top = base.y + height;
    const centerBottom = point(base.x, base.y, base.z);
    const centerTop = point(base.x, top, base.z);
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const cos0 = Math.cos(a0);
      const sin0 = Math.sin(a0);
      const cos1 = Math.cos(a1);
      const sin1 = Math.sin(a1);
      const bottom0 = point(base.x + radius * cos0, base.y, base.z + radius * sin0);
      const top0 = point(base.x + radius * cos0, top, base.z + radius * sin0);
      const top1 = point(base.x + radius * cos1, top, base.z + radius * sin1);
      const bottom1 = point(base.x + radius * cos1, base.y, base.z + radius * sin1);
      const am = (a0 + a1) / 2;
      this.addPolygon(
        [bottom0, top0, top1, bottom1],
        [Math.cos(am), 0, Math.sin(am)],
        color,
        transform,
      );
      this.addPolygon([centerTop, top1, top0], [0, 1, 0], color, transform);
      this.addPolygon([centerBottom, bottom0, bottom1], [0, -1, 0], color, transform);
    }
    return this;
  }

  /** Adds a convex, counter-clockwise polygon (seen from outside) as a triangle fan. */
  addPolygon(points: readonly Vec3[], normal: Triple, color: Rgb, transform?: Mat4): this {
    const base = this.vertexCount;
    const n = scratchNormal.set(normal[0], normal[1], normal[2]);
    if (transform) {
      mat4TransformDirection(n, transform, n);
    }
    n.normalize();
    for (const p of points) {
      const q = transform ? mat4TransformPoint(scratchPoint, transform, p) : p;
      this.pushVertex(q, n, color);
    }
    for (let i = 1; i < points.length - 1; i++) {
      this.indices.push(base, base + i, base + i + 1);
    }
    return this;
  }

  build(): MeshData {
    const empty = this.data.length === 0;
    return {
      vertices: Float32Array.from(this.data),
      indices: Uint32Array.from(this.indices),
      min: empty ? new Vec3() : this.min.clone(),
      max: empty ? new Vec3() : this.max.clone(),
    };
  }

  private pushVertex(p: Vec3, n: Vec3, color: Rgb): void {
    this.data.push(p.x, p.y, p.z, n.x, n.y, n.z, color[0], color[1], color[2]);
    this.min.set(Math.min(this.min.x, p.x), Math.min(this.min.y, p.y), Math.min(this.min.z, p.z));
    this.max.set(Math.max(this.max.x, p.x), Math.max(this.max.y, p.y), Math.max(this.max.z, p.z));
  }
}

function point(x: number, y: number, z: number): Vec3 {
  return new Vec3(x, y, z);
}
