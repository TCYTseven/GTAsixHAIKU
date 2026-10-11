import { Aabb } from '../math/aabb';
import { intersectAabbRay } from '../math/ray';
import type { Vec3 } from '../math/vec3';

const DEFAULT_CELL_SIZE = 10;
const PARALLEL_EPSILON = 1e-12;

function cellKey(cx: number, cz: number): number {
  return (cx + 32768) * 65536 + (cz + 32768);
}

/**
 * Static box colliders indexed by a uniform grid on the ground plane. Each box is listed in every
 * cell it touches, so queries only test boxes near the region they cover.
 */
export class CollisionWorld {
  private readonly cells = new Map<number, number[]>();
  private readonly visited: Uint32Array;
  private stamp = 0;

  constructor(
    readonly boxes: readonly Aabb[],
    private readonly cellSize = DEFAULT_CELL_SIZE,
  ) {
    this.visited = new Uint32Array(boxes.length);
    boxes.forEach((box, index) => {
      const x0 = Math.floor(box.min.x / cellSize);
      const x1 = Math.floor(box.max.x / cellSize);
      const z0 = Math.floor(box.min.z / cellSize);
      const z1 = Math.floor(box.max.z / cellSize);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const key = cellKey(cx, cz);
          const list = this.cells.get(key);
          if (list) {
            list.push(index);
          } else {
            this.cells.set(key, [index]);
          }
        }
      }
    });
  }

  /** Appends every box that overlaps `region` to `out` and returns `out`. */
  query(region: Aabb, out: Aabb[] = []): Aabb[] {
    this.stamp += 1;
    if (this.stamp === 0xffffffff) {
      this.visited.fill(0);
      this.stamp = 1;
    }
    const size = this.cellSize;
    for (let cx = Math.floor(region.min.x / size); cx <= Math.floor(region.max.x / size); cx++) {
      for (let cz = Math.floor(region.min.z / size); cz <= Math.floor(region.max.z / size); cz++) {
        const list = this.cells.get(cellKey(cx, cz));
        if (!list) {
          continue;
        }
        for (const index of list) {
          if (this.visited[index] === this.stamp) {
            continue;
          }
          this.visited[index] = this.stamp;
          if (this.boxes[index].overlaps(region)) {
            out.push(this.boxes[index]);
          }
        }
      }
    }
    return out;
  }

  overlapsAny(region: Aabb): boolean {
    const size = this.cellSize;
    for (let cx = Math.floor(region.min.x / size); cx <= Math.floor(region.max.x / size); cx++) {
      for (let cz = Math.floor(region.min.z / size); cz <= Math.floor(region.max.z / size); cz++) {
        const list = this.cells.get(cellKey(cx, cz));
        if (!list) {
          continue;
        }
        for (const index of list) {
          if (this.boxes[index].overlaps(region)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Distance to the first box a ray hits, within maxDistance, or null. Walks the grid cell by cell
   * in ray order (Amanatides and Woo) and stops once the next cell lies beyond the closest hit.
   * `direction` must have unit length.
   */
  raycast(origin: Vec3, direction: Vec3, maxDistance: number): number | null {
    const size = this.cellSize;
    const dx = direction.x;
    const dz = direction.z;
    let cellX = Math.floor(origin.x / size);
    let cellZ = Math.floor(origin.z / size);
    const stepX = dx >= 0 ? 1 : -1;
    const stepZ = dz >= 0 ? 1 : -1;
    const tDeltaX = Math.abs(dx) < PARALLEL_EPSILON ? Infinity : size / Math.abs(dx);
    const tDeltaZ = Math.abs(dz) < PARALLEL_EPSILON ? Infinity : size / Math.abs(dz);
    let tMaxX = Infinity;
    if (Math.abs(dx) >= PARALLEL_EPSILON) {
      const boundary = dx > 0 ? (cellX + 1) * size : cellX * size;
      tMaxX = (boundary - origin.x) / dx;
    }
    let tMaxZ = Infinity;
    if (Math.abs(dz) >= PARALLEL_EPSILON) {
      const boundary = dz > 0 ? (cellZ + 1) * size : cellZ * size;
      tMaxZ = (boundary - origin.z) / dz;
    }

    let closest = maxDistance;
    let hit: number | null = null;
    for (;;) {
      const list = this.cells.get(cellKey(cellX, cellZ));
      if (list) {
        for (const index of list) {
          const t = intersectAabbRay(origin, direction, this.boxes[index], closest);
          if (t !== null && t <= closest) {
            closest = t;
            hit = t;
          }
        }
      }
      if (tMaxX < tMaxZ) {
        if (tMaxX > closest) {
          break;
        }
        cellX += stepX;
        tMaxX += tDeltaX;
      } else {
        if (tMaxZ > closest) {
          break;
        }
        cellZ += stepZ;
        tMaxZ += tDeltaZ;
      }
    }
    return hit;
  }
}
