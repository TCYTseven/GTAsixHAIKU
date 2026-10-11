import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { DEFAULT_VEHICLES_CONFIG } from '../../src/data/vehicles.config';
import { Vehicle } from '../../src/entities/vehicle';
import { Vec3 } from '../../src/math/vec3';
import { stepTraffic, type TrafficContext } from '../../src/systems/traffic';
import { generateCity } from '../../src/world/city-generator';
import { CollisionWorld } from '../../src/world/collision-world';
import { DEFAULT_CITY_CONFIG } from '../../src/data/city.config';

const DT = 1 / 60;
const layout = generateCity({ ...DEFAULT_CITY_CONFIG, blocksPerSide: 4 });
const SEDAN = DEFAULT_VEHICLES_CONFIG.types[0];

function context(time: number, vehicles: Vehicle[]): TrafficContext {
  return {
    graph: layout.graph,
    statics: new CollisionWorld([]),
    vehicles,
    time,
    rng: createRng(5),
    cruiseFactor: 0.6,
  };
}

describe('traffic', () => {
  it('follows its lane and keeps moving along the road grid', () => {
    const edge = layout.graph.edges.find((e) => e.lane === 0 && Math.abs(e.end.x - e.start.x) > 0)!;
    const car = new Vehicle(
      SEDAN,
      new Vec3(edge.start.x, 0, edge.start.z),
      edge.heading,
      [1, 1, 1],
    );
    car.route = { edge };
    const cars = [car];
    const impacts: never[] = [];
    for (let step = 0; step < 60 * 20; step++) {
      car.beginStep();
      stepTraffic(car, DT, context(0, cars), impacts);
    }
    expect(car.forwardSpeed).toBeGreaterThan(5);
    expect(Math.abs(car.position.x) + Math.abs(car.position.z)).toBeGreaterThan(50);
  });

  it('brakes to stop short of a red light', () => {
    // Pick a lane that approaches an intersection from the east-west direction.
    const edge = layout.graph.edges.find(
      (e) => e.lane === 0 && Math.abs(e.end.x - e.start.x) > 0 && e.end.x === e.start.x + 60,
    )!;
    const car = new Vehicle(
      SEDAN,
      new Vec3(edge.end.x - 30, 0, edge.end.z - 0.0),
      edge.heading,
      [1, 1, 1],
    );
    car.route = { edge };
    car.velocity.set(10, 0, 0);
    car.forwardSpeed = 10;
    // Time 0 is the start of a green east-west phase, so pick a time when east-west is red.
    const redTime = 12;
    const cars = [car];
    const impacts: never[] = [];
    // Two and a half seconds is enough to brake from 10 m/s and reach the stop line.
    for (let step = 0; step < 60 * 2.5; step++) {
      car.beginStep();
      stepTraffic(car, DT, context(redTime, cars), impacts);
    }
    expect(car.forwardSpeed).toBeLessThan(1.5);
    expect(car.position.x).toBeLessThan(edge.end.x);
  });
});
