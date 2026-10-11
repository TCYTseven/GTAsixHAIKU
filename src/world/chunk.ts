import type { Rect } from '../math/rect';
import { Vec3 } from '../math/vec3';
import type { Rgb } from '../render/color';
import { MeshBuilder, type MeshData } from '../render/mesh-builder';
import type { Building, CityLayout } from './city-generator';

const GROUND_COLOR: Rgb = [0.19, 0.24, 0.19];
const ASPHALT_COLOR: Rgb = [0.13, 0.13, 0.14];
const MARKING_COLOR: Rgb = [0.92, 0.82, 0.42];
const SIDEWALK_COLOR: Rgb = [0.56, 0.55, 0.53];
const ROOF_SHADE = 0.7;
const ROOF_HEIGHT = 0.8;
const ROOF_OVERHANG = 0.3;

export interface WorldChunk {
  readonly column: number;
  readonly row: number;
  readonly mesh: MeshData;
  /** Bounding sphere in world space, used for frustum culling. */
  readonly center: Vec3;
  readonly radius: number;
}

/**
 * Groups the static city into square tiles of `chunkSize` meters. Each piece of geometry goes to
 * the tile that contains its center, so each tile draws in one call.
 */
export function buildStaticChunks(layout: CityLayout, chunkSize: number): WorldChunk[] {
  const { bounds } = layout;
  const columns = Math.ceil((bounds.maxX - bounds.minX) / chunkSize);
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / chunkSize);
  const builders = Array.from({ length: columns * rows }, () => new MeshBuilder());

  const tileIndex = (x: number, z: number): number => {
    const column = clampIndex(Math.floor((x - bounds.minX) / chunkSize), columns);
    const row = clampIndex(Math.floor((z - bounds.minZ) / chunkSize), rows);
    return row * columns + column;
  };
  const builderFor = (rect: Rect): MeshBuilder =>
    builders[tileIndex((rect.minX + rect.maxX) / 2, (rect.minZ + rect.maxZ) / 2)];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const minX = bounds.minX + column * chunkSize;
      const minZ = bounds.minZ + row * chunkSize;
      addHorizontalQuad(
        builders[row * columns + column],
        { minX, minZ, maxX: minX + chunkSize, maxZ: minZ + chunkSize },
        0,
        GROUND_COLOR,
      );
    }
  }

  for (const road of layout.roads) {
    addHorizontalQuad(builderFor(road), road, 0.01, ASPHALT_COLOR);
  }
  for (const mark of layout.lineMarks) {
    addHorizontalQuad(builderFor(mark), mark, 0.02, MARKING_COLOR);
  }
  for (const block of layout.blocks) {
    const { pad } = block;
    builderFor(pad).addBox(
      new Vec3(pad.minX, 0, pad.minZ),
      new Vec3(pad.maxX, layout.sidewalkHeight, pad.maxZ),
      SIDEWALK_COLOR,
    );
    for (const building of block.buildings) {
      addBuilding(builderFor(building.footprint), building, layout.sidewalkHeight);
    }
  }

  const chunks: WorldChunk[] = [];
  builders.forEach((builder, index) => {
    const mesh = builder.build();
    const center = new Vec3(
      (mesh.min.x + mesh.max.x) / 2,
      (mesh.min.y + mesh.max.y) / 2,
      (mesh.min.z + mesh.max.z) / 2,
    );
    chunks.push({
      column: index % columns,
      row: Math.floor(index / columns),
      mesh,
      center,
      radius: mesh.min.distanceTo(mesh.max) / 2,
    });
  });
  return chunks;
}

function addHorizontalQuad(builder: MeshBuilder, rect: Rect, y: number, color: Rgb): void {
  builder.addPolygon(
    [
      new Vec3(rect.minX, y, rect.minZ),
      new Vec3(rect.minX, y, rect.maxZ),
      new Vec3(rect.maxX, y, rect.maxZ),
      new Vec3(rect.maxX, y, rect.minZ),
    ],
    [0, 1, 0],
    color,
  );
}

/** A box body with a slightly darker, overhanging roof cap. */
function addBuilding(builder: MeshBuilder, building: Building, baseY: number): void {
  const { footprint: f, height, color } = building;
  const bodyTop = height - ROOF_HEIGHT;
  builder.addBox(new Vec3(f.minX, baseY, f.minZ), new Vec3(f.maxX, bodyTop, f.maxZ), color);
  const roof: Rgb = [color[0] * ROOF_SHADE, color[1] * ROOF_SHADE, color[2] * ROOF_SHADE];
  builder.addBox(
    new Vec3(f.minX - ROOF_OVERHANG, bodyTop, f.minZ - ROOF_OVERHANG),
    new Vec3(f.maxX + ROOF_OVERHANG, height, f.maxZ + ROOF_OVERHANG),
    roof,
  );
}

function clampIndex(index: number, count: number): number {
  return Math.min(count - 1, Math.max(0, index));
}
