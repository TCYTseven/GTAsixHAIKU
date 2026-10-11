import { describe, expect, it } from 'vitest';
import { createMat4, mat4FromTransform } from '../../src/math/mat4';
import { Vec3 } from '../../src/math/vec3';
import { FLOATS_PER_VERTEX, MeshBuilder, type MeshData } from '../../src/render/mesh-builder';

const RED = [1, 0, 0] as const;

function vertexAt(data: MeshData, index: number): { position: Vec3; normal: Vec3 } {
  const o = index * FLOATS_PER_VERTEX;
  const v = data.vertices;
  return {
    position: new Vec3(v[o], v[o + 1], v[o + 2]),
    normal: new Vec3(v[o + 3], v[o + 4], v[o + 5]),
  };
}

/**
 * Each triangle's geometric normal (counter-clockwise winding) must match the normal stored on
 * its vertices. A mismatch means the face is wound inside out, which back-face culling would hide.
 */
function expectOutwardWinding(data: MeshData): void {
  for (let t = 0; t < data.indices.length; t += 3) {
    const a = vertexAt(data, data.indices[t]);
    const b = vertexAt(data, data.indices[t + 1]);
    const c = vertexAt(data, data.indices[t + 2]);
    const edge1 = b.position.clone().sub(a.position);
    const edge2 = c.position.clone().sub(a.position);
    const geometric = new Vec3().setCross(edge1, edge2);
    expect(geometric.lengthSquared()).toBeGreaterThan(1e-12);
    expect(geometric.normalize().dot(a.normal.clone().normalize())).toBeGreaterThan(0.999);
  }
}

describe('MeshBuilder', () => {
  it('builds a box with 24 vertices, 36 indices, and matching bounds', () => {
    const builder = new MeshBuilder().addBox(new Vec3(-1, 0, 2), new Vec3(1, 4, 5), RED);
    const data = builder.build();

    expect(builder.vertexCount).toBe(24);
    expect(data.indices.length).toBe(36);
    expect(data.min.x).toBe(-1);
    expect(data.min.z).toBe(2);
    expect(data.max.y).toBe(4);
  });

  it('winds every box face counter-clockwise when seen from outside', () => {
    const data = new MeshBuilder().addBox(new Vec3(0, 0, 0), new Vec3(2, 3, 4), RED).build();
    expectOutwardWinding(data);
  });

  it('keeps winding and normals correct after yaw and non-uniform scale', () => {
    const transform = mat4FromTransform(createMat4(), 3, 1, -2, 0.8, 2, 1, 3);
    const data = new MeshBuilder()
      .addBox(new Vec3(-0.5, -0.5, -0.5), new Vec3(0.5, 0.5, 0.5), RED, transform)
      .build();
    expectOutwardWinding(data);
  });

  it('builds ramps with outward winding', () => {
    const data = new MeshBuilder().addRamp(new Vec3(0, 0, 0), new Vec3(3, 2, 5), RED).build();
    expectOutwardWinding(data);
  });

  it('builds cylinders with outward winding on the sides and both caps', () => {
    const data = new MeshBuilder().addCylinder(new Vec3(1, 0, 1), 1.5, 6, 12, RED).build();
    expectOutwardWinding(data);
    expect(data.max.y).toBeCloseTo(6, 12);
  });

  it('reports zero bounds for an empty mesh', () => {
    const data = new MeshBuilder().build();
    expect(data.vertices.length).toBe(0);
    expect(data.min.x).toBe(0);
    expect(data.max.z).toBe(0);
  });
});
