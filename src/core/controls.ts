/** One fixed step of player intent, kept apart from the keyboard so simulation can run headless. */
export interface ControlState {
  /** -1 to 1. Positive moves toward the camera's view direction. */
  readonly moveForward: number;
  /** -1 to 1. Positive moves toward the camera's right. */
  readonly moveRight: number;
  readonly sprint: boolean;
  /** True on the fixed step where jump was pressed. */
  readonly jump: boolean;
  /** Camera yaw in radians. Movement is relative to it. */
  readonly cameraYaw: number;
}
