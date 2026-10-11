import { lerp } from '../math/util';
import { Vec3 } from '../math/vec3';

/** Anything in the world with a position, motion, facing, and health. */
export class Entity {
  readonly position = new Vec3();
  /** Position at the start of the latest fixed step, used to interpolate rendering. */
  readonly previousPosition = new Vec3();
  readonly velocity = new Vec3();
  heading = 0;
  health = 100;
  alive = true;

  beginStep(): void {
    this.previousPosition.copy(this.position);
  }

  /** Position between the last two fixed steps. `alpha` is the factor the game loop reports. */
  interpolatedPosition(alpha: number, out: Vec3): Vec3 {
    return out.set(
      lerp(this.previousPosition.x, this.position.x, alpha),
      lerp(this.previousPosition.y, this.position.y, alpha),
      lerp(this.previousPosition.z, this.position.z, alpha),
    );
  }
}
