import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYER_CONFIG } from '../../src/data/player.config';
import { parseConfig, loadGameConfig, ConfigError } from '../../src/data/load-config';
import { PlayerConfigSchema } from '../../src/data/schemas';

describe('player configuration', () => {
  it('loads the default player config', () => {
    expect(loadGameConfig().player.walkSpeed).toBe(DEFAULT_PLAYER_CONFIG.walkSpeed);
  });

  it('rejects a sprint speed slower than walking', () => {
    const broken = { ...DEFAULT_PLAYER_CONFIG, sprintSpeed: 1 };
    expect(() => parseConfig('player.config.ts', PlayerConfigSchema, broken)).toThrow(ConfigError);
    expect(() => parseConfig('player.config.ts', PlayerConfigSchema, broken)).toThrow(
      /sprintSpeed/,
    );
  });

  it('rejects a step height above the walkable limit', () => {
    const broken = { ...DEFAULT_PLAYER_CONFIG, stepHeight: 0.5 };
    expect(() => parseConfig('player.config.ts', PlayerConfigSchema, broken)).toThrow(/stepHeight/);
  });

  it('rejects an inverted camera pitch range', () => {
    const broken = { ...DEFAULT_PLAYER_CONFIG, cameraMinPitch: 0.5, cameraMaxPitch: 0.1 };
    expect(() => parseConfig('player.config.ts', PlayerConfigSchema, broken)).toThrow(
      /cameraMaxPitch/,
    );
  });
});
