import type { ControlState } from '../core/controls';
import { EventBus } from '../core/event-bus';
import { createRng, type Rng } from '../core/rng';
import type { GameConfig } from '../data/load-config';
import type { VehicleConfig } from '../data/schemas';
import { Player, stepOnFoot } from '../entities/player';
import { stepVehicle, Vehicle, type ImpactReport } from '../entities/vehicle';
import { Aabb } from '../math/aabb';
import { separateObbFromAabb, separateObbFromObb, type Separation } from '../math/obb';
import { Vec3 } from '../math/vec3';
import { buildCityCollision } from '../world/city-collision';
import { generateCity, type CityLayout } from '../world/city-generator';
import type { CollisionWorld } from '../world/collision-world';
import { SolidSet } from '../world/solids';
import type { GameEvents } from './events';

const ENTER_RANGE = 4;
const EXIT_SIDE_CLEARANCE = 0.9;
const SPAWN_CLEARANCE = 15;
const PARKING_SEED = 2101;
const PARKING_ATTEMPTS_PER_CAR = 25;

/**
 * Simulation state for the city: layout, colliders, the player, and every car. It has no DOM or
 * GPU dependencies, so tests can step it directly.
 */
export class World {
  readonly layout: CityLayout;
  readonly collision: CollisionWorld;
  readonly solids: SolidSet;
  readonly player: Player;
  readonly vehicles: Vehicle[];
  readonly events = new EventBus<GameEvents>();
  private readonly impacts: ImpactReport[] = [];

  constructor(config: GameConfig) {
    this.layout = generateCity(config.city);
    this.collision = buildCityCollision(this.layout);
    this.solids = new SolidSet(this.collision);
    const spawn = this.layout.graph.nearestNode(0, 0).position;
    this.player = new Player(spawn, config.player);
    this.vehicles = parkVehicles(
      this.layout,
      config.vehicles.types,
      config.vehicles.parkedCount,
      this.collision,
      spawn,
      createRng(PARKING_SEED),
    );
  }

  /** Advances the simulation by one fixed step. */
  step(dt: number, controls: ControlState): void {
    this.player.beginStep();
    for (const vehicle of this.vehicles) {
      vehicle.beginStep();
    }
    if (controls.interact) {
      this.toggleVehicle();
    }

    const driven = this.player.vehicle;
    this.solids.setMoving(this.vehicles.filter((v) => v !== driven).map((v) => v.bounds()));
    if (driven) {
      stepVehicle(
        driven,
        {
          throttle: controls.moveForward,
          steer: -controls.moveRight,
          handbrake: controls.handbrake,
        },
        dt,
        this.collision,
        this.vehicles,
        this.impacts,
      );
      this.player.position.copy(driven.position);
    } else {
      stepOnFoot(this.player, controls, dt, this.solids);
    }
    this.publishImpacts();
  }

  /** The nearest car the player could climb into right now, or null. */
  nearestEnterableVehicle(): Vehicle | null {
    let best: Vehicle | null = null;
    let bestDistance = ENTER_RANGE;
    for (const vehicle of this.vehicles) {
      if (vehicle.occupied) {
        continue;
      }
      const distance = Math.hypot(
        vehicle.position.x - this.player.position.x,
        vehicle.position.z - this.player.position.z,
      );
      if (distance <= bestDistance) {
        best = vehicle;
        bestDistance = distance;
      }
    }
    return best;
  }

  private toggleVehicle(): void {
    const current = this.player.vehicle;
    if (current) {
      this.exitVehicle(current);
      return;
    }
    const target = this.nearestEnterableVehicle();
    if (target) {
      target.occupied = true;
      this.player.vehicle = target;
      this.events.emit('vehicleEntered', { vehicle: target });
    }
  }

  private exitVehicle(vehicle: Vehicle): void {
    const exit = this.findExitPoint(vehicle);
    if (!exit) {
      // No clear ground beside the car, so the player stays inside.
      return;
    }
    vehicle.occupied = false;
    vehicle.velocity.set(0, 0, 0);
    vehicle.forwardSpeed = 0;
    vehicle.yawRate = 0;
    vehicle.steer = 0;

    this.player.vehicle = null;
    this.player.position.copy(exit);
    this.player.previousPosition.copy(exit);
    this.player.velocity.set(0, 0, 0);
    this.player.grounded = true;
    this.events.emit('vehicleExited', { vehicle });
  }

  /** A clear spot on the driver's side, or on the passenger side if that is blocked. */
  private findExitPoint(vehicle: Vehicle): Vec3 | null {
    const sin = Math.sin(vehicle.heading);
    const cos = Math.cos(vehicle.heading);
    const offset = vehicle.halfWidth + EXIT_SIDE_CLEARANCE + this.player.halfWidth;
    for (const side of [1, -1]) {
      // Left of the car is (cos, 0, -sin), and right is the opposite.
      const candidate = new Vec3(
        vehicle.position.x + side * cos * offset,
        0,
        vehicle.position.z - side * sin * offset,
      );
      if (!this.bodyOverlaps(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private bodyOverlaps(feet: Vec3): boolean {
    const hw = this.player.halfWidth;
    return this.solids.overlapsAny(
      new Aabb(
        feet.x - hw,
        feet.y,
        feet.z - hw,
        feet.x + hw,
        feet.y + this.player.height,
        feet.z + hw,
      ),
    );
  }

  private publishImpacts(): void {
    for (const impact of this.impacts) {
      this.events.emit('vehicleImpact', {
        vehicle: impact.vehicle,
        speed: impact.speed,
        against: impact.against,
      });
    }
    this.impacts.length = 0;
  }
}

/**
 * Scatters parked cars along the curb lanes, away from the spawn point. Cars never overlap each
 * other or the world, and the same seed always parks the same cars.
 */
function parkVehicles(
  layout: CityLayout,
  types: readonly VehicleConfig[],
  count: number,
  statics: CollisionWorld,
  spawn: Vec3,
  rng: Rng,
): Vehicle[] {
  const parked: Vehicle[] = [];
  const curbLanes = layout.graph.edges.filter((edge) => edge.lane === 0);
  const separation: Separation = { nx: 0, nz: 0, depth: 0 };

  for (
    let attempt = 0;
    attempt < count * PARKING_ATTEMPTS_PER_CAR && parked.length < count;
    attempt++
  ) {
    const edge = rng.pick(curbLanes);
    const t = rng.range(0.15, 0.85);
    const x = edge.start.x + (edge.end.x - edge.start.x) * t;
    const z = edge.start.z + (edge.end.z - edge.start.z) * t;
    if (Math.hypot(x - spawn.x, z - spawn.z) < SPAWN_CLEARANCE) {
      continue;
    }

    const model = pickWeighted(types, rng);
    const car = new Vehicle(model, new Vec3(x, 0, z), edge.heading, rng.pick(model.bodyColors));
    const blockedByWorld = statics
      .query(car.bounds())
      .some((wall) => separateObbFromAabb(car.shape, wall, separation));
    const blockedByCar = parked.some((other) =>
      separateObbFromObb(car.shape, other.shape, separation),
    );
    if (!blockedByWorld && !blockedByCar) {
      parked.push(car);
    }
  }
  return parked;
}

function pickWeighted(types: readonly VehicleConfig[], rng: Rng): VehicleConfig {
  const total = types.reduce((sum, type) => sum + type.spawnWeight, 0);
  let roll = rng.next() * total;
  for (const type of types) {
    roll -= type.spawnWeight;
    if (roll < 0) {
      return type;
    }
  }
  return types[types.length - 1];
}
