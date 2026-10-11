import type { WeaponsConfig } from '../data/schemas';
import { intersectAabbRay } from '../math/ray';
import type { Vec3 } from '../math/vec3';
import { Pedestrian } from '../entities/pedestrian';
import { Vehicle } from '../entities/vehicle';
import type { CollisionWorld } from '../world/collision-world';

type PistolConfig = WeaponsConfig['pistol'];
type MeleeConfig = WeaponsConfig['melee'];

const PEDESTRIAN_RADIUS = 0.45;
const PEDESTRIAN_CHEST = 1.0;
const VEHICLE_DAMAGE_SHARE = 0.5;

export interface GunShot {
  readonly end: { x: number; y: number; z: number };
  readonly target: Pedestrian | Vehicle | null;
}

/** Damage after distance falloff: full at the muzzle, half at `maxRange` and beyond. */
export function falloffDamage(base: number, distance: number, maxRange: number): number {
  return base * (1 - 0.5 * Math.min(1, distance / maxRange));
}

/**
 * Hitscan from `origin` along unit `direction`. The nearest of world geometry, a pedestrian's chest,
 * or a car takes the hit. Damage is applied immediately, and the returned end point is for drawing.
 */
export function fireHitscan(
  origin: Vec3,
  direction: Vec3,
  pistol: PistolConfig,
  collision: CollisionWorld,
  pedestrians: readonly Pedestrian[],
  vehicles: readonly Vehicle[],
  shooter: Vehicle | null,
): GunShot {
  let best = pistol.maxRange;
  let target: Pedestrian | Vehicle | null = null;

  const wallT = collision.raycast(origin, direction, pistol.maxRange);
  if (wallT !== null) {
    best = wallT;
  }

  for (const walker of pedestrians) {
    if (!walker.alive) {
      continue;
    }
    const t = raySphere(
      origin,
      direction,
      walker.position.x,
      walker.position.y + PEDESTRIAN_CHEST,
      walker.position.z,
      PEDESTRIAN_RADIUS,
    );
    if (t !== null && t < best) {
      best = t;
      target = walker;
    }
  }

  for (const car of vehicles) {
    if (car === shooter) {
      continue;
    }
    const t = intersectAabbRay(origin, direction, car.bounds(), best);
    if (t !== null && t < best) {
      best = t;
      target = car;
    }
  }

  const end = {
    x: origin.x + direction.x * best,
    y: origin.y + direction.y * best,
    z: origin.z + direction.z * best,
  };
  if (target instanceof Vehicle) {
    target.health = Math.max(0, target.health - pistol.damage * VEHICLE_DAMAGE_SHARE);
  } else if (target instanceof Pedestrian) {
    target.health = Math.max(
      0,
      target.health - falloffDamage(pistol.damage, best, pistol.maxRange),
    );
  }
  return { end, target };
}

/** Pedestrians inside the melee cone in front of the player, within range. */
export function meleeTargets(
  origin: Vec3,
  heading: number,
  melee: MeleeConfig,
  pedestrians: readonly Pedestrian[],
): Pedestrian[] {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const cosCone = Math.cos((melee.coneDegrees * Math.PI) / 180);
  return pedestrians.filter((walker) => {
    if (!walker.alive) {
      return false;
    }
    const dx = walker.position.x - origin.x;
    const dz = walker.position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance > melee.range || distance < 1e-6) {
      return distance <= melee.range;
    }
    return (fx * dx + fz * dz) / distance >= cosCone;
  });
}

/** Distance along a unit ray to a sphere, or null when it misses or the sphere is behind. */
function raySphere(
  origin: Vec3,
  direction: Vec3,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
): number | null {
  const ox = origin.x - cx;
  const oy = origin.y - cy;
  const oz = origin.z - cz;
  const b = ox * direction.x + oy * direction.y + oz * direction.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) {
    return null;
  }
  const root = Math.sqrt(discriminant);
  const near = -b - root;
  if (near >= 0) {
    return near;
  }
  return c <= 0 ? 0 : null;
}
