import { Vec3 } from './vec3';

/** 4x4 matrix stored column-major in a Float32Array, the layout WebGL expects. */
export type Mat4 = Float32Array;

const scratch = new Float32Array(16);
const lookZ = new Vec3();
const lookX = new Vec3();
const lookY = new Vec3();

export function createMat4(): Mat4 {
  return mat4Identity(new Float32Array(16));
}

export function mat4Identity(out: Mat4): Mat4 {
  out.fill(0);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

/** out = a * b. Safe when `out` aliases either input. */
export function mat4Multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  for (let col = 0; col < 4; col++) {
    const b0 = b[col * 4];
    const b1 = b[col * 4 + 1];
    const b2 = b[col * 4 + 2];
    const b3 = b[col * 4 + 3];
    for (let row = 0; row < 4; row++) {
      scratch[col * 4 + row] = a[row] * b0 + a[4 + row] * b1 + a[8 + row] * b2 + a[12 + row] * b3;
    }
  }
  out.set(scratch);
  return out;
}

/** Perspective projection with OpenGL clip conventions (depth runs from -1 to 1). */
export function mat4Perspective(
  out: Mat4,
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const rangeInv = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * rangeInv;
  out[11] = -1;
  out[14] = 2 * far * near * rangeInv;
  return out;
}

/** View matrix for an eye looking at a target. */
export function mat4LookAt(out: Mat4, eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  lookZ.copy(eye).sub(target).normalize();
  lookX.setCross(up, lookZ).normalize();
  lookY.setCross(lookZ, lookX);
  out[0] = lookX.x;
  out[1] = lookY.x;
  out[2] = lookZ.x;
  out[3] = 0;
  out[4] = lookX.y;
  out[5] = lookY.y;
  out[6] = lookZ.y;
  out[7] = 0;
  out[8] = lookX.z;
  out[9] = lookY.z;
  out[10] = lookZ.z;
  out[11] = 0;
  out[12] = -lookX.dot(eye);
  out[13] = -lookY.dot(eye);
  out[14] = -lookZ.dot(eye);
  out[15] = 1;
  return out;
}

/**
 * Model matrix: scale, then rotate about +Y by `yaw`, then translate. A yaw of 0 faces +Z, and
 * a positive yaw turns left when seen from above.
 */
export function mat4FromTransform(
  out: Mat4,
  x: number,
  y: number,
  z: number,
  yaw: number,
  sx = 1,
  sy = 1,
  sz = 1,
): Mat4 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  out[0] = c * sx;
  out[1] = 0;
  out[2] = -s * sx;
  out[3] = 0;
  out[4] = 0;
  out[5] = sy;
  out[6] = 0;
  out[7] = 0;
  out[8] = s * sz;
  out[9] = 0;
  out[10] = c * sz;
  out[11] = 0;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[15] = 1;
  return out;
}

/** out = m applied to point p (w = 1). */
export function mat4TransformPoint(out: Vec3, m: Mat4, p: Vec3): Vec3 {
  return out.set(
    m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
    m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
    m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
  );
}

/** out = upper 3x3 of m applied to direction d (no translation, no normalization). */
export function mat4TransformDirection(out: Vec3, m: Mat4, d: Vec3): Vec3 {
  return out.set(
    m[0] * d.x + m[4] * d.y + m[8] * d.z,
    m[1] * d.x + m[5] * d.y + m[9] * d.z,
    m[2] * d.x + m[6] * d.y + m[10] * d.z,
  );
}

/** General 4x4 inverse. Returns the identity for a singular matrix. */
export function mat4Invert(out: Mat4, m: Mat4): Mat4 {
  const a00 = m[0];
  const a01 = m[1];
  const a02 = m[2];
  const a03 = m[3];
  const a10 = m[4];
  const a11 = m[5];
  const a12 = m[6];
  const a13 = m[7];
  const a20 = m[8];
  const a21 = m[9];
  const a22 = m[10];
  const a23 = m[11];
  const a30 = m[12];
  const a31 = m[13];
  const a32 = m[14];
  const a33 = m[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) < 1e-12) {
    return mat4Identity(out);
  }
  const inv = 1 / det;

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * inv;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * inv;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * inv;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * inv;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * inv;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * inv;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * inv;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * inv;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * inv;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * inv;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * inv;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * inv;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * inv;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * inv;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * inv;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * inv;
  return out;
}
