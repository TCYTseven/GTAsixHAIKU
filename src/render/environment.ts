import type { Triple } from '../math/vec3';
import type { Rgb } from './color';

/** Lighting, sky, and fog settings used for one frame. */
export interface Environment {
  /** Unit vector pointing toward the sun. */
  readonly sunDirection: Triple;
  readonly sunColor: Rgb;
  readonly ambientSky: Rgb;
  readonly ambientGround: Rgb;
  readonly skyTop: Rgb;
  readonly skyHorizon: Rgb;
  readonly fogColor: Rgb;
  readonly fogStart: number;
  readonly fogEnd: number;
}

export const DEFAULT_ENVIRONMENT: Environment = {
  sunDirection: [0.356, 0.814, 0.458],
  sunColor: [1.0, 0.94, 0.82],
  ambientSky: [0.34, 0.38, 0.46],
  ambientGround: [0.2, 0.18, 0.16],
  skyTop: [0.2, 0.42, 0.78],
  skyHorizon: [0.66, 0.76, 0.86],
  fogColor: [0.66, 0.76, 0.86],
  fogStart: 150,
  fogEnd: 900,
};
