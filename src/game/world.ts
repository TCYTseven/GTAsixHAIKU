import type { ControlState } from '../core/controls';
import { EventBus } from '../core/event-bus';
import { createRng, type Rng } from '../core/rng';
import type { GameConfig } from '../data/load-config';
import type { VehicleConfig } from '../data/schemas';
import { Pedestrian, perimeterPoint, stepPedestrian } from '../entities/pedestrian';
import { Player, stepOnFoot } from '../entities/player';
import { stepVehicle, Vehicle, type ImpactReport } from '../entities/vehicle';
import { Aabb } from '../math/aabb';
import { separateObbFromAabb, separateObbFromObb, type Separation } from '../math/obb';
import type { Rgb } from '../render/color';
import { Vec3 } from '../math/vec3';
import { stepTraffic, type TrafficContext } from '../systems/traffic';
import { buildCityCollision } from '../world/city-collision';
import { generateCity, type CityLayout } from '../world/city-generator';
import type { CollisionWorld } from '../world/collision-world';
import type { RoadEdge } from '../world/road-graph';
import { SolidSet } from '../world/solids';
import type { GameEvents } from './events';

const ENTER_RANGE = 4;
const EXIT_SIDE_CLEARANCE = 0.9;
const SPAWN_CLEARANCE = 15;
const PARKING_SEED = 2101;
const POPULATION_SEED = 4411;
const PARKING_ATTEMPTS_PER_CAR = 25;
const POPULATION_INTERVAL = 0.5;
const SPAWN_ATTEMPTS = 30;
const SPAWN_VIEW_DOT = 0.6;
const FLEE_TRIGGER_RANGE = 6;
const FLEE_TRIGGER_SPEED = 8;
const PEDESTRIAN_VARIANTS = 4;

/**
 * Simulation state for the city: layout, colliders, the player, every car, and the people on the
 * sidewalks. It has no DOM or GPU dependencies, so tests can step it directly.
 */
export class World {
  readonly layout: CityLayout;
  readonly collision: CollisionWorld;
  readonly solids: SolidSet;
  readonly player: Player;
  /** Parked cars, traffic, and the car the player is driving. */
  readonly vehicles: Vehicle[];
  readonly pedestrians: Pedestrian[] = [];
  readonly events = new EventBus<GameEvents>();
  private readonly impacts: ImpactReport[] = [];
  private readonly config: GameConfig;
  private readonly rng = createRng(POPULATION_SEED);
  private readonly viewer = new Vec3();
  private readonly viewerForward = new Vec3(0, 0, 1);
  private time = 0;
  private populationTimer = POPULATION_INTERVAL;
  /** Blocks and lanes inside the spawn band around the viewer, refreshed on each population tick. */
  private nearbyBlocks: CityLayout['blocks'][number][] = [];
  private nearbyEdges: RoadEdge[] = [];

  constructor(config: GameConfig) {
    this.config = config;
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
    this.viewer.copy(spawn);
  }

  /** Where the camera is and which way it faces. Spawning keeps people out of its view. */
  setViewer(position: Vec3, forward: Vec3): void {
    this.viewer.copy(position);
    this.viewerForward.set(forward.x, 0, forward.z).normalize();
  }

  /** Advances the simulation by one fixed step. */
  step(dt: number, controls: ControlState): void {
    this.time += dt;
    this.player.beginStep();
    for (const vehicle of this.vehicles) {
      vehicle.beginStep();
    }
    if (controls.interact) {
      this.toggleVehicle();
    }

    const trafficContext: TrafficContext = {
      graph: this.layout.graph,
      statics: this.collision,
      vehicles: this.vehicles,
      time: this.time,
      rng: this.rng,
      cruiseFactor: this.config.population.trafficSpeedFactor,
    };
    for (const vehicle of this.vehicles) {
      if (vehicle.route && vehicle !== this.player.vehicle) {
        stepTraffic(vehicle, dt, trafficContext, this.impacts);
      }
    }
    this.updatePedestrians(dt);

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
    this.maintainPopulation(dt);
  }

  /** The nearest parked car the player could climb into right now, or null. */
  nearestEnterableVehicle(): Vehicle | null {
    let best: Vehicle | null = null;
    let bestDistance = ENTER_RANGE;
    for (const vehicle of this.vehicles) {
      if (vehicle.occupied || vehicle.route) {
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

  /** Walkers run from fast cars that come close, and otherwise keep to their sidewalks. */
  private updatePedestrians(dt: number): void {
    for (const walker of this.pedestrians) {
      if (!walker.fleeing) {
        for (const car of this.vehicles) {
          const distance = Math.hypot(
            car.position.x - walker.position.x,
            car.position.z - walker.position.z,
          );
          if (Math.abs(car.forwardSpeed) > FLEE_TRIGGER_SPEED && distance < FLEE_TRIGGER_RANGE) {
            walker.startFleeing(car.position.x, car.position.z);
            break;
          }
        }
      }
      stepPedestrian(walker, dt, this.collision);
    }
  }

  /** Keeps the crowd and the traffic near the viewer: spawn out of sight, despawn when far. */
  private maintainPopulation(dt: number): void {
    this.populationTimer += dt;
    if (this.populationTimer < POPULATION_INTERVAL) {
      return;
    }
    this.populationTimer = 0;
    const pop = this.config.population;

    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      if (this.distanceToViewer(this.pedestrians[i].position) > pop.despawnDistance) {
        this.pedestrians.splice(i, 1);
      }
    }
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const car = this.vehicles[i];
      if (car.route && this.distanceToViewer(car.position) > pop.despawnDistance) {
        this.vehicles.splice(i, 1);
      }
    }

    const pop2 = this.config.population;
    const inBand = (x: number, z: number): boolean => {
      const d = Math.hypot(x - this.viewer.x, z - this.viewer.z);
      return d >= pop2.spawnMinDistance - 30 && d <= pop2.despawnDistance * 0.9 + 30;
    };
    this.nearbyBlocks = this.layout.blocks.filter((block) =>
      inBand((block.pad.minX + block.pad.maxX) / 2, (block.pad.minZ + block.pad.maxZ) / 2),
    );
    this.nearbyEdges = this.layout.graph.edges.filter((edge) =>
      inBand((edge.start.x + edge.end.x) / 2, (edge.start.z + edge.end.z) / 2),
    );

    // Each attempt picks a random spot, so a few misses per interval are normal.
    for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
      if (this.pedestrians.length < pop.pedestrians) {
        this.trySpawnPedestrian();
      }
      if (this.countSpawnedTraffic() < pop.traffic) {
        this.trySpawnTraffic();
      }
    }
  }

  private countSpawnedTraffic(): number {
    return this.vehicles.filter((v) => v.route).length;
  }

  private distanceToViewer(p: Vec3): number {
    return Math.hypot(p.x - this.viewer.x, p.z - this.viewer.z);
  }

  /** A spawn spot is valid when it is far enough away and outside the camera's view. */
  private isSpawnSpotValid(x: number, z: number): boolean {
    const dx = x - this.viewer.x;
    const dz = z - this.viewer.z;
    const distance = Math.hypot(dx, dz);
    const pop = this.config.population;
    if (distance < pop.spawnMinDistance || distance > pop.despawnDistance * 0.9) {
      return false;
    }
    const facing = (dx * this.viewerForward.x + dz * this.viewerForward.z) / distance;
    return facing < SPAWN_VIEW_DOT;
  }

  private trySpawnPedestrian(): void {
    if (this.nearbyBlocks.length === 0) {
      return;
    }
    const block = this.rng.pick(this.nearbyBlocks);
    const perimeter =
      2 * (block.walkway.maxX - block.walkway.minX + block.walkway.maxZ - block.walkway.minZ);
    // Check the same spot the walker will start on.
    const progress = this.rng.range(0, perimeter);
    const spot = perimeterPoint(block.walkway, progress, new Vec3());
    if (!this.isSpawnSpotValid(spot.x, spot.z)) {
      return;
    }
    const variant = this.rng.int(0, PEDESTRIAN_VARIANTS - 1);
    this.pedestrians.push(
      new Pedestrian(block.walkway, progress, this.config.population.pedestrianSpeed, variant),
    );
  }

  private trySpawnTraffic(): void {
    if (this.nearbyEdges.length === 0) {
      return;
    }
    const edge: RoadEdge = this.rng.pick(this.nearbyEdges);
    const t = this.rng.range(0.1, 0.9);
    const x = edge.start.x + (edge.end.x - edge.start.x) * t;
    const z = edge.start.z + (edge.end.z - edge.start.z) * t;
    if (!this.isSpawnSpotValid(x, z)) {
      return;
    }
    const model = pickWeighted(this.config.vehicles.types, this.rng);
    const color: Rgb = this.rng.pick(model.bodyColors);
    const car = new Vehicle(model, new Vec3(x, 0, z), edge.heading, color);
    car.route = { edge };
    if (overlapsAnything(car, this.vehicles, this.collision)) {
      return;
    }
    this.vehicles.push(car);
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
    if (!overlapsAnything(car, parked, statics)) {
      parked.push(car);
    }
  }
  return parked;
}

/** True when `car` overlaps the world or any car in `others`. */
function overlapsAnything(
  car: Vehicle,
  others: readonly Vehicle[],
  statics: CollisionWorld,
): boolean {
  const separation: Separation = { nx: 0, nz: 0, depth: 0 };
  const hitsWorld = statics
    .query(car.bounds())
    .some((wall) => separateObbFromAabb(car.shape, wall, separation));
  const hitsCar = others.some((other) => separateObbFromObb(car.shape, other.shape, separation));
  return hitsWorld || hitsCar;
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
