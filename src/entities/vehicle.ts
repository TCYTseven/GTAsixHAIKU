import type { VehicleConfig } from '../data/schemas';
import { Aabb } from '../math/aabb';
import {
  obbBounds,
  separateObbFromAabb,
  separateObbFromObb,
  type Obb,
  type Separation,
} from '../math/obb';
import { approach, clamp, DEG_TO_RAD, damp, wrapAngle } from '../math/util';
import type { Vec3 } from '../math/vec3';
import type { Rgb } from '../render/color';
import type { CollisionWorld } from '../world/collision-world';
import type { RoadEdge } from '../world/road-graph';
import { Entity } from './entity';

const STEER_RESPONSE = 3.5;
const YAW_RESPONSE = 10;
const ROLLING_DRAG = 0.02;
const AIR_DRAG = 0.0005;
const HANDBRAKE_DECEL = 6;
const HANDBRAKE_GRIP = 1.4;
const RESTITUTION = 0.2;
const MIN_IMPACT_SPEED = 0.5;
const DAMAGE_THRESHOLD = 6;
const DAMAGE_PER_SPEED = 14;
const MAX_CONTACT_PASSES = 4;
const NEARBY_VEHICLE_RANGE = 10;
const PUSH_MARGIN = 1e-3;

/** Driver inputs for one step. `steer` is positive for left and negative for right. */
export interface VehicleInput {
  readonly throttle: number;
  readonly steer: number;
  readonly handbrake: boolean;
}

/** A traffic car's current lane. Cars with a route drive themselves. */
export interface TrafficRoute {
  edge: RoadEdge;
}

export interface ImpactReport {
  readonly vehicle: Vehicle;
  readonly speed: number;
  readonly against: 'world' | 'vehicle';
  readonly other: Vehicle | null;
}

/** A car: an oriented box on the ground that drives with an arcade bicycle model. */
export class Vehicle extends Entity {
  readonly halfWidth: number;
  readonly halfLength: number;
  readonly height: number;
  readonly maxSteer: number;
  occupied = false;
  route: TrafficRoute | null = null;
  yawRate = 0;
  steer = 0;
  /** Speed along the car's heading, in m/s. Negative when reversing. */
  forwardSpeed = 0;

  constructor(
    readonly tuning: VehicleConfig,
    spawn: Vec3,
    heading: number,
    readonly bodyColor: Rgb,
  ) {
    super();
    this.halfWidth = tuning.width / 2;
    this.halfLength = tuning.length / 2;
    this.height = tuning.height;
    this.maxSteer = tuning.maxSteerDegrees * DEG_TO_RAD;
    this.health = tuning.health;
    this.position.copy(spawn);
    this.previousPosition.copy(spawn);
    this.heading = heading;
  }

  get shape(): Obb {
    return {
      x: this.position.x,
      z: this.position.z,
      halfWidth: this.halfWidth,
      halfLength: this.halfLength,
      yaw: this.heading,
    };
  }

  /** The car's footprint as a box, for things that walk around it. */
  bounds(): Aabb {
    const b = obbBounds(this.shape);
    return new Aabb(b.minX, 0, b.minZ, b.maxX, this.height, b.maxZ);
  }

  get speedKmh(): number {
    return Math.abs(this.forwardSpeed) * 3.6;
  }
}

/**
 * Advances one car by one fixed step. The model is an arcade bicycle: the body turns at
 * v·tan(angle)/wheelbase, and the wheel angle narrows as speed rises. Lateral grip bleeds off
 * sideways speed, so the handbrake lets the rear slide into a drift. Contacts with the world and
 * with other cars push the car out and reflect its velocity.
 */
export function stepVehicle(
  vehicle: Vehicle,
  input: VehicleInput,
  dt: number,
  statics: CollisionWorld,
  others: readonly Vehicle[],
  impacts: ImpactReport[],
): void {
  const t = vehicle.tuning;

  vehicle.steer = approach(vehicle.steer, clamp(input.steer, -1, 1), STEER_RESPONSE * dt);
  const speedRatio = Math.min(1, Math.abs(vehicle.forwardSpeed) / t.maxSpeed);
  const wheelAngle = vehicle.steer * vehicle.maxSteer * (1 - 0.55 * speedRatio);

  const targetYawRate = (vehicle.forwardSpeed * Math.tan(wheelAngle)) / t.wheelbase;
  vehicle.yawRate = damp(vehicle.yawRate, targetYawRate, YAW_RESPONSE, dt);
  vehicle.heading = wrapAngle(vehicle.heading + vehicle.yawRate * dt);

  const fx = Math.sin(vehicle.heading);
  const fz = Math.cos(vehicle.heading);
  const rx = -fz;
  const rz = fx;
  const velocity = vehicle.velocity;
  let forward = velocity.x * fx + velocity.z * fz;
  let lateral = velocity.x * rx + velocity.z * rz;

  let accel = 0;
  if (input.throttle > 0) {
    if (forward >= -0.5) {
      // The engine's pull tapers to zero at top speed, with a quadratic falloff so the car can
      // actually approach its limit despite drag.
      accel += t.acceleration * input.throttle * Math.max(0, 1 - (forward / t.maxSpeed) ** 2);
    } else {
      accel += t.brakeForce * input.throttle;
    }
  } else if (input.throttle < 0) {
    if (forward > 0.5) {
      accel -= t.brakeForce * -input.throttle;
    } else if (forward > -t.reverseSpeed) {
      accel -= t.acceleration * 0.5 * -input.throttle;
    }
  }
  if (input.handbrake && Math.abs(forward) > 0.5) {
    accel -= Math.sign(forward) * HANDBRAKE_DECEL;
  }
  accel -= forward * ROLLING_DRAG + Math.sign(forward) * AIR_DRAG * forward * forward;
  forward += accel * dt;

  const grip = input.handbrake ? HANDBRAKE_GRIP : t.grip;
  lateral *= Math.exp(-grip * dt);

  velocity.set(forward * fx + lateral * rx, 0, forward * fz + lateral * rz);
  vehicle.forwardSpeed = forward;
  vehicle.position.addScaled(velocity, dt);

  resolveContacts(vehicle, statics, others, impacts);
}

function resolveContacts(
  vehicle: Vehicle,
  statics: CollisionWorld,
  others: readonly Vehicle[],
  impacts: ImpactReport[],
): void {
  const separation: Separation = { nx: 0, nz: 0, depth: 0 };
  for (let pass = 0; pass < MAX_CONTACT_PASSES; pass++) {
    let corrected = false;

    const b = obbBounds(vehicle.shape);
    const region = new Aabb(b.minX, 0, b.minZ, b.maxX, vehicle.height, b.maxZ);
    for (const wall of statics.query(region)) {
      if (separateObbFromAabb(vehicle.shape, wall, separation)) {
        applyContact(vehicle, separation, impacts, 'world', null);
        corrected = true;
      }
    }

    for (const other of others) {
      if (other === vehicle) {
        continue;
      }
      if (
        Math.abs(other.position.x - vehicle.position.x) > NEARBY_VEHICLE_RANGE ||
        Math.abs(other.position.z - vehicle.position.z) > NEARBY_VEHICLE_RANGE
      ) {
        continue;
      }
      if (separateObbFromObb(vehicle.shape, other.shape, separation)) {
        applyContact(vehicle, separation, impacts, 'vehicle', other);
        corrected = true;
      }
    }

    if (!corrected) {
      return;
    }
  }
}

/** Pushes the car out along the separation, then reflects the velocity into the surface. */
function applyContact(
  vehicle: Vehicle,
  separation: Separation,
  impacts: ImpactReport[],
  against: 'world' | 'vehicle',
  other: Vehicle | null,
): void {
  const { nx, nz } = separation;
  const push = separation.depth + PUSH_MARGIN;
  vehicle.position.x += nx * push;
  vehicle.position.z += nz * push;

  const velocity = vehicle.velocity;
  const into = velocity.x * nx + velocity.z * nz;
  if (into >= 0) {
    return;
  }
  const speed = -into;
  velocity.x -= nx * into * (1 + RESTITUTION);
  velocity.z -= nz * into * (1 + RESTITUTION);
  if (speed < MIN_IMPACT_SPEED) {
    return;
  }
  if (speed > DAMAGE_THRESHOLD) {
    vehicle.health = Math.max(0, vehicle.health - (speed - DAMAGE_THRESHOLD) * DAMAGE_PER_SPEED);
  }
  impacts.push({ vehicle, speed, against, other });
}
