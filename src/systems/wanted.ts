/** Heat points needed to reach each star: one, two, three, four, and five stars. */
const THRESHOLDS = [1, 3, 6, 10, 15];
const MAX_POINTS = 15;
const LOSE_SIGHT_TIME = 20;
const DECAY_INTERVAL = 3;
/** Police units wanted at each star level, indexed by level. */
export const POLICE_BY_LEVEL = [0, 2, 3, 4, 5, 6];

/** Heat from crimes, turned into stars. Heat only drops once police have lost sight for a while. */
export class WantedState {
  points = 0;
  private unseen = 0;
  private decayTimer = 0;

  get level(): number {
    return THRESHOLDS.filter((threshold) => this.points >= threshold).length;
  }

  get policeTarget(): number {
    return POLICE_BY_LEVEL[this.level];
  }

  add(points: number): void {
    this.points = Math.min(MAX_POINTS, this.points + points);
  }

  update(dt: number, seenByPolice: boolean): void {
    if (this.points === 0) {
      return;
    }
    if (seenByPolice) {
      this.unseen = 0;
      this.decayTimer = 0;
      return;
    }
    this.unseen += dt;
    if (this.unseen < LOSE_SIGHT_TIME) {
      return;
    }
    this.decayTimer += dt;
    if (this.decayTimer >= DECAY_INTERVAL) {
      this.decayTimer = 0;
      this.points = Math.max(0, this.points - 1);
    }
  }

  clear(): void {
    this.points = 0;
    this.unseen = 0;
    this.decayTimer = 0;
  }
}
