import { describe, expect, it } from 'vitest';
import type { ControlState } from '../../src/core/controls';
import { createRng } from '../../src/core/rng';
import { loadGameConfig } from '../../src/data/load-config';
import { World } from '../../src/game/world';
import { separateObbFromAabb, separateObbFromObb, type Separation } from '../../src/math/obb';

const DT = 1 / 60;
const config = loadGameConfig();

function controls(overrides: Partial<ControlState> = {}): ControlState {
  return {
    moveForward: 0,
    moveRight: 0,
    sprint: false,
    jump: false,
    handbrake: false,
    interact: false,
    cameraYaw: 0,
    ...overrides,
  };
}

function run(world: World, state: ControlState, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += DT) {
    world.step(DT, state);
  }
}

/** A parked car with no other car within 10 m, so entering it is unambiguous. */
function isolatedCar(world: World) {
  const car = world.vehicles.find((candidate) =>
    world.vehicles.every(
      (other) =>
        other === candidate ||
        Math.hypot(
          other.position.x - candidate.position.x,
          other.position.z - candidate.position.z,
        ) > 10,
    ),
  );
  if (!car) {
    throw new Error('expected at least one isolated parked car');
  }
  return car;
}

/** Puts the player on foot beside the car's driver side, then presses interact. */
function climbIn(world: World): void {
  const car = isolatedCar(world);
  const cos = Math.cos(car.heading);
  const sin = Math.sin(car.heading);
  world.player.position.set(car.position.x + cos * 2.2, 0, car.position.z - sin * 2.2);
  world.player.previousPosition.copy(world.player.position);
  world.player.grounded = true;
  run(world, controls({ interact: true }), DT);
}

describe('parked and driven cars', () => {
  it('parks the configured number of cars clear of the world and of each other', () => {
    const world = new World(config);
    expect(world.vehicles).toHaveLength(config.vehicles.parkedCount);

    const separation: Separation = { nx: 0, nz: 0, depth: 0 };
    for (const car of world.vehicles) {
      const blocked = world.collision
        .query(car.bounds())
        .some((wall) => separateObbFromAabb(car.shape, wall, separation));
      expect(blocked).toBe(false);
    }
    world.vehicles.forEach((car, i) => {
      world.vehicles.slice(i + 1).forEach((other) => {
        expect(separateObbFromObb(car.shape, other.shape, separation)).toBe(false);
      });
    });
  });

  it('lets the player climb in, drive, and step back out', () => {
    const world = new World(config);
    climbIn(world);
    const car = world.player.vehicle;
    expect(car).not.toBeNull();
    expect(car?.occupied).toBe(true);

    const start = car?.position.clone();
    run(world, controls({ moveForward: 1 }), 2);
    expect(car?.position.distanceTo(start ?? car.position)).toBeGreaterThan(5);
    expect(world.player.position.x).toBeCloseTo(car?.position.x ?? 0, 6);
    expect(world.player.position.z).toBeCloseTo(car?.position.z ?? 0, 6);

    run(world, controls({ interact: true }), DT);
    expect(world.player.vehicle).toBeNull();
    expect(car?.occupied).toBe(false);
  });

  it('keeps a car out of buildings through a long random drive', () => {
    const world = new World(config);
    climbIn(world);
    const car = world.player.vehicle;
    if (!car) {
      throw new Error('the player should be driving');
    }
    const rng = createRng(11);
    const separation: Separation = { nx: 0, nz: 0, depth: 0 };

    for (let step = 0; step < 40 * 60; step++) {
      if (step % 30 === 0) {
        const state = controls({
          moveForward: rng.pick([-1, 0, 1, 1]),
          moveRight: rng.pick([-1, 0, 1]),
          handbrake: rng.chance(0.1),
        });
        world.step(DT, state);
      } else {
        world.step(DT, controls({ moveForward: 1, moveRight: rng.pick([-1, 0, 1]) }));
      }
      expect(Number.isFinite(car.position.x) && Number.isFinite(car.position.z)).toBe(true);
      const blocked = world.collision
        .query(car.bounds())
        .some((wall) => separateObbFromAabb(car.shape, wall, separation));
      expect(blocked).toBe(false);
    }
  });

  it('reports the nearest car the player can climb into', () => {
    const world = new World(config);
    const car = isolatedCar(world);
    world.player.position.set(car.position.x, 0, car.position.z);
    expect(world.nearestEnterableVehicle()).toBe(car);
    world.player.position.set(car.position.x + 500, 0, car.position.z + 500);
    expect(world.nearestEnterableVehicle()).toBeNull();
  });
});
