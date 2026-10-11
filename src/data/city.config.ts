import type { CityConfig } from './schemas';

/** City layout defaults. Validated at startup by `loadGameConfig`. */
export const DEFAULT_CITY_CONFIG: CityConfig = {
  seed: 1977,
  blocksPerSide: 16,
  blockSize: 40,
  roadWidth: 14,
  sidewalkWidth: 3,
  sidewalkHeight: 0.15,
  buildingHeight: { min: 8, max: 60 },
  buildingsPerBlock: { min: 2, max: 4 },
  buildingInset: { min: 1.5, max: 3 },
  chunkSize: 100,
  palette: [
    [0.62, 0.6, 0.56],
    [0.47, 0.5, 0.56],
    [0.72, 0.66, 0.55],
    [0.36, 0.42, 0.5],
    [0.55, 0.36, 0.32],
    [0.42, 0.56, 0.5],
    [0.78, 0.76, 0.7],
    [0.3, 0.33, 0.4],
  ],
};
