import type { WeaponsConfig } from './schemas';

/** Melee, pistol, and death rules. Validated at startup by `loadGameConfig`. */
export const DEFAULT_WEAPONS_CONFIG: WeaponsConfig = {
  melee: { range: 2, coneDegrees: 60, damage: 10, cooldown: 0.4 },
  pistol: {
    damage: 25,
    maxRange: 150,
    fireRate: 4,
    magazine: 12,
    reserveAmmo: 48,
    reloadTime: 1.5,
  },
  startingCash: 500,
  deathCashPenalty: 0.1,
  respawnDelay: 3,
};
