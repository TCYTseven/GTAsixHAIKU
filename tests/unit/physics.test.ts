import { describe, expect, it } from 'vitest';
import { Aabb } from '../../src/math/aabb';
import { Vec3 } from '../../src/math/vec3';
import { integrateBody, type PhysicsBody } from '../../src/systems/physics';
import { CollisionWorld } from '../../src/world/collision-world';

const CONFIG = { gravity: 20, stepHeight: 0.4, maxFallSpeed: 40 };
const DT = 1 / 60;
const HALF_WIDTH = 0.35;
const HEIGHT = 1.8;

function makeBody(x: number, y: number, z: number, grounded = false): PhysicsBody {
  return {
    position: new Vec3(x, y, z),
    velocity: new Vec3(),
    halfWidth: HALF_WIDTH,
    height: HEIGHT,
    grounded,
  };
}

function run(body: PhysicsBody, world: CollisionWorld, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += DT) {
    integrateBody(body, world, DT, CONFIG);
  }
}

function bodyOverlapsWorld(body: PhysicsBody, world: CollisionWorld): boolean {
  const { x, y, z } = body.position;
  return world.overlapsAny(
    new Aabb(
      x - body.halfWidth,
      y,
      z - body.halfWidth,
      x + body.halfWidth,
      y + body.height,
      z + body.halfWidth,
    ),
  );
}

describe('integrateBody', () => {
  it('stops flush against a wall it walks into', () => {
    const world = new CollisionWorld([new Aabb(5, 0, -10, 6, 5, 10)]);
    const body = makeBody(0, 0, 0, true);
    body.velocity.x = 4;

    run(body, world, 2);

    expect(body.position.x).toBeCloseTo(5 - HALF_WIDTH, 2);
    expect(bodyOverlapsWorld(body, world)).toBe(false);
  });

  it('climbs a ledge no taller than the step height without jumping', () => {
    const world = new CollisionWorld([new Aabb(5, 0, -10, 10, 0.15, 10)]);
    const body = makeBody(0, 0, 0, true);
    body.velocity.x = 3;

    run(body, world, 2.5);

    expect(body.position.y).toBeCloseTo(0.15, 3);
    expect(body.position.x).toBeGreaterThan(5);
    expect(body.grounded).toBe(true);
  });

  it('does not climb a block taller than the step height', () => {
    const world = new CollisionWorld([new Aabb(5, 0, -10, 6, 1, 10)]);
    const body = makeBody(0, 0, 0, true);
    body.velocity.x = 3;

    run(body, world, 2);

    expect(body.position.y).toBeCloseTo(0, 3);
    expect(body.position.x).toBeCloseTo(5 - HALF_WIDTH, 2);
  });

  it('clears and lands on top of a block after a jump', () => {
    const world = new CollisionWorld([new Aabb(-1, 0, -5, 1, 0.8, 5)]);
    // Airborne at the start of the jump, so the body cannot climb the block as a ledge.
    const body = makeBody(-2, 0, 0, false);
    body.velocity.y = 6.5;
    body.velocity.x = 3;

    run(body, world, 0.6);

    expect(body.position.y).toBeCloseTo(0.8, 3);
    expect(body.grounded).toBe(true);
  });

  it('falls onto the ground and comes to rest there', () => {
    const body = makeBody(0, 10, 0);

    run(body, new CollisionWorld([]), 2);

    expect(body.position.y).toBeCloseTo(0, 6);
    expect(body.grounded).toBe(true);
    expect(body.velocity.y).toBe(0);
  });

  it('walks down off a curb without bouncing', () => {
    const world = new CollisionWorld([new Aabb(-10, 0, -10, 1, 0.15, 10)]);
    const body = makeBody(0, 0.15, 0, true);
    body.velocity.x = 2;

    run(body, world, 1.5);

    expect(body.position.x).toBeGreaterThan(1);
    expect(body.position.y).toBeCloseTo(0, 6);
    expect(body.grounded).toBe(true);
  });
});
