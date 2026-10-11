import { describe, expect, it } from 'vitest';
import { DEFAULT_CITY_CONFIG } from '../../src/data/city.config';
import type { CityConfig } from '../../src/data/schemas';
import { insetRect, rectContainsPoint, rectContainsRect, rectsOverlap } from '../../src/math/rect';
import { generateCity } from '../../src/world/city-generator';

const SMALL: CityConfig = { ...DEFAULT_CITY_CONFIG, blocksPerSide: 4 };

describe('generateCity', () => {
  it('lays out one block per grid cell', () => {
    const city = generateCity(DEFAULT_CITY_CONFIG);
    expect(city.blocks).toHaveLength(16 * 16);
    expect(city.lines).toHaveLength(17);
  });

  it('gives the same city for the same seed', () => {
    const a = generateCity(SMALL);
    const b = generateCity(SMALL);
    expect(JSON.stringify(a.blocks)).toBe(JSON.stringify(b.blocks));
    expect(JSON.stringify(a.roads)).toBe(JSON.stringify(b.roads));
  });

  it('changes the buildings when the seed changes', () => {
    const a = generateCity(SMALL);
    const b = generateCity({ ...SMALL, seed: 4242 });
    expect(JSON.stringify(a.blocks)).not.toBe(JSON.stringify(b.blocks));
  });

  it('places 2 to 4 buildings per block, within the configured heights', () => {
    const city = generateCity(DEFAULT_CITY_CONFIG);
    for (const block of city.blocks) {
      expect(block.buildings.length).toBeGreaterThanOrEqual(2);
      expect(block.buildings.length).toBeLessThanOrEqual(4);
      for (const building of block.buildings) {
        expect(building.height).toBeGreaterThanOrEqual(8);
        expect(building.height).toBeLessThanOrEqual(60);
      }
    }
  });

  it('keeps buildings inside their block, apart from each other, and off the roads', () => {
    const city = generateCity(DEFAULT_CITY_CONFIG);
    for (const block of city.blocks) {
      const area = insetRect(block.pad, DEFAULT_CITY_CONFIG.sidewalkWidth);
      block.buildings.forEach((building, index) => {
        expect(rectContainsRect(area, building.footprint)).toBe(true);
        for (const road of city.roads) {
          expect(rectsOverlap(road, building.footprint)).toBe(false);
        }
        for (const other of block.buildings.slice(index + 1)) {
          expect(rectsOverlap(building.footprint, other.footprint)).toBe(false);
        }
      });
    }
  });

  it('keeps raised sidewalks clear of the road surface', () => {
    const city = generateCity(SMALL);
    for (const block of city.blocks) {
      for (const road of city.roads) {
        expect(rectsOverlap(block.pad, road)).toBe(false);
      }
    }
  });

  it('puts road surface under every intersection and inside the city bounds', () => {
    const city = generateCity(SMALL);
    for (const node of city.graph.nodes) {
      expect(
        city.roads.some((road) => rectContainsPoint(road, node.position.x, node.position.z)),
      ).toBe(true);
    }
    for (const road of city.roads) {
      expect(rectContainsRect(city.bounds, road)).toBe(true);
    }
  });
});
