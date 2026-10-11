import type { ControlState } from '../core/controls';
import { EventBus } from '../core/event-bus';
import { createRng, type Rng } from '../core/rng';
import type { GameConfig } from '../data/load-config';
import type { VehicleConfig } from '../data/schemas';
import { Pedestrian, perimeterPoint, stepPedestrian } from '../entities/pedestrian';
const SIGHT_RANGE = 60;
const POLICE_SPAWN_MIN = 90;
const POLICE_SPAWN_MAX = 130;
const POLICE_DESPAWN_DISTANCE = 200;
const POLICE_SPAWN_INTERVAL = 1.5;
const POLICE_PAINT: Rgb = [0.12, 0.22, 0.55];
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
import { WantedState, POLICE_BY_LEVEL } from '../systems/wanted';
import {
  advanceMission,
  currentObjective,
  type ActiveMission,
  type ResolvedStep,
} from '../systems/missions';
import type { MissionConfig } from '../data/schemas';
const START_RANGE = 3;
import { stepPolice, type PoliceUnit } from '../systems/police';
import { fireHitscan, meleeTargets } from '../systems/combat';

export interface Pickup {
  readonly position: Vec3;
  readonly kind: 'cash';
  readonly amount: number;
}

const PICKUP_RANGE = 1.5;
const PICKUP_COUNT = 14;
const PICKUP_CASH = 50;
const CAR_STRIKE_SPEED = 6;
const WALKER_MARGIN = 0.4;
const HOSPITAL_BLOCK = { col: 12, row: 4 };
const FULL_HEALTH = 100;
const MAGAZINE_FULL = 12;

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
  /** Cash on hand, in dollars. */
  cash: number;
  ammo = MAGAZINE_FULL;
  reserve: number;
  readonly pickups: Pickup[] = [];
  readonly hospital: Vec3;
  readonly wanted = new WantedState();
  readonly missionsDone = new Set<string>();
  activeMission: ActiveMission | null = null;
  readonly police: PoliceUnit[] = [];
  private readonly lastSeen = new Vec3();
  private policeSpawnTimer = 0;
  private fireCooldown = 0;
  private meleeCooldown = 0;
  private reloadTimer = 0;
  private respawnTimer = 0;

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
    this.cash = config.weapons.startingCash;
    this.reserve = config.weapons.pistol.reserveAmmo;
    this.ammo = config.weapons.pistol.magazine;
    for (let i = 0; i < PICKUP_COUNT; i++) {
      const block = this.rng.pick(this.layout.blocks);
      const perimeter =
        2 * (block.walkway.maxX - block.walkway.minX + block.walkway.maxZ - block.walkway.minZ);
      const position = perimeterPoint(block.walkway, this.rng.range(0, perimeter), new Vec3());
      this.pickups.push({ position, kind: 'cash', amount: PICKUP_CASH });
    }
    const hospitalBlock =
      this.layout.blocks.find(
        (block) => block.col === HOSPITAL_BLOCK.col && block.row === HOSPITAL_BLOCK.row,
      ) ?? this.layout.blocks[0];
    this.hospital = perimeterPoint(hospitalBlock.walkway, 0, new Vec3());
    this.lastSeen.copy(spawn);
    this.events.on('pedestrianKilled', () => {
      const step = currentObjective(this.activeMission);
      if (this.activeMission && step?.kind === 'eliminate') this.activeMission.kills += 1;
    });
    this.events.on('pedestrianKilled', ({ cause }) => {
      if (cause !== 'vehicle' || this.player.vehicle) this.wanted.add(2);
    });
    this.events.on('vehicleImpact', ({ vehicle, speed }) => {
      if (vehicle === this.player.vehicle && speed > 12) this.wanted.add(1);
    });
    this.events.on('shotFired', () => {
      if (this.policeWithin(40)) this.wanted.add(1);
    });
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
    if (controls.interact && this.player.alive && !this.tryStartMission()) {
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
    this.updateCombat(controls, dt);
    this.updatePolice(dt);
    this.updateMissions();

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
    } else if (this.player.alive) {
      stepOnFoot(this.player, controls, dt, this.solids);
    }
    this.publishImpacts();
    this.updateSurvival(dt);
    this.maintainPopulation(dt);
  }

  /** Corner of a block's sidewalk loop, in world coordinates. */
  resolveMarker(marker: MissionConfig['start']): { x: number; z: number } {
    const block =
      this.layout.blocks.find((b) => b.col === marker.block[0] && b.row === marker.block[1]) ??
      this.layout.blocks[0];
    const w = block.walkway;
    const east = marker.corner === 'ne' || marker.corner === 'se';
    const north = marker.corner === 'nw' || marker.corner === 'ne';
    return { x: east ? w.maxX : w.minX, z: north ? w.maxZ : w.minZ };
  }

  /** Missions not yet finished, with their start points, for the minimap. */
  get availableMissionStarts(): { x: number; z: number }[] {
    if (this.activeMission) return [];
    return this.config.missions.missions
      .filter((m) => !this.missionsDone.has(m.id))
      .map((m) => this.resolveMarker(m.start));
  }

  /** The instruction the player should follow right now, or null. */
  get objective(): ResolvedStep | null {
    return currentObjective(this.activeMission);
  }

  /** Starts the first unfinished mission whose start point is in reach. Returns true if one started. */
  private tryStartMission(): boolean {
    if (this.activeMission || this.player.vehicle) return false;
    for (const mission of this.config.missions.missions) {
      if (this.missionsDone.has(mission.id)) continue;
      const start = this.resolveMarker(mission.start);
      if (
        Math.hypot(start.x - this.player.position.x, start.z - this.player.position.z) > START_RANGE
      )
        continue;
      this.activeMission = {
        id: mission.id,
        title: mission.title,
        reward: mission.reward,
        steps: mission.steps.map((step) => {
          if (step.type === 'eliminate')
            return { kind: 'eliminate', text: step.text, x: 0, z: 0, radius: 0, count: step.count };
          const at = this.resolveMarker(step.marker);
          return {
            kind: step.type,
            text: step.text,
            x: at.x,
            z: at.z,
            radius: step.radius,
            count: 0,
          };
        }),
        index: 0,
        kills: 0,
      };
      return true;
    }
    return false;
  }

  private updateMissions(): void {
    const mission = this.activeMission;
    if (!mission || !this.player.alive) return;
    const done = advanceMission(mission, {
      x: this.player.position.x,
      z: this.player.position.z,
      inCar: this.player.vehicle !== null,
    });
    if (!done) return;
    this.cash += mission.reward;
    this.missionsDone.add(mission.id);
    this.activeMission = null;
    this.events.emit('missionCompleted', { title: mission.title, reward: mission.reward });
  }

  private isPolice(car: Vehicle): boolean {
    return this.police.some((unit) => unit.car === car);
  }

  private policeWithin(range: number): boolean {
    return this.police.some(
      (unit) =>
        Math.hypot(
          unit.car.position.x - this.player.position.x,
          unit.car.position.z - this.player.position.z,
        ) < range,
    );
  }

  /** Police see the player through a clear line, chase them, search where they were last seen, and patrol otherwise. */
  private updatePolice(dt: number): void {
    const player = this.player;
    const target = player.vehicle ? player.vehicle.position : player.position;
    let sees = false;
    if (player.alive) {
      for (const unit of this.police) {
        const car = unit.car;
        const dx = target.x - car.position.x;
        const dz = target.z - car.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance > SIGHT_RANGE) continue;
        const origin = new Vec3(car.position.x, 1.2, car.position.z);
        const direction = new Vec3(dx, target.y + 1 - 1.2, dz).normalize();
        if (this.collision.raycast(origin, direction, distance) === null) {
          sees = true;
          break;
        }
      }
    }
    if (sees) this.lastSeen.copy(target);
    this.wanted.update(dt, sees);

    this.policeSpawnTimer -= dt;
    const wanted = POLICE_BY_LEVEL[this.wanted.level] ?? 0;
    if (this.police.length < wanted && this.policeSpawnTimer <= 0) {
      this.policeSpawnTimer = POLICE_SPAWN_INTERVAL;
      this.trySpawnPolice();
    }
    for (let i = this.police.length - 1; i >= 0; i--) {
      const unit = this.police[i];
      const far = this.distanceToViewer(unit.car.position) > POLICE_DESPAWN_DISTANCE;
      const surplus = this.police.length > wanted && unit.mode === 'patrol';
      if (far || surplus || unit.car.health <= 0) {
        if (unit.car.health <= 0) this.wanted.add(3);
        this.police.splice(i, 1);
        this.vehicles.splice(this.vehicles.indexOf(unit.car), 1);
      }
    }

    for (const unit of this.police) {
      unit.mode = sees ? 'pursue' : this.wanted.level > 0 ? 'search' : 'patrol';
      unit.car.beginStep();
      const goal = unit.mode === 'search' ? this.lastSeen : unit.target;
      if (unit.mode === 'search') unit.target.copy(goal);
      stepPolice(
        unit,
        dt,
        target,
        {
          graph: this.layout.graph,
          statics: this.collision,
          vehicles: this.vehicles,
          rng: this.rng,
        },
        this.impacts,
      );
    }
  }

  private trySpawnPolice(): void {
    const edges = this.layout.graph.edges.filter((edge) => {
      const d = this.distanceToViewer(edge.start);
      return d >= POLICE_SPAWN_MIN && d <= POLICE_SPAWN_MAX;
    });
    if (edges.length === 0) return;
    const edge = this.rng.pick(edges);
    const model = this.config.vehicles.types[0];
    const car = new Vehicle(
      model,
      new Vec3(edge.start.x, 0, edge.start.z),
      edge.heading,
      POLICE_PAINT,
    );
    if (overlapsAnything(car, this.vehicles, this.collision)) return;
    this.vehicles.push(car);
    this.police.push({
      car,
      mode: 'search',
      target: new Vec3(edge.end.x, 0, edge.end.z),
      stuckTimer: 0,
    });
  }

  /** Shots and melee, car strikes on people, and cash pickups for one step. */
  private updateCombat(controls: ControlState, dt: number): void {
    const weapons = this.config.weapons;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.reloadTimer = Math.max(0, this.reloadTimer - dt);
    if (this.player.alive && !this.player.vehicle) {
      if (controls.reload) {
        this.startReload();
      }
      if (controls.melee && this.meleeCooldown <= 0) {
        this.meleeCooldown = weapons.melee.cooldown;
        for (const walker of meleeTargets(
          this.player.position,
          this.player.heading,
          weapons.melee,
          this.pedestrians,
        )) {
          this.hurtPedestrian(walker, weapons.melee.damage, 'melee');
        }
      }
      if (controls.fire && this.fireCooldown <= 0 && this.reloadTimer <= 0) {
        this.shoot(controls.aim);
      }
    }
    this.strikeWithCars();
    this.collectPickups();
    this.pruneDeadPedestrians();
  }

  private shoot(aim: readonly [number, number, number]): void {
    const pistol = this.config.weapons.pistol;
    if (this.ammo <= 0) {
      this.startReload();
      return;
    }
    this.ammo -= 1;
    this.fireCooldown = 1 / pistol.fireRate;
    const origin = new Vec3(
      this.player.position.x,
      this.player.position.y + 1.5,
      this.player.position.z,
    );
    const direction = new Vec3(aim[0], aim[1], aim[2]).normalize();
    const shot = fireHitscan(
      origin,
      direction,
      pistol,
      this.collision,
      this.pedestrians,
      this.vehicles,
      null,
    );
    const near = this.pedestrians.some(
      (walker) =>
        walker.alive && Math.hypot(walker.position.x - origin.x, walker.position.z - origin.z) < 30,
    );
    this.events.emit('shotFired', { near });
    if (shot.target instanceof Pedestrian && shot.target.health <= 0) {
      this.killPedestrian(shot.target, 'gunfire');
    }
  }

  private startReload(): void {
    const pistol = this.config.weapons.pistol;
    if (this.reloadTimer > 0 || this.ammo >= pistol.magazine || this.reserve <= 0) {
      return;
    }
    const take = Math.min(pistol.magazine - this.ammo, this.reserve);
    this.ammo += take;
    this.reserve -= take;
    this.reloadTimer = pistol.reloadTime;
  }

  private hurtPedestrian(walker: Pedestrian, damage: number, cause: 'melee'): void {
    walker.health -= damage;
    walker.startFleeing(this.player.position.x, this.player.position.z);
    if (walker.health <= 0) {
      this.killPedestrian(walker, cause);
    }
  }

  private killPedestrian(walker: Pedestrian, cause: 'melee' | 'gunfire' | 'vehicle'): void {
    if (!walker.alive) {
      return;
    }
    walker.alive = false;
    this.events.emit('pedestrianKilled', { pedestrian: walker, cause });
  }

  /** Any car moving fast enough knocks down people it reaches. */
  private strikeWithCars(): void {
    for (const car of this.vehicles) {
      if (Math.abs(car.forwardSpeed) < CAR_STRIKE_SPEED) {
        continue;
      }
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      for (const walker of this.pedestrians) {
        if (!walker.alive) {
          continue;
        }
        const dx = walker.position.x - car.position.x;
        const dz = walker.position.z - car.position.z;
        const localRight = -fz * dx + fx * dz;
        const localForward = fx * dx + fz * dz;
        if (
          Math.abs(localRight) <= car.halfWidth + WALKER_MARGIN &&
          Math.abs(localForward) <= car.halfLength + WALKER_MARGIN
        ) {
          walker.health = 0;
          this.killPedestrian(walker, 'vehicle');
        }
      }
    }
  }

  private collectPickups(): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      const distance = Math.hypot(
        pickup.position.x - this.player.position.x,
        pickup.position.z - this.player.position.z,
      );
      if (distance <= PICKUP_RANGE) {
        this.cash += pickup.amount;
        this.pickups.splice(i, 1);
      }
    }
  }

  private pruneDeadPedestrians(): void {
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      if (!this.pedestrians[i].alive) {
        this.pedestrians.splice(i, 1);
      }
    }
  }

  /** Death costs cash and a short wait, then the player wakes up at the hospital. */
  private updateSurvival(dt: number): void {
    const player = this.player;
    if (player.alive && player.health <= 0) {
      player.alive = false;
      this.respawnTimer = this.config.weapons.respawnDelay;
      if (player.vehicle) {
        player.vehicle.occupied = false;
        player.vehicle.velocity.set(0, 0, 0);
        player.vehicle = null;
      }
      this.events.emit('playerDied', {});
    }
    if (!player.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
    }
  }

  private respawn(): void {
    const player = this.player;
    this.cash = Math.floor(this.cash * (1 - this.config.weapons.deathCashPenalty));
    player.position.copy(this.hospital);
    player.previousPosition.copy(this.hospital);
    player.velocity.set(0, 0, 0);
    player.grounded = true;
    player.health = FULL_HEALTH;
    player.alive = true;
    this.wanted.clear();
    this.activeMission = null;
    this.events.emit('playerRespawned', {});
  }

  /** The nearest parked car the player could climb into right now, or null. */
  nearestEnterableVehicle(): Vehicle | null {
    let best: Vehicle | null = null;
    let bestDistance = ENTER_RANGE;
    for (const vehicle of this.vehicles) {
      if (vehicle.occupied || vehicle.route || this.isPolice(vehicle)) {
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
      new Pedestrian(
        block.walkway,
        progress,
        this.config.population.pedestrianSpeed,
        variant,
        this.config.population.pedestrianHealth,
      ),
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
