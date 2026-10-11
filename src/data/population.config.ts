import type { PopulationConfig } from './schemas';

/** Pedestrian and traffic density around the player. Validated at startup. */
export const DEFAULT_POPULATION_CONFIG: PopulationConfig = {
  pedestrians: 40,
  traffic: 20,
  spawnMinDistance: 40,
  despawnDistance: 120,
  pedestrianSpeed: 1.4,
  pedestrianHealth: 30,
  trafficSpeedFactor: 0.6,
};
