import { describe, expect, it } from 'vitest';
import { DEFAULT_VEHICLES_CONFIG } from '../../src/data/vehicles.config';
import {
  stepVehicle,
  Vehicle,
  type ImpactReport,
  type VehicleInput,
} from '../../src/entities/vehicle';
import { Aabb } from '../../src/math/aabb';
import { Vec3 } from '../../src/math/vec3';
import { CollisionWorld } from '../../src/world/collision-world';

const DT = 1 / 60;
const SEDAN = DEFAULT_VEHICLES_CONFIG.types[0];
const OPEN_ROAD = new CollisionWorld([]);

function sedan(x = 0, z = 0, heading = 0): Vehicle {
  return new Vehicle(SEDAN, new Vec3(x, 0, z), heading, [1, 1, 1]);
}

/** Runs the car for `seconds` with fixed inputs, returning every impact it reported. */
function drive(
  car: Vehicle,
  input: VehicleInput,
  seconds: number,
  world: CollisionWorld = OPEN_ROAD,
): ImpactReport[] {
  const impacts: ImpactReport[] = [];
  for (let elapsed = 0; elapsed < seconds; elapsed += DT) {
    car.beginStep();
    stepVehicle(car, input, DT, world, [car], impacts);
  }
  return impacts;
}

/** Sideways speed relative to the car's heading. Large values mean the car is sliding. */
function lateralSpeed(car: Vehicle): number {
  const rightX = -Math.cos(car.heading);
  const rightZ = Math.sin(car.heading);
  return Math.abs(car.velocity.x * rightX + car.velocity.z * rightZ);
}

const CRUISE: VehicleInput = { throttle: 1, steer: 0, handbrake: false };
const COAST: VehicleInput = { throttle: 0, steer: 0, handbrake: false };

describe('stepVehicle', () => {
  it('accelerates along its heading and nears top speed', () => {
    const car = sedan();
    drive(car, CRUISE, 25);
    expect(car.forwardSpeed).toBeGreaterThan(0.85 * SEDAN.maxSpeed);
    expect(car.forwardSpeed).toBeLessThanOrEqual(SEDAN.maxSpeed + 0.5);
    expect(car.position.z).toBeGreaterThan(100);
    expect(car.position.x).toBeCloseTo(0, 6);
  });

  it('turns left for positive steer and right for negative steer', () => {
    const left = sedan();
    drive(left, CRUISE, 1);
    drive(left, { throttle: 1, steer: 1, handbrake: false }, 1);
    expect(left.heading).toBeGreaterThan(0.2);

    const right = sedan();
    drive(right, CRUISE, 1);
    drive(right, { throttle: 1, steer: -1, handbrake: false }, 1);
    expect(right.heading).toBeLessThan(-0.2);
  });

  it('slows steering as speed rises, so the car stays stable at high speed', () => {
    const slow = sedan();
    drive(slow, CRUISE, 0.5);
    drive(slow, { throttle: 0, steer: 1, handbrake: false }, 1);

    const fast = sedan();
    drive(fast, CRUISE, 6);
    drive(fast, { throttle: 0, steer: 1, handbrake: false }, 1);
    // Compare the turn rate per unit of speed. The fast car turns less sharply.
    expect(Math.abs(fast.yawRate) / Math.max(1, Math.abs(fast.forwardSpeed))).toBeLessThan(
      Math.abs(slow.yawRate) / Math.max(1, Math.abs(slow.forwardSpeed)),
    );
  });

  it('brakes to a stop from cruising speed', () => {
    const car = sedan();
    drive(car, CRUISE, 4);
    const before = car.forwardSpeed;
    drive(car, { throttle: -1, steer: 0, handbrake: false }, 1);
    expect(before - car.forwardSpeed).toBeGreaterThan(10);
  });

  it('reverses slowly from rest when the throttle is pulled back', () => {
    const car = sedan();
    drive(car, { throttle: -1, steer: 0, handbrake: false }, 2);
    expect(car.forwardSpeed).toBeLessThan(-3);
    expect(car.forwardSpeed).toBeGreaterThan(-SEDAN.reverseSpeed - 0.5);
  });

  it('lets the rear slide when the handbrake is held through a turn', () => {
    const gripped = sedan();
    drive(gripped, CRUISE, 2);
    drive(gripped, { throttle: 0, steer: 1, handbrake: false }, 1);

    const drifting = sedan();
    drive(drifting, CRUISE, 2);
    drive(drifting, { throttle: 0, steer: 1, handbrake: true }, 1);

    expect(lateralSpeed(drifting)).toBeGreaterThan(2 * lateralSpeed(gripped));
  });

  it('stops against a wall and reports a hard impact', () => {
    // Heading +X (yaw pi/2) at 10 m/s, toward a wall whose near face is at x = 0.
    const car = sedan(-6, 0, Math.PI / 2);
    car.velocity.set(10, 0, 0);
    car.forwardSpeed = 10;
    const wall = new CollisionWorld([new Aabb(0, 0, -10, 2, 5, 10)]);

    const impacts = drive(car, COAST, 1, wall);

    expect(impacts.length).toBeGreaterThan(0);
    expect(impacts[0].against).toBe('world');
    expect(impacts[0].speed).toBeGreaterThan(6);
    expect(car.health).toBeLessThan(SEDAN.health);
    expect(car.position.x + car.halfLength).toBeLessThanOrEqual(1e-3);
    expect(car.forwardSpeed).toBeLessThan(4);
  });

  it('takes no damage from a gentle bump', () => {
    const car = sedan(-6, 0, Math.PI / 2);
    car.velocity.set(3, 0, 0);
    car.forwardSpeed = 3;
    const wall = new CollisionWorld([new Aabb(0, 0, -10, 2, 5, 10)]);

    drive(car, COAST, 1, wall);

    expect(car.health).toBe(SEDAN.health);
  });
});
