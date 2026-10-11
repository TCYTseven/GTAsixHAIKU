import { Aabb } from '../math/aabb';
import type { Vec3 } from '../math/vec3';
import type { SolidQuery } from '../world/solids';

const EPSILON = 1e-4;
const MAX_PUSH_PASSES = 8;
const scratchHits: Aabb[] = [];

/** A box-shaped body that moves through the static world. */
export interface PhysicsBody {
  /** Center of the feet. */
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly halfWidth: number;
  readonly height: number;
  grounded: boolean;
}

export interface BodyPhysicsConfig {
  readonly gravity: number;
  /** Tallest ledge the body climbs without jumping. */
  readonly stepHeight: number;
  readonly maxFallSpeed: number;
}

/**
 * Moves a box-shaped body by one fixed step. Horizontal motion runs first, X then Z, and climbs
 * ledges up to `stepHeight` when grounded. Then gravity and vertical motion run. Last, a ground
 * probe snaps the body onto any support within `stepHeight`, so walking down curbs stays smooth.
 */
export function integrateBody(
  body: PhysicsBody,
  world: SolidQuery,
  dt: number,
  config: BodyPhysicsConfig,
): void {
  moveHorizontal(body, world, 'x', body.velocity.x * dt, config.stepHeight);
  moveHorizontal(body, world, 'z', body.velocity.z * dt, config.stepHeight);

  body.velocity.y = Math.max(-config.maxFallSpeed, body.velocity.y - config.gravity * dt);
  body.position.y += body.velocity.y * dt;
  resolveVertical(body, world);

  const support = supportHeight(body, world, config.stepHeight);
  const gap = body.position.y - support;
  if (body.velocity.y <= 0 && gap <= config.stepHeight) {
    body.position.y = support;
    body.velocity.y = 0;
    body.grounded = true;
  } else {
    body.grounded = false;
  }
}

function bodyRegion(body: PhysicsBody, footY: number): Aabb {
  const { x, z } = body.position;
  const hw = body.halfWidth;
  return new Aabb(x - hw, footY, z - hw, x + hw, footY + body.height, z + hw);
}

function moveHorizontal(
  body: PhysicsBody,
  world: SolidQuery,
  axis: 'x' | 'z',
  delta: number,
  stepHeight: number,
): void {
  if (delta === 0) {
    return;
  }
  const position = body.position;
  position[axis] += delta;

  for (let pass = 0; pass < MAX_PUSH_PASSES; pass++) {
    const hit = firstOverlap(body, world, position.y);
    if (!hit) {
      return;
    }
    // Climb a low ledge when grounded and the space above it is clear.
    const top = hit.max.y;
    if (
      body.grounded &&
      top - position.y <= stepHeight &&
      !world.overlapsAny(bodyRegion(body, top))
    ) {
      position.y = top;
      continue;
    }
    // Otherwise stop flush against the face we ran into.
    if (delta > 0) {
      position[axis] = (axis === 'x' ? hit.min.x : hit.min.z) - body.halfWidth - EPSILON;
    } else {
      position[axis] = (axis === 'x' ? hit.max.x : hit.max.z) + body.halfWidth + EPSILON;
    }
    body.velocity[axis] = 0;
  }
}

function resolveVertical(body: PhysicsBody, world: SolidQuery): void {
  const hits = world.query(bodyRegion(body, body.position.y), scratchHits);
  if (hits.length > 0) {
    if (body.velocity.y <= 0) {
      // Landing: rest on the highest surface we are now overlapping.
      let top = -Infinity;
      for (const hit of hits) {
        top = Math.max(top, hit.max.y);
      }
      body.position.y = top;
      body.velocity.y = 0;
    } else {
      // Head bump: stop just below the lowest ceiling we are overlapping.
      let bottom = Infinity;
      for (const hit of hits) {
        bottom = Math.min(bottom, hit.min.y);
      }
      body.position.y = bottom - body.height;
      body.velocity.y = 0;
    }
  }
  // `hits` is the shared scratch array, so clear it only after it has been read.
  scratchHits.length = 0;
}

function firstOverlap(body: PhysicsBody, world: SolidQuery, footY: number): Aabb | null {
  const hits = world.query(bodyRegion(body, footY), scratchHits);
  const first = hits[0] ?? null;
  scratchHits.length = 0;
  return first;
}

/** Highest surface at or below the feet, within reach. Flat ground is at y = 0. */
function supportHeight(body: PhysicsBody, world: SolidQuery, stepHeight: number): number {
  const feet = body.position.y;
  const { x, z } = body.position;
  const hw = body.halfWidth;
  const probe = new Aabb(
    x - hw,
    feet - stepHeight - EPSILON,
    z - hw,
    x + hw,
    feet + EPSILON,
    z + hw,
  );
  let top = 0;
  for (const box of world.query(probe, scratchHits)) {
    if (box.max.y <= feet + EPSILON && box.max.y > top) {
      top = box.max.y;
    }
  }
  scratchHits.length = 0;
  return top;
}
