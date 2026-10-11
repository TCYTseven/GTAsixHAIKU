import { fitCanvasToDisplay } from '../core/fit-canvas';
import { FpsCounter } from '../core/fps-counter';
import type { Scene } from '../core/scene';

const BACKGROUND = '#0b0f14';

/** M0 placeholder: a full-window canvas cleared every frame, with a live FPS readout. */
export class ClearScene implements Scene {
  private readonly context: CanvasRenderingContext2D;
  private readonly fps = new FpsCounter();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly label: HTMLElement,
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context is not available in this browser.');
    }
    this.context = context;
  }

  enter(): void {}

  exit(): void {}

  fixedUpdate(_dt: number): void {}

  render(_alpha: number, frameSeconds: number): void {
    fitCanvasToDisplay(this.canvas);
    this.context.fillStyle = BACKGROUND;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.label.textContent = `${Math.round(this.fps.tick(frameSeconds))} FPS`;
  }
}
