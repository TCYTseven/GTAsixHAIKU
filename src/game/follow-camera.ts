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
const ON_FOOT_LAG_SHARPNESS = 60;

/** How far back and how tightly a follow camera tracks its focus. */
export interface OrbitShot {
  readonly distance: number;
  readonly height: number;
  /** How quickly the focus catches up with the target. Higher is tighter. */
  readonly lagSharpness: number;
}

/**
 * Third-person camera that orbits a focus point. When a building stands between the focus and the
 * camera, it pulls in quickly and eases back out once the view is clear.
 */
export class FollowCamera {
  private distance: number;
  private readonly smoothFocus = new Vec3();
  private hasFocus = false;
  private readonly target = new Vec3();
  private readonly back = new Vec3();
  private readonly eye = new Vec3();
  private readonly defaultShot: OrbitShot;

  constructor(
    private readonly camera: Camera,
    private readonly tuning: PlayerConfig,
  ) {
    this.distance = tuning.cameraDistance;
    this.defaultShot = {
      distance: tuning.cameraDistance,
      height: tuning.cameraHeight,
      lagSharpness: ON_FOOT_LAG_SHARPNESS,
    };
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

  /** Swings the orbit toward `yaw` by at most `maxStep` radians. Used to settle behind a car. */
  alignYaw(yaw: number, maxStep: number): void {
    const difference = wrapAngle(yaw - this.camera.yaw);
    this.camera.yaw = wrapAngle(this.camera.yaw + clamp(difference, -maxStep, maxStep));
  }

  /** Places the camera behind `focus`, which is the feet of the body being followed. */
  update(
    focus: Vec3,
    frameSeconds: number,
    collision: CollisionWorld,
    aspect: number,
    shot: OrbitShot = this.defaultShot,
  ): void {
    if (this.hasFocus) {
      const s = shot.lagSharpness;
      this.smoothFocus.set(
        damp(this.smoothFocus.x, focus.x, s, frameSeconds),
        damp(this.smoothFocus.y, focus.y, s, frameSeconds),
        damp(this.smoothFocus.z, focus.z, s, frameSeconds),
      );
    } else {
      this.smoothFocus.copy(focus);
      this.hasFocus = true;
    }
    this.target.set(this.smoothFocus.x, this.smoothFocus.y + shot.height, this.smoothFocus.z);
    this.camera.forward(this.back).scale(-1);

    const desired = shot.distance;
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
