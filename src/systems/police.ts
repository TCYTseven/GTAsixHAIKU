import type { Rng } from '../core/rng';
import { stepVehicle, type ImpactReport, type Vehicle } from '../entities/vehicle';
import { Vec3 } from '../math/vec3';
import type { CollisionWorld } from '../world/collision-world';
import type { RoadGraph } from '../world/road-graph';

export type PoliceMode = 'patrol' | 'search' | 'pursue';

export interface PoliceUnit {
  readonly car: Vehicle;
  mode: PoliceMode;
  /** Where a patrol or search is heading. */
  readonly target: Vec3;
  stuckTimer: number;
}

const PATROL_SPEED = 10;
const SEARCH_SPEED = 14;
const PURSUIT_SPEED = 22;
const ARRIVE_RANGE = 8;
const STUCK_TIME = 3;

export interface PoliceContext {
  readonly graph: RoadGraph;
  readonly statics: CollisionWorld;
  readonly vehicles: readonly Vehicle[];
  readonly rng: Rng;
}

/**
 * Drives one police car. Pursuit steers at the player, search heads for the last place the player
 * was seen, and patrol wanders between intersections. A car stuck against scenery for a few seconds
 * is moved to the nearest intersection.
 */
export function stepPolice(
  unit: PoliceUnit,
  dt: number,
  playerPosition: Vec3,
  context: PoliceContext,
  impacts: ImpactReport[],
): void {
  const car = unit.car;
  const goalSpeed =
    unit.mode === 'pursue' ? PURSUIT_SPEED : unit.mode === 'search' ? SEARCH_SPEED : PATROL_SPEED;
  const aim = unit.mode === 'pursue' ? playerPosition : unit.target;
  if (
    unit.mode !== 'pursue' &&
    Math.hypot(aim.x - car.position.x, aim.z - car.position.z) < ARRIVE_RANGE
  ) {
    const node = context.graph.nodes[Math.floor(context.rng.next() * context.graph.nodes.length)];
    unit.target.copy(node.position);
  }

  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  const dx = aim.x - car.position.x;
  const dz = aim.z - car.position.z;
  const distance = Math.hypot(dx, dz);
  const localRight = -fz * dx + fx * dz;
  const localForward = fx * dx + fz * dz;
  const curvature =
    (2 * localRight) / Math.max(1e-6, localRight * localRight + localForward * localForward);
  const wheelAngle = Math.atan(curvature * car.tuning.wheelbase);
  const steer = Math.max(-1, Math.min(1, -wheelAngle / car.maxSteer));

  const speedGoal = distance < 12 ? Math.min(goalSpeed, Math.max(3, distance * 0.6)) : goalSpeed;
  const speed = car.forwardSpeed;
  let throttle = 0;
  if (speed < speedGoal - 0.5) {
    throttle = 1;
  } else if (speed > speedGoal + 1 && speed > 0.5) {
    throttle = -1;
  }

  unit.stuckTimer = Math.abs(speed) < 1 && throttle > 0 ? unit.stuckTimer + dt : 0;
  if (unit.stuckTimer > STUCK_TIME) {
    const node = context.graph.nearestNode(car.position.x, car.position.z);
    car.position.copy(node.position);
    car.velocity.set(0, 0, 0);
    car.forwardSpeed = 0;
    unit.stuckTimer = 0;
    return;
  }

  stepVehicle(
    car,
    { throttle, steer, handbrake: false },
    dt,
    context.statics,
    context.vehicles,
    impacts,
  );
}
