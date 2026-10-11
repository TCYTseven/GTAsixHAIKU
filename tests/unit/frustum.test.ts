import { describe, expect, it } from 'vitest';
import { Camera } from '../../src/render/camera';
import { Frustum } from '../../src/render/frustum';

/** A square-aspect camera at the origin looking down +Z, with a 60 degree vertical field of view. */
function buildFrustum(): Frustum {
  const camera = new Camera();
  camera.position.set(0, 0, 0);
  camera.previousPosition.set(0, 0, 0);
  camera.updateMatrices(1, 1);
  const frustum = new Frustum();
  frustum.setFromViewProjection(camera.viewProjection);
  return frustum;
}

describe('Frustum', () => {
  it('keeps spheres ahead of the camera', () => {
    expect(buildFrustum().intersectsSphere(0, 0, 50, 1)).toBe(true);
  });

  it('rejects spheres behind the camera', () => {
    expect(buildFrustum().intersectsSphere(0, 0, -50, 1)).toBe(false);
  });

  it('rejects spheres well outside the side planes', () => {
    expect(buildFrustum().intersectsSphere(500, 0, 50, 1)).toBe(false);
  });

  it('keeps spheres that only graze a side plane', () => {
    // The left plane passes through (0, 0, z) and (-0.577z, 0, z) for this field of view, so this
    // center sits about 18 m outside the plane.
    expect(buildFrustum().intersectsSphere(50, 0, 50, 40)).toBe(true);
    expect(buildFrustum().intersectsSphere(50, 0, 50, 10)).toBe(false);
  });

  it('respects the far plane at 2000 m', () => {
    const frustum = buildFrustum();
    expect(frustum.intersectsSphere(0, 0, 2500, 1)).toBe(false);
    expect(frustum.intersectsSphere(0, 0, 2500, 600)).toBe(true);
  });
});
