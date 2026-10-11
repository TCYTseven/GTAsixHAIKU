import { Vec3 } from '../math/vec3';
import type { Rgb } from './color';
import { MeshBuilder, type MeshData } from './mesh-builder';

export interface FigurePalette {
  readonly jacket: Rgb;
  readonly pants: Rgb;
  readonly skin: Rgb;
  readonly accent: Rgb;
}

/** A blocky standing figure, 1.78 m tall, with its feet at y = 0 and its face toward +Z. */
export function buildFigureMesh(palette: FigurePalette): MeshData {
  const builder = new MeshBuilder();
  const at = (x: number, y: number, z: number): Vec3 => new Vec3(x, y, z);

  builder.addBox(at(-0.2, 0, -0.12), at(-0.02, 0.85, 0.12), palette.pants);
  builder.addBox(at(0.02, 0, -0.12), at(0.2, 0.85, 0.12), palette.pants);
  builder.addBox(at(-0.3, 0.85, -0.18), at(0.3, 1.5, 0.18), palette.jacket);
  builder.addBox(at(-0.4, 0.9, -0.08), at(-0.3, 1.45, 0.08), palette.jacket);
  builder.addBox(at(0.3, 0.9, -0.08), at(0.4, 1.45, 0.08), palette.jacket);
  builder.addBox(at(-0.14, 1.5, -0.14), at(0.14, 1.78, 0.14), palette.skin);
  // Dark band across the face, so the facing direction reads at a distance.
  builder.addBox(at(-0.12, 1.6, 0.13), at(0.12, 1.68, 0.16), palette.accent);

  return builder.build();
}
