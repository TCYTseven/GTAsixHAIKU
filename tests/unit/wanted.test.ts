import { describe, expect, it } from 'vitest';
import { WantedState } from '../../src/systems/wanted';
import { loadGameConfig } from '../../src/data/load-config';
import { World } from '../../src/game/world';
import { Vec3 } from '../../src/math/vec3';
import { Vehicle } from '../../src/entities/vehicle';
import { stepPolice, type PoliceUnit } from '../../src/systems/police';
import { CollisionWorld } from '../../src/world/collision-world';
import { generateCity } from '../../src/world/city-generator';
import { createRng } from '../../src/core/rng';
import { DEFAULT_CITY_CONFIG } from '../../src/data/city.config';
import type { ControlState } from '../../src/core/controls';

const IDLE: ControlState = {
  moveForward: 0,
  moveRight: 0,
  sprint: false,
  jump: false,
  handbrake: false,
  interact: false,
  fire: false,
  melee: false,
  reload: false,
  aim: [0, 0, 1],
  cameraYaw: 0,
};
const config = loadGameConfig();

describe('wanted level', () => {
  it('maps heat to stars at the thresholds', () => {
    const wanted = new WantedState();
    wanted.add(1);
    expect(wanted.level).toBe(1);
    wanted.add(2);
    expect(wanted.level).toBe(2);
    wanted.add(20);
    expect(wanted.level).toBe(5);
  });

  it('decays only after police have lost sight for a while', () => {
    const wanted = new WantedState();
    wanted.add(3);
    wanted.update(30, true);
    expect(wanted.points).toBe(3);
    wanted.update(19, false);
    expect(wanted.points).toBe(3);
    wanted.update(10, false);
    expect(wanted.points).toBeLessThan(3);
  });
});

describe('police', () => {
  it('spawns police once the player has a wanted level', () => {
    const world = new World(config);
    world.wanted.add(6);
    for (let step = 0; step < 60 * 4; step++) world.step(1 / 60, IDLE);
    expect(world.police.length).toBeGreaterThan(0);
  });

  it('steers a pursuing unit toward the player on open ground', () => {
    const car = new Vehicle(config.vehicles.types[0], new Vec3(0, 0, 0), 0, [1, 1, 1]);
    const unit: PoliceUnit = { car, mode: 'pursue', target: new Vec3(), stuckTimer: 0 };
    const player = new Vec3(0, 0, 60);
    const graph = generateCity({ ...DEFAULT_CITY_CONFIG, blocksPerSide: 2 }).graph;
    const context = { graph, statics: new CollisionWorld([]), vehicles: [car], rng: createRng(1) };
    for (let step = 0; step < 60 * 6; step++) {
      car.beginStep();
      stepPolice(unit, 1 / 60, player, context, []);
    }
    expect(car.position.distanceTo(player)).toBeLessThan(40);
  });
});
