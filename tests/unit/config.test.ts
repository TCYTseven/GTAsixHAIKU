import { describe, expect, it } from 'vitest';
import { DEFAULT_CITY_CONFIG } from '../../src/data/city.config';
import { ConfigError, loadGameConfig, parseConfig } from '../../src/data/load-config';
import { CityConfigSchema } from '../../src/data/schemas';

describe('configuration', () => {
  it('loads the default city config without errors', () => {
    const config = loadGameConfig();
    expect(config.city.blocksPerSide).toBe(16);
    expect(config.city.seed).toBe(DEFAULT_CITY_CONFIG.seed);
  });

  it('names the bad field when a value is out of range', () => {
    const broken = { ...DEFAULT_CITY_CONFIG, blocksPerSide: 0 };
    expect(() => parseConfig('city.config.ts', CityConfigSchema, broken)).toThrow(ConfigError);
    expect(() => parseConfig('city.config.ts', CityConfigSchema, broken)).toThrow(/blocksPerSide/);
  });

  it('rejects building insets too large for a block', () => {
    const broken = { ...DEFAULT_CITY_CONFIG, buildingInset: { min: 1, max: 12 } };
    expect(() => parseConfig('city.config.ts', CityConfigSchema, broken)).toThrow(/buildingInset/);
  });

  it('rejects sidewalks taller than the walkable step', () => {
    const broken = { ...DEFAULT_CITY_CONFIG, sidewalkHeight: 0.6 };
    expect(() => parseConfig('city.config.ts', CityConfigSchema, broken)).toThrow(/sidewalkHeight/);
  });

  it('rejects an empty color palette', () => {
    const broken = { ...DEFAULT_CITY_CONFIG, palette: [] };
    expect(() => parseConfig('city.config.ts', CityConfigSchema, broken)).toThrow(/palette/);
  });
});
