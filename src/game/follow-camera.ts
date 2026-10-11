import type { PlayerConfig } from '../data/schemas';
import { clamp, damp, wrapAngle } from '../math/util';
import { Vec3 } from '../math/vec3';
import type { Camera } from '../render/camera';
import type { CollisionWorld } from '../world/collision-world';

const WALL_MARGIN = 0.25;
const MIN_DISTANCE = 0.6;
const PULL_IN_SHARPNESS = 25;
const DRIFT_SHARPNESS = 6;
const DEFAULT_PITCH = -0.18;

/**
 * Third-person camera that orbits a focus point. When a building stands between the focus and the
 * camera, it pulls in quickly and eases back out once the view is clear.
 */
export class FollowCamera {
  private distance: number;
  private readonly target = new Vec3();
  private readonly back = new Vec3();
  private readonly eye = new Vec3();

  constructor(
    private readonly camera: Camera,
    private readonly tuning: PlayerConfig,
  ) {
    this.distance = tuning.cameraDistance;
    camera.pitch = DEFAULT_PITCH;
  }

  /** Turns the orbit by a mouse movement, in radians. Pitch stays within the configured range. */
  addLook(deltaYaw: number, deltaPitch: number): void {
    this.camera.yaw = wrapAngle(this.camera.yaw + deltaYaw);
    this.camera.pitch = clamp(
      this.camera.pitch + deltaPitch,
      this.tuning.cameraMinPitch,
      this.tuning.cameraMaxPitch,
    );
  }

  /** Places the camera behind `focus`, which is the feet of the followed body. */
  update(focus: Vec3, frameSeconds: number, collision: CollisionWorld, aspect: number): void {
    this.target.set(focus.x, focus.y + this.tuning.cameraHeight, focus.z);
    this.camera.forward(this.back).scale(-1);

    const desired = this.tuning.cameraDistance;
    const hit = collision.raycast(this.target, this.back, desired);
    const goal = hit === null ? desired : clamp(hit - WALL_MARGIN, MIN_DISTANCE, desired);
    const sharpness = goal < this.distance ? PULL_IN_SHARPNESS : DRIFT_SHARPNESS;
    this.distance = damp(this.distance, goal, sharpness, frameSeconds);

    this.eye.copy(this.target).addScaled(this.back, this.distance);
    this.camera.lookFrom(this.eye, aspect);
  }

  /** Distance from the focus to the camera after wall avoidance. Exposed for tests. */
  get currentDistance(): number {
    return this.distance;
  }
}
