import { describe, expect, it } from 'vitest';
import { advanceMission, type ActiveMission } from '../../src/systems/missions';
import { loadGameConfig } from '../../src/data/load-config';
import { parseConfig } from '../../src/data/load-config';
import { MissionsConfigSchema } from '../../src/data/schemas';
import { DEFAULT_MISSIONS_CONFIG } from '../../src/data/missions.config';

function mission(steps: ActiveMission['steps']): ActiveMission {
  return { id: 'm', title: 'M', reward: 100, steps, index: 0, kills: 0 };
}

describe('missions', () => {
  it('completes a go-to step only inside its radius', () => {
    const m = mission([{ kind: 'goTo', text: 'go', x: 10, z: 0, radius: 5, count: 0 }]);
    expect(advanceMission(m, { x: 0, z: 0, inCar: false })).toBe(false);
    expect(advanceMission(m, { x: 8, z: 0, inCar: false })).toBe(true);
  });

  it('needs the player in a car for a drive-to step', () => {
    const m = mission([{ kind: 'driveTo', text: 'drive', x: 0, z: 0, radius: 5, count: 0 }]);
    expect(advanceMission(m, { x: 0, z: 0, inCar: false })).toBe(false);
    expect(advanceMission(m, { x: 0, z: 0, inCar: true })).toBe(true);
  });

  it('counts eliminations toward an eliminate step', () => {
    const m = mission([{ kind: 'eliminate', text: 'kill', x: 0, z: 0, radius: 0, count: 2 }]);
    m.kills = 1;
    expect(advanceMission(m, { x: 0, z: 0, inCar: false })).toBe(false);
    m.kills = 2;
    expect(advanceMission(m, { x: 0, z: 0, inCar: false })).toBe(true);
  });

  it('ships three valid missions', () => {
    expect(DEFAULT_MISSIONS_CONFIG.missions).toHaveLength(3);
    expect(() => loadGameConfig()).not.toThrow();
    expect(() => parseConfig('missions', MissionsConfigSchema, { missions: [] })).toThrow();
  });
});
