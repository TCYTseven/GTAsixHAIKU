export interface ResolvedStep {
  readonly kind: 'goTo' | 'driveTo' | 'eliminate';
  readonly text: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly count: number;
}

export interface ActiveMission {
  readonly id: string;
  readonly title: string;
  readonly reward: number;
  readonly steps: readonly ResolvedStep[];
  index: number;
  kills: number;
}

export interface PlayerSpot {
  readonly x: number;
  readonly z: number;
  readonly inCar: boolean;
}

/**
 * Moves the active mission on when its current step is met. Returns true when the last step
 * has just been completed.
 */
export function advanceMission(mission: ActiveMission, player: PlayerSpot): boolean {
  const step = mission.steps[mission.index];
  if (!step) {
    return true;
  }
  const distance = Math.hypot(step.x - player.x, step.z - player.z);
  const met =
    step.kind === 'goTo'
      ? distance <= step.radius
      : step.kind === 'driveTo'
        ? player.inCar && distance <= step.radius
        : mission.kills >= step.count;
  if (met) {
    mission.index += 1;
  }
  return mission.index >= mission.steps.length;
}

/** The current instruction and where to go for it, or null when no mission is active. */
export function currentObjective(mission: ActiveMission | null): ResolvedStep | null {
  if (!mission) {
    return null;
  }
  return mission.steps[mission.index] ?? null;
}
