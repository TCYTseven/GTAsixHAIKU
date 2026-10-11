import { createRng, type Rng } from '../core/rng';
import type { CityConfig } from '../data/schemas';
import { insetRect, type Rect } from '../math/rect';
import type { Rgb } from '../render/color';
import { buildRoadGraph, type RoadGraph } from './road-graph';

export interface Building {
  readonly footprint: Rect;
  readonly height: number;
  readonly color: Rgb;
}

export interface Block {
  readonly col: number;
  readonly row: number;
  /** Raised ground that includes the sidewalks around the block. */
  readonly pad: Rect;
  /** Centerline of the sidewalk ring, where pedestrians walk. */
  readonly walkway: Rect;
  readonly buildings: readonly Building[];
}

export interface CityLayout {
  readonly seed: number;
  /**
   * Street centerline coordinates. Streets run along X at each fixed z in `lines`, and along Z at
   * each fixed x in `lines`.
   */
  readonly lines: readonly number[];
  readonly bounds: Rect;
  /** Asphalt, one piece per street segment. Pieces overlap at intersections on purpose. */
  readonly roads: readonly Rect[];
  /** Thin center-line dashes. */
  readonly lineMarks: readonly Rect[];
  readonly blocks: readonly Block[];
  readonly graph: RoadGraph;
  readonly sidewalkHeight: number;
}

/**
 * Lays out a square city from a seed. The same config always yields the same city. Roads sit at a
 * fixed pitch, each block gets raised sidewalks, and 2 to 4 buildings fill its quarters.
 */
export function generateCity(config: CityConfig): CityLayout {
  const rng = createRng(config.seed);
  const roadHalf = config.roadWidth / 2;
  const corridorHalf = roadHalf + config.sidewalkWidth;
  const pitch = config.blockSize + 2 * corridorHalf;
  const halfExtent = (config.blocksPerSide * pitch) / 2;
  const lines = Array.from({ length: config.blocksPerSide + 1 }, (_, i) => i * pitch - halfExtent);
  const first = lines[0];
  const last = lines[lines.length - 1];
  const bounds: Rect = {
    minX: first - roadHalf,
    minZ: first - roadHalf,
    maxX: last + roadHalf,
    maxZ: last + roadHalf,
  };

  const roads: Rect[] = [];
  const lineMarks: Rect[] = [];
  const dashLength = 3;
  const dashPitch = 9;
  const markHalf = 0.15;
  const clearOfIntersection = roadHalf + 1;

  for (let line = 0; line < lines.length; line++) {
    const z = lines[line];
    for (let seg = 0; seg < config.blocksPerSide; seg++) {
      const x0 = lines[seg];
      const x1 = lines[seg + 1];
      roads.push({
        minX: x0 - roadHalf,
        minZ: z - roadHalf,
        maxX: x1 + roadHalf,
        maxZ: z + roadHalf,
      });
      for (
        let x = x0 + clearOfIntersection;
        x + dashLength <= x1 - clearOfIntersection;
        x += dashPitch
      ) {
        lineMarks.push({ minX: x, minZ: z - markHalf, maxX: x + dashLength, maxZ: z + markHalf });
      }
    }
  }

  for (let line = 0; line < lines.length; line++) {
    const x = lines[line];
    for (let seg = 0; seg < config.blocksPerSide; seg++) {
      const z0 = lines[seg];
      const z1 = lines[seg + 1];
      roads.push({
        minX: x - roadHalf,
        minZ: z0 - roadHalf,
        maxX: x + roadHalf,
        maxZ: z1 + roadHalf,
      });
      for (
        let z = z0 + clearOfIntersection;
        z + dashLength <= z1 - clearOfIntersection;
        z += dashPitch
      ) {
        lineMarks.push({ minX: x - markHalf, minZ: z, maxX: x + markHalf, maxZ: z + dashLength });
      }
    }
  }

  const blocks: Block[] = [];
  for (let row = 0; row < config.blocksPerSide; row++) {
    for (let col = 0; col < config.blocksPerSide; col++) {
      const pad: Rect = {
        minX: lines[col] + roadHalf,
        minZ: lines[row] + roadHalf,
        maxX: lines[col + 1] - roadHalf,
        maxZ: lines[row + 1] - roadHalf,
      };
      const area = insetRect(pad, config.sidewalkWidth);
      blocks.push({
        col,
        row,
        pad,
        walkway: insetRect(pad, config.sidewalkWidth / 2),
        buildings: placeBuildings(area, config, rng),
      });
    }
  }

  return {
    seed: config.seed,
    lines,
    bounds,
    roads,
    lineMarks,
    blocks,
    graph: buildRoadGraph(lines, config.roadWidth / 4),
    sidewalkHeight: config.sidewalkHeight,
  };
}

/** Splits a block's building area into four quarters and fills a random subset of them. */
function placeBuildings(area: Rect, config: CityConfig, rng: Rng): Building[] {
  const midX = (area.minX + area.maxX) / 2;
  const midZ = (area.minZ + area.maxZ) / 2;
  const quarters: Rect[] = [
    { minX: area.minX, minZ: area.minZ, maxX: midX, maxZ: midZ },
    { minX: midX, minZ: area.minZ, maxX: area.maxX, maxZ: midZ },
    { minX: area.minX, minZ: midZ, maxX: midX, maxZ: area.maxZ },
    { minX: midX, minZ: midZ, maxX: area.maxX, maxZ: area.maxZ },
  ];
  const order = shuffled([0, 1, 2, 3], rng);
  const count = rng.int(config.buildingsPerBlock.min, config.buildingsPerBlock.max);

  const buildings: Building[] = [];
  for (const index of order.slice(0, count)) {
    const quarter = quarters[index];
    const inset = (): number => rng.range(config.buildingInset.min, config.buildingInset.max);
    const footprint: Rect = {
      minX: quarter.minX + inset(),
      minZ: quarter.minZ + inset(),
      maxX: quarter.maxX - inset(),
      maxZ: quarter.maxZ - inset(),
    };
    buildings.push({
      footprint,
      height: rng.range(config.buildingHeight.min, config.buildingHeight.max),
      color: rng.pick(config.palette),
    });
  }
  return buildings;
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
