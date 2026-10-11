import { describe, expect, it } from 'vitest';
import {
  createMat4,
  mat4FromTransform,
  mat4Identity,
  mat4Invert,
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  mat4TransformDirection,
  mat4TransformPoint,
  type Mat4,
} from '../../src/math/mat4';
import { Vec3 } from '../../src/math/vec3';

function expectMatrixClose(actual: Mat4, expected: Mat4, digits = 5): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], digits);
  }
}

/** Depth of a view-space point after perspective divide (NDC z). */
function ndcDepth(projection: Mat4, z: number): number {
  const clipZ = projection[10] * z + projection[14];
  const clipW = projection[11] * z + projection[15];
  return clipZ / clipW;
}

describe('mat4', () => {
  it('multiplying by the identity leaves a matrix unchanged', () => {
    const m = mat4FromTransform(createMat4(), 1, 2, 3, 0.4, 2, 1, 0.5);
    expectMatrixClose(mat4Multiply(createMat4(), mat4Identity(createMat4()), m), m);
  });

  it('inverts a scaled, rotated, and translated transform', () => {
    const m = mat4FromTransform(createMat4(), 5, -2, 7, 1.1, 2, 3, 0.5);
    const inverse = mat4Invert(createMat4(), m);
    expectMatrixClose(mat4Multiply(createMat4(), m, inverse), mat4Identity(createMat4()));
  });

  it('inverts a view-projection matrix', () => {
    const view = mat4LookAt(createMat4(), new Vec3(3, 4, -9), new Vec3(0, 1, 0), new Vec3(0, 1, 0));
    const projection = mat4Perspective(createMat4(), 1.0, 16 / 9, 0.1, 500);
    const viewProjection = mat4Multiply(createMat4(), projection, view);
    const inverse = mat4Invert(createMat4(), viewProjection);
    expectMatrixClose(
      mat4Multiply(createMat4(), viewProjection, inverse),
      mat4Identity(createMat4()),
      4,
    );
  });

  it('returns the identity for a singular matrix', () => {
    expectMatrixClose(mat4Invert(createMat4(), new Float32Array(16)), mat4Identity(createMat4()));
  });

  it('faces +Z at yaw 0, and a positive yaw turns left toward +X', () => {
    const out = new Vec3();
    const forward = new Vec3(0, 0, 1);

    mat4TransformDirection(out, mat4FromTransform(createMat4(), 0, 0, 0, 0), forward);
    expect(out.x).toBeCloseTo(0, 12);
    expect(out.z).toBeCloseTo(1, 12);

    mat4TransformDirection(out, mat4FromTransform(createMat4(), 0, 0, 0, Math.PI / 2), forward);
    expect(out.x).toBeCloseTo(1, 12);
    expect(out.z).toBeCloseTo(0, 12);
  });

  it('applies scale before rotation and translation', () => {
    const m = mat4FromTransform(createMat4(), 10, 0, 0, 0, 2, 2, 2);
    const p = mat4TransformPoint(new Vec3(), m, new Vec3(1, 1, 1));
    expect(p.x).toBeCloseTo(12, 12);
    expect(p.y).toBeCloseTo(2, 12);
    expect(p.z).toBeCloseTo(2, 12);
  });

  it('maps the look target onto the negative Z axis of view space', () => {
    const view = mat4LookAt(
      createMat4(),
      new Vec3(0, 2, -10),
      new Vec3(0, 2, 0),
      new Vec3(0, 1, 0),
    );
    const target = mat4TransformPoint(new Vec3(), view, new Vec3(0, 2, 0));
    expect(target.x).toBeCloseTo(0, 12);
    expect(target.y).toBeCloseTo(0, 12);
    expect(target.z).toBeCloseTo(-10, 12);
  });

  it('projects the near plane to depth -1 and the far plane to depth +1', () => {
    const projection = mat4Perspective(createMat4(), Math.PI / 2, 1, 1, 100);
    // The matrix is stored as Float32, so compare with float32-level precision.
    expect(ndcDepth(projection, -1)).toBeCloseTo(-1, 5);
    expect(ndcDepth(projection, -100)).toBeCloseTo(1, 5);
  });
});
