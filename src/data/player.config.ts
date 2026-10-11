import type { PlayerConfig } from './schemas';

/** On-foot movement and third-person camera defaults. Validated at startup by `loadGameConfig`. */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  halfWidth: 0.35,
  height: 1.8,
  walkSpeed: 4.2,
  sprintSpeed: 7.2,
  acceleration: 30,
  airAcceleration: 8,
  turnRate: 12,
  jumpSpeed: 6.5,
  gravity: 20,
  stepHeight: 0.4,
  maxFallSpeed: 40,
  cameraDistance: 5,
  cameraHeight: 1.5,
  cameraMinPitch: -1.1,
  cameraMaxPitch: 0.35,
};
