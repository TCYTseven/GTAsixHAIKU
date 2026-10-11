/** A screen of the game (title menu, sandbox, gameplay). The game loop drives the active scene. */
export interface Scene {
  enter(): void;
  exit(): void;
  /** Called at the fixed 60 Hz step. Put all simulation here. */
  fixedUpdate(dt: number): void;
  /** Called once per animation frame. Put drawing and per-frame smoothing here. */
  render(alpha: number, frameSeconds: number): void;
}
