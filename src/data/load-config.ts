import type { z } from 'zod';
import { DEFAULT_CITY_CONFIG } from './city.config';
import { DEFAULT_PLAYER_CONFIG } from './player.config';
import {
  CityConfigSchema,
  PlayerConfigSchema,
  VehiclesConfigSchema,
  type CityConfig,
  type PlayerConfig,
  type VehiclesConfig,
} from './schemas';
import { DEFAULT_VEHICLES_CONFIG } from './vehicles.config';

export interface GameConfig {
  readonly city: CityConfig;
  readonly player: PlayerConfig;
  readonly vehicles: VehiclesConfig;
}

/** Thrown when configuration fails validation. The message lists every problem found. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/** Validates all tunable configuration. Call once at startup, before any world is generated. */
export function loadGameConfig(): GameConfig {
  return {
    city: parseConfig('city.config.ts', CityConfigSchema, DEFAULT_CITY_CONFIG),
    player: parseConfig('player.config.ts', PlayerConfigSchema, DEFAULT_PLAYER_CONFIG),
    vehicles: parseConfig('vehicles.config.ts', VehiclesConfigSchema, DEFAULT_VEHICLES_CONFIG),
  };
}

export function parseConfig<T extends z.ZodType>(
  name: string,
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const where = issue.path.map(String).join('.') || '(root)';
      return `  - ${where}: ${issue.message}`;
    });
    throw new ConfigError(`Invalid ${name}:\n${problems.join('\n')}`);
  }
  return result.data;
}
