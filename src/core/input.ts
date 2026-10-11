export interface MouseDelta {
  x: number;
  y: number;
}

/**
 * Keyboard and mouse state. Held inputs read continuously. Presses latch until a consumer takes
 * them, so a tap that lands between two fixed steps still counts.
 */
export class Input {
  private readonly keysHeld = new Set<string>();
  private readonly keysLatched = new Set<string>();
  private readonly buttonsHeld = new Set<number>();
  private readonly buttonsLatched = new Set<number>();
  private mouseX = 0;
  private mouseY = 0;
  private canvas: HTMLCanvasElement | null = null;
  private pointerLocked = false;

  /** Starts listening to the window and the canvas. Clicking the canvas captures the mouse. */
  attach(canvas: HTMLCanvasElement): void {
    this.detach();
    this.canvas = canvas;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('blur', this.handleBlur);
    canvas.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  detach(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('blur', this.handleBlur);
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
    this.canvas = null;
    this.clear();
  }

  get isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  isHeld(code: string): boolean {
    return this.keysHeld.has(code);
  }

  /** Returns true once for each key press. */
  consumePress(code: string): boolean {
    return this.keysLatched.delete(code);
  }

  isButtonHeld(button: number): boolean {
    return this.buttonsHeld.has(button);
  }

  /** Returns true once for each mouse button press. */
  consumeButtonPress(button: number): boolean {
    return this.buttonsLatched.delete(button);
  }

  /** Mouse movement since the last call, in pixels (only while the pointer is captured). */
  takeMouseDelta(): MouseDelta {
    const delta = { x: this.mouseX, y: this.mouseY };
    this.mouseX = 0;
    this.mouseY = 0;
    return delta;
  }

  onKeyDown(code: string, repeat = false): void {
    this.keysHeld.add(code);
    if (!repeat) {
      this.keysLatched.add(code);
    }
  }

  onKeyUp(code: string): void {
    this.keysHeld.delete(code);
  }

  onMouseDown(button: number): void {
    this.buttonsHeld.add(button);
    this.buttonsLatched.add(button);
  }

  onMouseUp(button: number): void {
    this.buttonsHeld.delete(button);
  }

  onMouseMove(dx: number, dy: number): void {
    this.mouseX += dx;
    this.mouseY += dy;
  }

  private clear(): void {
    this.keysHeld.clear();
    this.keysLatched.clear();
    this.buttonsHeld.clear();
    this.buttonsLatched.clear();
    this.mouseX = 0;
    this.mouseY = 0;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
    }
    this.onKeyDown(event.code, event.repeat);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.onKeyUp(event.code);
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (!this.pointerLocked) {
      void this.canvas?.requestPointerLock();
    }
    this.onMouseDown(event.button);
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    this.onMouseUp(event.button);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (this.pointerLocked) {
      this.onMouseMove(event.movementX, event.movementY);
    }
  };

  private readonly handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  };

  private readonly handleBlur = (): void => {
    this.clear();
  };
}
