export const DEG_TO_RAD = Math.PI / 180;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential smoothing of `current` toward `target`. */
export function damp(current: number, target: number, sharpness: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-sharpness * dt));
}

/** Moves `current` toward `target` by at most `maxDelta`. */
export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) {
    return Math.min(current + maxDelta, target);
  }
  return Math.max(current - maxDelta, target);
}

/** Wraps an angle in radians into the range [-PI, PI). */
export function wrapAngle(angle: number): number {
  const turn = 2 * Math.PI;
  return ((((angle + Math.PI) % turn) + turn) % turn) - Math.PI;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
