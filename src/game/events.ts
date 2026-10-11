import type { Pedestrian } from '../entities/pedestrian';
import type { Vehicle } from '../entities/vehicle';

/** Everything the simulation announces. Systems subscribe to what they need. */
export interface GameEvents {
  /** A vehicle hit something hard enough to matter. `speed` is the closing speed in m/s. */
  vehicleImpact: { vehicle: Vehicle; speed: number; against: 'world' | 'vehicle' };
  vehicleEntered: { vehicle: Vehicle };
  vehicleExited: { vehicle: Vehicle };
  pedestrianKilled: { pedestrian: Pedestrian; cause: 'melee' | 'gunfire' | 'vehicle' };
  /** The player shot at something. `near` is true when a pedestrian or police car was close. */
  shotFired: { near: boolean };
  playerDied: Record<string, never>;
  playerRespawned: Record<string, never>;
}
