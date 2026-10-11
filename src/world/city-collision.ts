import { Aabb } from '../math/aabb';
import type { CityLayout } from './city-generator';
import { CollisionWorld } from './collision-world';

const WALL_THICKNESS = 20;
const WALL_HEIGHT = 120;

/**
 * Collision for the generated city: every block's raised pad, every building, and invisible walls
 * around the city limits. Roads stay open at y = 0.
 */
export function buildCityCollision(layout: CityLayout): CollisionWorld {
  const boxes: Aabb[] = [];
  const padTop = layout.sidewalkHeight;

  for (const block of layout.blocks) {
    const { pad } = block;
    boxes.push(new Aabb(pad.minX, 0, pad.minZ, pad.maxX, padTop, pad.maxZ));
    for (const building of block.buildings) {
      const f = building.footprint;
      boxes.push(new Aabb(f.minX, padTop, f.minZ, f.maxX, building.height, f.maxZ));
    }
  }

  const { bounds } = layout;
  const t = WALL_THICKNESS;
  const h = WALL_HEIGHT;
  boxes.push(new Aabb(bounds.minX - t, 0, bounds.minZ - t, bounds.minX, h, bounds.maxZ + t));
  boxes.push(new Aabb(bounds.maxX, 0, bounds.minZ - t, bounds.maxX + t, h, bounds.maxZ + t));
  boxes.push(new Aabb(bounds.minX - t, 0, bounds.minZ - t, bounds.maxX + t, h, bounds.minZ));
  boxes.push(new Aabb(bounds.minX - t, 0, bounds.maxZ, bounds.maxX + t, h, bounds.maxZ + t));

  return new CollisionWorld(boxes);
}
