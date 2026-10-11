import type { Mat4 } from '../math/mat4';

const PLANE_COUNT = 6;

/** The six planes of a view frustum. Each plane is stored as (nx, ny, nz, d) with unit normals. */
export class Frustum {
  private readonly planes = new Float32Array(PLANE_COUNT * 4);

  /** Extracts the planes from a combined view-projection matrix (Gribb and Hartmann). */
  setFromViewProjection(m: Mat4): void {
    this.setPlane(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
    this.setPlane(1, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
    this.setPlane(2, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
    this.setPlane(3, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
    this.setPlane(4, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
    this.setPlane(5, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
  }

  /** False only when the sphere lies entirely outside one of the planes. */
  intersectsSphere(x: number, y: number, z: number, radius: number): boolean {
    for (let i = 0; i < PLANE_COUNT * 4; i += 4) {
      const distance =
        this.planes[i] * x + this.planes[i + 1] * y + this.planes[i + 2] * z + this.planes[i + 3];
      if (distance < -radius) {
        return false;
      }
    }
    return true;
  }

  private setPlane(index: number, a: number, b: number, c: number, d: number): void {
    const length = Math.hypot(a, b, c) || 1;
    const o = index * 4;
    this.planes[o] = a / length;
    this.planes[o + 1] = b / length;
    this.planes[o + 2] = c / length;
    this.planes[o + 3] = d / length;
  }
}
