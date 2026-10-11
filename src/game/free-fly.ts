import type { Input } from '../core/input';
import { Vec3 } from '../math/vec3';
import type { Camera } from '../render/camera';

const BOOST_MULTIPLIER = 3;
const scratchForward = new Vec3();
const scratchRight = new Vec3();

/**
 * Moves the camera from held keys: W and S along the view, A and D across it, Space and Ctrl up
 * and down. Shift boosts speed. Call once per fixed step.
 */
export function stepFreeFly(camera: Camera, input: Input, dt: number, speed: number): void {
  camera.beginStep();
  const forward = camera.flatForward(scratchForward);
  const right = camera.flatRight(scratchRight);

  let along = 0;
  let across = 0;
  let lift = 0;
  if (input.isHeld('KeyW')) along += 1;
  if (input.isHeld('KeyS')) along -= 1;
  if (input.isHeld('KeyD')) across += 1;
  if (input.isHeld('KeyA')) across -= 1;
  if (input.isHeld('Space')) lift += 1;
  if (input.isHeld('ControlLeft')) lift -= 1;

  const step = speed * (input.isHeld('ShiftLeft') ? BOOST_MULTIPLIER : 1) * dt;
  camera.position.addScaled(forward, along * step).addScaled(right, across * step);
  camera.position.y += lift * step;
}

/** Turns the camera by this frame's mouse movement. Call once per rendered frame. */
export function applyMouseLook(camera: Camera, input: Input, radiansPerPixel: number): void {
  const look = input.takeMouseDelta();
  camera.addLook(-look.x * radiansPerPixel, -look.y * radiansPerPixel);
}
