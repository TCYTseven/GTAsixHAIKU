import { GameLoop } from '../core/game-loop';
import type { Scene } from '../core/scene';

/** Owns the browser frame loop and swaps the active scene. */
export class Game {
  private scene: Scene | null = null;
  private readonly loop: GameLoop;

  constructor() {
    this.loop = new GameLoop({
      fixedUpdate: (dt) => this.scene?.fixedUpdate(dt),
      render: (alpha, frameSeconds) => this.scene?.render(alpha, frameSeconds),
    });
  }

  setScene(scene: Scene): void {
    this.scene?.exit();
    this.scene = scene;
    scene.enter();
  }

  start(): void {
    const tick = (timeMs: number): void => {
      this.loop.frame(timeMs / 1000);
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }
}
