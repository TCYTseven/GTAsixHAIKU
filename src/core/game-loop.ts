/** Fixed simulation step: 60 updates per second. */
export const FIXED_STEP_SECONDS = 1 / 60;

/** Longest wall-clock gap the simulation catches up on in one frame (avoids a spiral of death). */
export const MAX_FRAME_SECONDS = 0.25;

export interface GameLoopCallbacks {
  /** Advances the simulation by exactly `dt` seconds. */
  fixedUpdate(dt: number): void;
  /** Draws one frame. `alpha` (0 to 1) is how far the next fixed step has progressed. */
  render(alpha: number, frameSeconds: number): void;
}

export class GameLoop {
  private lastTime: number | null = null;
  private accumulator = 0;

  constructor(
    private readonly callbacks: GameLoopCallbacks,
    private readonly stepSeconds: number = FIXED_STEP_SECONDS,
  ) {}

  /** Call once per animation frame with a monotonic timestamp in seconds. */
  frame(nowSeconds: number): void {
    const elapsed = this.lastTime === null ? 0 : nowSeconds - this.lastTime;
    this.lastTime = nowSeconds;
    const frameSeconds = Math.min(Math.max(elapsed, 0), MAX_FRAME_SECONDS);

    this.accumulator += frameSeconds;
    while (this.accumulator >= this.stepSeconds) {
      this.callbacks.fixedUpdate(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
    }
    this.callbacks.render(this.accumulator / this.stepSeconds, frameSeconds);
  }
}
