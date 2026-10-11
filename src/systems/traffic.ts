import { stepVehicle, type ImpactReport, type Vehicle } from '../entities/vehicle';
import { clamp } from '../math/util';
import type { Rng } from '../core/rng';
import type { CollisionWorld } from '../world/collision-world';
import type { RoadGraph } from '../world/road-graph';

const LIGHT_PERIOD = 12;
const LIGHT_STOP_RANGE = 12;
const FOLLOW_RANGE = 14;
const NEXT_EDGE_RADIUS = 3;

export interface TrafficContext {
  readonly graph: RoadGraph;
  readonly statics: CollisionWorld;
  readonly vehicles: readonly Vehicle[];
  /** Simulation time in seconds, which drives the traffic lights. */
  readonly time: number;
  readonly rng: Rng;
  readonly cruiseFactor: number;
}

/**
 * Drives one car along the lane graph for a fixed step. The car steers toward the end of its lane
 * (pure pursuit), keeps a gap to the car ahead, and stops for a red light at an intersection.
 */
export function stepTraffic(
  car: Vehicle,
  dt: number,
  context: TrafficContext,
  impacts: ImpactReport[],
): void {
  const route = car.route;
  if (!route) {
    return;
  }
  const { graph } = context;
  const edge = route.edge;
  const toEnd = Math.hypot(edge.end.x - car.position.x, edge.end.z - car.position.z);
  if (toEnd < NEXT_EDGE_RADIUS) {
    // Pick any lane leaving this intersection, except straight back the way we came.
    const options = graph.nodes[edge.to].outgoing
      .map((id) => graph.edges[id])
      .filter((next) => next.to !== edge.from);
    if (options.length > 0) {
      route.edge = context.rng.pick(options);
    }
  }
  const target = route.edge.end;
  const endDistance = Math.hypot(target.x - car.position.x, target.z - car.position.z);

  // Pure pursuit: turn so the car would arrive at the target on a circle.
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  const dx = target.x - car.position.x;
  const dz = target.z - car.position.z;
  const localRight = -fz * dx + fx * dz;
  const localForward = fx * dx + fz * dz;
  const curvature =
    (2 * localRight) / Math.max(1e-6, localRight * localRight + localForward * localForward);
  const wheelAngle = Math.atan(curvature * car.tuning.wheelbase);
  const steer = clamp(-wheelAngle / car.maxSteer, -1, 1);

  // Choose a speed: cruising, limited by the car ahead and by red lights.
  let targetSpeed = car.tuning.maxSpeed * context.cruiseFactor;
  const gap = gapToLeader(car, context.vehicles);
  if (gap !== null) {
    targetSpeed = Math.min(targetSpeed, Math.max(0, gap * 0.7));
  }
  if (endDistance < LIGHT_STOP_RANGE && isRed(route.edge.start, route.edge.end, context.time)) {
    targetSpeed = Math.min(targetSpeed, Math.max(0, (endDistance - 3) * 0.6));
  }

  const speed = car.forwardSpeed;
  let throttle = 0;
  if (speed < targetSpeed - 0.5) {
    throttle = 1;
  } else if (speed > targetSpeed + 1 && speed > 0.5) {
    throttle = -1;
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

/** Distance to the nearest car ahead in our lane, minus both body lengths, or null if none. */
function gapToLeader(car: Vehicle, vehicles: readonly Vehicle[]): number | null {
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  let best: number | null = null;
  for (const other of vehicles) {
    if (other === car) {
      continue;
    }
    const dx = other.position.x - car.position.x;
    const dz = other.position.z - car.position.z;
    const ahead = fx * dx + fz * dz;
    const aside = Math.abs(-fz * dx + fx * dz);
    if (ahead <= 0 || ahead > FOLLOW_RANGE || aside > 1.5) {
      continue;
    }
    const gap = ahead - car.halfLength - other.halfLength;
    if (best === null || gap < best) {
      best = gap;
    }
  }
  return best;
}

/** Lights alternate between east-west and north-south every LIGHT_PERIOD seconds. */
function isRed(
  start: { x: number; z: number },
  end: { x: number; z: number },
  time: number,
): boolean {
  const eastWest = Math.abs(end.x - start.x) > Math.abs(end.z - start.z);
  const eastWestGreen = Math.floor(time / LIGHT_PERIOD) % 2 === 0;
  return eastWest ? !eastWestGreen : eastWestGreen;
}
