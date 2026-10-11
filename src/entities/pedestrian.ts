import { Aabb } from '../math/aabb';
import type { Rect } from '../math/rect';
import { Vec3 } from '../math/vec3';
import type { CollisionWorld } from '../world/collision-world';
import { Entity } from './entity';

const FLEE_SPEED = 5;
const FLEE_DURATION = 4;
const SAFE_DISTANCE = 0.4;

/** A person who walks the sidewalk loop around one block, and runs when threatened. */
export class Pedestrian extends Entity {
  readonly walkway: Rect;
  readonly perimeter: number;
  readonly speed: number;
  /** Index into the figure palettes, so the crowd is not uniform. */
  readonly variant: number;
  progress: number;
  fleeTimer = 0;
  fleeX = 0;
  fleeZ = 0;

  constructor(walkway: Rect, progress: number, speed: number, variant: number, health: number) {
    super();
    this.health = health;
    this.walkway = walkway;
    this.perimeter = 2 * (walkway.maxX - walkway.minX + walkway.maxZ - walkway.minZ);
    this.progress = progress;
    this.speed = speed;
    this.variant = variant;
    perimeterPoint(walkway, progress, this.position);
    this.previousPosition.copy(this.position);
  }

  get fleeing(): boolean {
    return this.fleeTimer > 0;
  }

  /** Runs directly away from a point for a few seconds. */
  startFleeing(fromX: number, fromZ: number): void {
    const dx = this.position.x - fromX;
    const dz = this.position.z - fromZ;
    const length = Math.hypot(dx, dz) || 1;
    this.fleeX = dx / length;
    this.fleeZ = dz / length;
    this.fleeTimer = FLEE_DURATION;
  }
}

/** Point on the rectangle's perimeter, measured counter-clockwise from its south-west corner. */
export function perimeterPoint(rect: Rect, distance: number, out: Vec3): Vec3 {
  const width = rect.maxX - rect.minX;
  const depth = rect.maxZ - rect.minZ;
  let d = distance;
  if (d < width) {
    return out.set(rect.minX + d, 0, rect.minZ);
  }
  d -= width;
  if (d < depth) {
    return out.set(rect.maxX, 0, rect.minZ + d);
  }
  d -= depth;
  if (d < width) {
    return out.set(rect.maxX - d, 0, rect.maxZ);
  }
  d -= width;
  return out.set(rect.minX, 0, rect.maxZ - d);
}

/**
 * Advances one walker by a step. Walkers follow their sidewalk loop. While fleeing they run
 * straight away from the threat and stop short of any building.
 */
export function stepPedestrian(walker: Pedestrian, dt: number, collision: CollisionWorld): void {
  walker.beginStep();
  const from = walker.position.clone();
  if (walker.fleeTimer > 0) {
    walker.fleeTimer = Math.max(0, walker.fleeTimer - dt);
    const step = FLEE_SPEED * dt;
    const next = new Vec3(
      walker.position.x + walker.fleeX * step,
      0,
      walker.position.z + walker.fleeZ * step,
    );
    const blocked = collision.overlapsAny(
      new Aabb(
        next.x - SAFE_DISTANCE,
        0,
        next.z - SAFE_DISTANCE,
        next.x + SAFE_DISTANCE,
        1.8,
        next.z + SAFE_DISTANCE,
      ),
    );
    if (blocked) {
      walker.fleeTimer = 0;
    } else {
      walker.position.copy(next);
    }
  } else {
    walker.progress = (walker.progress + walker.speed * dt) % walker.perimeter;
    perimeterPoint(walker.walkway, walker.progress, walker.position);
  }
  const dx = walker.position.x - from.x;
  const dz = walker.position.z - from.z;
  if (Math.hypot(dx, dz) > 1e-6) {
    walker.heading = Math.atan2(dx, dz);
  }
}
