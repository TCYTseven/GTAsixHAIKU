import { Vec3 } from '../math/vec3';
import type { Rgb } from './color';
import { MeshBuilder, type MeshData } from './mesh-builder';

const GLASS: Rgb = [0.16, 0.2, 0.26];
const TYRE: Rgb = [0.07, 0.07, 0.08];
const LAMP: Rgb = [1, 0.94, 0.72];

/**
 * A blocky car, with its center on the ground under the middle of the car, facing +Z. The body is
 * white and the caller tints it with the paint color. Glass, tyres, and lamps are darker or
 * warmer vertex colors, so they still read against any paint.
 */
export function buildVehicleMesh(length: number, width: number, height: number): MeshData {
  const builder = new MeshBuilder();
  const at = (x: number, y: number, z: number): Vec3 => new Vec3(x, y, z);
  const hl = length / 2;
  const hw = width / 2;
  const body = height * 0.6;

  builder.addBox(at(-hw, 0.25, -hl), at(hw, body, hl), [1, 1, 1]);
  builder.addBox(at(-hw * 0.84, body, -hl * 0.45), at(hw * 0.84, height, hl * 0.4), GLASS);
  builder.addBox(at(-hw - 0.04, 0, hl * 0.55), at(-hw + 0.02, 0.35, hl * 0.55 + 0.7), TYRE);
  builder.addBox(at(hw - 0.02, 0, hl * 0.55), at(hw + 0.04, 0.35, hl * 0.55 + 0.7), TYRE);
  builder.addBox(at(-hw - 0.04, 0, -hl * 0.55 - 0.7), at(-hw + 0.02, 0.35, -hl * 0.55), TYRE);
  builder.addBox(at(hw - 0.02, 0, -hl * 0.55 - 0.7), at(hw + 0.04, 0.35, -hl * 0.55), TYRE);
  builder.addBox(at(-hw * 0.7, 0.45, hl - 0.02), at(-hw * 0.35, 0.6, hl + 0.04), LAMP);
  builder.addBox(at(hw * 0.35, 0.45, hl - 0.02), at(hw * 0.7, 0.6, hl + 0.04), LAMP);

  return builder.build();
}
