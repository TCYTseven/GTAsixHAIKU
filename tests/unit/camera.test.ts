import { describe, expect, it } from 'vitest';
import { mat4TransformPoint } from '../../src/math/mat4';
import { Vec3 } from '../../src/math/vec3';
import { Camera } from '../../src/render/camera';

describe('Camera', () => {
  it('looks along +Z at yaw 0 and turns left as yaw increases', () => {
    const camera = new Camera();
    const facing = camera.flatForward(new Vec3());
    expect(facing.x).toBeCloseTo(0, 12);
    expect(facing.z).toBeCloseTo(1, 12);

    camera.addLook(Math.PI / 2, 0);
    const turned = camera.flatForward(new Vec3());
    expect(turned.x).toBeCloseTo(1, 12);
    expect(turned.z).toBeCloseTo(0, 12);
  });

  it('keeps the ground-plane right vector perpendicular to forward', () => {
    const camera = new Camera();
    camera.addLook(0.7, 0);
    const forward = camera.flatForward(new Vec3());
    const right = camera.flatRight(new Vec3());
    expect(forward.dot(right)).toBeCloseTo(0, 12);
    expect(right.length()).toBeCloseTo(1, 12);
  });

  it('clamps pitch just short of straight up and down', () => {
    const camera = new Camera();
    camera.addLook(0, 10);
    expect(camera.pitch).toBeLessThan(Math.PI / 2);
    camera.addLook(0, -20);
    expect(camera.pitch).toBeGreaterThan(-Math.PI / 2);
  });

  it('interpolates the eye between the last two fixed steps', () => {
    const camera = new Camera();
    camera.position.set(0, 0, 0);
    camera.beginStep();
    camera.position.set(10, 0, 0);
    camera.updateMatrices(0.25, 1);
    expect(camera.eye.x).toBeCloseTo(2.5, 12);
  });

  it('puts a point ahead of the eye at negative view-space depth', () => {
    const camera = new Camera();
    camera.position.set(0, 0, 0);
    camera.updateMatrices(1, 1);
    const inView = mat4TransformPoint(new Vec3(), camera.view, new Vec3(0, 0, 10));
    expect(inView.z).toBeCloseTo(-10, 12);
  });
});
