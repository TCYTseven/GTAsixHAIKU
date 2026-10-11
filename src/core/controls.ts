/** One fixed step of player intent, kept apart from the keyboard so simulation can run headless. */
export interface ControlState {
  /** -1 to 1. Positive moves toward the camera's view direction, or forward in a car. */
  readonly moveForward: number;
  /** -1 to 1. Positive moves toward the camera's right, or steers right in a car. */
  readonly moveRight: number;
  readonly sprint: boolean;
  /** True on the fixed step where jump was pressed. */
  readonly jump: boolean;
  /** True while the handbrake key is held. */
  readonly handbrake: boolean;
  /** True on the fixed step where the interact key was pressed: enter or leave a vehicle. */
  readonly interact: boolean;
  /** Camera yaw in radians. On-foot movement is relative to it. */
  readonly cameraYaw: number;
}
