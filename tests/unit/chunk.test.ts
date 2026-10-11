import { describe, expect, it } from 'vitest';
import { DEFAULT_CITY_CONFIG } from '../../src/data/city.config';
import { FLOATS_PER_VERTEX } from '../../src/render/mesh-builder';
import { buildStaticChunks } from '../../src/world/chunk';
import { generateCity } from '../../src/world/city-generator';

describe('buildStaticChunks', () => {
  // Four blocks per side gives a 254 m city, which needs three columns of 100 m tiles.
  const city = generateCity({ ...DEFAULT_CITY_CONFIG, blocksPerSide: 4 });

  it('tiles the city into square chunks', () => {
    expect(buildStaticChunks(city, 100)).toHaveLength(9);
  });

  it('keeps every vertex inside its chunk bounding sphere', () => {
    for (const chunk of buildStaticChunks(city, 100)) {
      const v = chunk.mesh.vertices;
      for (let i = 0; i < v.length; i += FLOATS_PER_VERTEX) {
        const dx = v[i] - chunk.center.x;
        const dy = v[i + 1] - chunk.center.y;
        const dz = v[i + 2] - chunk.center.z;
        expect(Math.sqrt(dx * dx + dy * dy + dz * dz)).toBeLessThanOrEqual(chunk.radius + 1e-3);
      }
    }
  });

  it('gives every chunk geometry to draw', () => {
    for (const chunk of buildStaticChunks(city, 100)) {
      expect(chunk.mesh.indices.length).toBeGreaterThan(0);
    }
  });
});
