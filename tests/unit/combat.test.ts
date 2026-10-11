import { describe, expect, it } from 'vitest';
import type { ControlState } from '../../src/core/controls';
import { loadGameConfig } from '../../src/data/load-config';
import { DEFAULT_WEAPONS_CONFIG } from '../../src/data/weapons.config';
import { World } from '../../src/game/world';
import { Pedestrian } from '../../src/entities/pedestrian';
import { Vec3 } from '../../src/math/vec3';
import { CollisionWorld } from '../../src/world/collision-world';
import { falloffDamage, fireHitscan, meleeTargets } from '../../src/systems/combat';

const config = loadGameConfig();
const WALK = { minX: 0, minZ: 0, maxX: 40, maxZ: 40 };
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

describe('combat', () => {
  it('reduces pistol damage with distance and caps the reduction at half', () => {
    expect(falloffDamage(25, 0, 150)).toBeCloseTo(25, 9);
    expect(falloffDamage(25, 150, 150)).toBeCloseTo(12.5, 9);
    expect(falloffDamage(25, 400, 150)).toBeCloseTo(12.5, 9);
  });

  it('melee reaches only people inside the cone in front', () => {
    const ahead = new Pedestrian(WALK, 0, 0, 0, 30);
    ahead.position.set(0, 0, 1);
    const behind = new Pedestrian(WALK, 0, 0, 0, 30);
    behind.position.set(0, 0, -1);
    const far = new Pedestrian(WALK, 0, 0, 0, 30);
    far.position.set(0, 0, 10);
    const hits = meleeTargets(new Vec3(0, 0, 0), 0, DEFAULT_WEAPONS_CONFIG.melee, [
      ahead,
      behind,
      far,
    ]);
    expect(hits).toEqual([ahead]);
  });

  it('hitscan strikes the first pedestrian along the aim and not one behind a wall', () => {
    const shooter = new Vec3(0, 1.0, 0);
    const target = new Pedestrian(WALK, 0, 0, 0, 30);
    target.position.set(0, 0, 20);
    const shot = fireHitscan(
      shooter,
      new Vec3(0, 0, 1),
      DEFAULT_WEAPONS_CONFIG.pistol,
      new CollisionWorld([]),
      [target],
      [],
      null,
    );
    expect(shot.target).toBe(target);
    expect(target.health).toBeLessThan(30);

    const walled = new CollisionWorld([]);
    const hidden = new Pedestrian(WALK, 0, 0, 0, 30);
    hidden.position.set(0, 0, 20);
    const blocked = new CollisionWorld([
      { min: new Vec3(-1, 0, 5), max: new Vec3(1, 5, 6) } as never,
    ]);
    const miss = fireHitscan(
      shooter,
      new Vec3(0, 0, 1),
      DEFAULT_WEAPONS_CONFIG.pistol,
      blocked,
      [hidden],
      [],
      null,
    );
    expect(miss.target).toBeNull();
    expect(hidden.health).toBe(30);
    void walled;
  });

  it('death costs cash, then the player wakes at the hospital at full health', () => {
    const world = new World(config);
    world.player.health = 0;
    world.step(1 / 60, IDLE);
    expect(world.player.alive).toBe(false);
    const cash = world.cash;
    for (let i = 0; i < 60 * (config.weapons.respawnDelay + 0.5); i++) {
      world.step(1 / 60, IDLE);
    }
    expect(world.player.alive).toBe(true);
    expect(world.player.health).toBe(100);
    expect(world.cash).toBe(Math.floor(cash * (1 - config.weapons.deathCashPenalty)));
    expect(
      Math.hypot(
        world.player.position.x - world.hospital.x,
        world.player.position.z - world.hospital.z,
      ),
    ).toBeLessThan(1e-6);
  });
});
