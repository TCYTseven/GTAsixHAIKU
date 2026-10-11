import { describe, expect, it } from 'vitest';
import { DEFAULT_VEHICLES_CONFIG } from '../../src/data/vehicles.config';
import { parseConfig } from '../../src/data/load-config';
import { VehiclesConfigSchema } from '../../src/data/schemas';

describe('vehicle configuration', () => {
  it('accepts the default vehicle config', () => {
    expect(() =>
      parseConfig('vehicles.config.ts', VehiclesConfigSchema, DEFAULT_VEHICLES_CONFIG),
    ).not.toThrow();
  });

  it('rejects a non-positive top speed', () => {
    const broken = {
      ...DEFAULT_VEHICLES_CONFIG,
      types: [{ ...DEFAULT_VEHICLES_CONFIG.types[0], maxSpeed: 0 }],
    };
    expect(() => parseConfig('vehicles.config.ts', VehiclesConfigSchema, broken)).toThrow(
      /maxSpeed/,
    );
  });

  it('rejects a chase camera whose maximum distance is below its base distance', () => {
    const broken = {
      ...DEFAULT_VEHICLES_CONFIG,
      chaseCamera: { ...DEFAULT_VEHICLES_CONFIG.chaseCamera, maxDistance: 2, baseDistance: 6 },
    };
    expect(() => parseConfig('vehicles.config.ts', VehiclesConfigSchema, broken)).toThrow(
      /maxDistance/,
    );
  });
});
