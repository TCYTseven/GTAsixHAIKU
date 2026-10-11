/** Reports frames per second, refreshed once per averaging window. */
export class FpsCounter {
  private frames = 0;
  private elapsed = 0;
  private fps = 0;

  constructor(private readonly windowSeconds = 0.5) {}

  /** Records one frame. Returns the most recent completed FPS value. */
  tick(frameSeconds: number): number {
    this.frames += 1;
    this.elapsed += frameSeconds;
    if (this.elapsed >= this.windowSeconds) {
      this.fps = this.frames / this.elapsed;
      this.frames = 0;
      this.elapsed = 0;
    }
    return this.fps;
  }

  get value(): number {
    return this.fps;
  }
}
