import type { ControlState } from '../core/controls';
import type { PlayerConfig } from '../data/schemas';
import { approach, clamp, wrapAngle } from '../math/util';
import type { Vec3 } from '../math/vec3';
import { integrateBody, type PhysicsBody } from '../systems/physics';
import type { CollisionWorld } from '../world/collision-world';
import { Entity } from './entity';

export class Player extends Entity implements PhysicsBody {
  grounded = false;
  readonly halfWidth: number;
  readonly height: number;

  constructor(
    spawn: Vec3,
    readonly tuning: PlayerConfig,
  ) {
    super();
    this.halfWidth = tuning.halfWidth;
    this.height = tuning.height;
    this.position.copy(spawn);
    this.previousPosition.copy(spawn);
  }
}

/**
 * On-foot control for one fixed step: camera-relative walking, turning toward the movement,
 * jumping from the ground, then the shared body physics.
 */
export function stepOnFoot(
  player: Player,
  controls: ControlState,
  dt: number,
  collision: CollisionWorld,
): void {
  const tuning = player.tuning;
  const sin = Math.sin(controls.cameraYaw);
  const cos = Math.cos(controls.cameraYaw);
  // Camera forward on the ground is (sin, 0, cos), and camera right is (-cos, 0, sin).
  let dirX = sin * controls.moveForward - cos * controls.moveRight;
  let dirZ = cos * controls.moveForward + sin * controls.moveRight;
  const length = Math.hypot(dirX, dirZ);
  const moving = length > 1e-6;
  if (moving) {
    dirX /= length;
    dirZ /= length;
  }

  const speed = controls.sprint ? tuning.sprintSpeed : tuning.walkSpeed;
  const rate = (player.grounded ? tuning.acceleration : tuning.airAcceleration) * dt;
  player.velocity.x = approach(player.velocity.x, moving ? dirX * speed : 0, rate);
  player.velocity.z = approach(player.velocity.z, moving ? dirZ * speed : 0, rate);

  if (moving) {
    const maxTurn = tuning.turnRate * dt;
    const turn = clamp(wrapAngle(Math.atan2(dirX, dirZ) - player.heading), -maxTurn, maxTurn);
    player.heading = wrapAngle(player.heading + turn);
  }

  if (controls.jump && player.grounded) {
    player.velocity.y = tuning.jumpSpeed;
    player.grounded = false;
  }

  integrateBody(player, collision, dt, {
    gravity: tuning.gravity,
    stepHeight: tuning.stepHeight,
    maxFallSpeed: tuning.maxFallSpeed,
  });
}
