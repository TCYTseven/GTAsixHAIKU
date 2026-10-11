import { mat4LookAt, mat4Multiply, mat4Perspective, createMat4, type Mat4 } from '../math/mat4';
import { clamp, DEG_TO_RAD, lerp, wrapAngle } from '../math/util';
import { Vec3 } from '../math/vec3';

const MAX_PITCH = 89 * DEG_TO_RAD;
const WORLD_UP = new Vec3(0, 1, 0);
const scratchForward = new Vec3();
const scratchTarget = new Vec3();

/**
 * Yaw and pitch camera. Yaw 0 looks along +Z, and pitch is positive when looking up.
 * Position is kept for the last two fixed steps so rendering can interpolate between them.
 */
export class Camera {
  readonly position = new Vec3(0, 2, 0);
  readonly previousPosition = new Vec3(0, 2, 0);
  /** Interpolated eye point for the frame being rendered. */
  readonly eye = new Vec3();
  yaw = 0;
  pitch = 0;
  fovY = 60 * DEG_TO_RAD;
  near = 0.1;
  far = 2000;
  readonly view: Mat4 = createMat4();
  readonly projection: Mat4 = createMat4();
  readonly viewProjection: Mat4 = createMat4();

  /** Call at the start of each fixed step, before moving the camera. */
  beginStep(): void {
    this.previousPosition.copy(this.position);
  }

  /** Call once per rendered frame. `alpha` is the fixed-step interpolation factor. */
  updateMatrices(alpha: number, aspect: number): void {
    this.eye.set(
      lerp(this.previousPosition.x, this.position.x, alpha),
      lerp(this.previousPosition.y, this.position.y, alpha),
      lerp(this.previousPosition.z, this.position.z, alpha),
    );
    this.buildMatrices(aspect);
  }

  /**
   * Puts the eye at an explicit point, for follow cameras. The look direction still comes from yaw
   * and pitch.
   */
  lookFrom(eye: Vec3, aspect: number): void {
    this.eye.copy(eye);
    this.buildMatrices(aspect);
  }

  private buildMatrices(aspect: number): void {
    this.forward(scratchForward);
    scratchTarget.copy(this.eye).add(scratchForward);
    mat4LookAt(this.view, this.eye, scratchTarget, WORLD_UP);
    mat4Perspective(this.projection, this.fovY, aspect, this.near, this.far);
    mat4Multiply(this.viewProjection, this.projection, this.view);
  }

  /** Adds mouse-look rotation. Pitch is clamped just short of straight up and down. */
  addLook(deltaYaw: number, deltaPitch: number): void {
    this.yaw = wrapAngle(this.yaw + deltaYaw);
    this.pitch = clamp(this.pitch + deltaPitch, -MAX_PITCH, MAX_PITCH);
  }

  /** Unit view direction including pitch. */
  forward(out: Vec3): Vec3 {
    const cosPitch = Math.cos(this.pitch);
    return out.set(
      cosPitch * Math.sin(this.yaw),
      Math.sin(this.pitch),
      cosPitch * Math.cos(this.yaw),
    );
  }

  /** Unit direction along the ground that points forward for the current yaw. */
  flatForward(out: Vec3): Vec3 {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  /** Unit direction along the ground that points to the camera's right. */
  flatRight(out: Vec3): Vec3 {
    return out.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
  }
}
