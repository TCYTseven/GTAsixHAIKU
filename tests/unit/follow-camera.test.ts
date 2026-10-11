import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYER_CONFIG } from '../../src/data/player.config';
import { FollowCamera } from '../../src/game/follow-camera';
import { Aabb } from '../../src/math/aabb';
import { Vec3 } from '../../src/math/vec3';
import { Camera } from '../../src/render/camera';
import { CollisionWorld } from '../../src/world/collision-world';

const FRAME = 1 / 60;

function setup(): { camera: Camera; follow: FollowCamera } {
  const camera = new Camera();
  return { camera, follow: new FollowCamera(camera, DEFAULT_PLAYER_CONFIG) };
}

function settle(follow: FollowCamera, world: CollisionWorld, frames: number): void {
  for (let i = 0; i < frames; i++) {
    follow.update(new Vec3(0, 0, 0), FRAME, world, 1);
  }
}

describe('FollowCamera', () => {
  it('sits at the configured distance when nothing blocks the view', () => {
    const { follow } = setup();
    settle(follow, new CollisionWorld([]), 180);
    expect(follow.currentDistance).toBeCloseTo(DEFAULT_PLAYER_CONFIG.cameraDistance, 3);
  });

  it('pulls in behind a wall, then eases back out once the wall is gone', () => {
    const { follow } = setup();
    // With yaw 0 the camera sits behind the focus, at negative z. This wall crosses that line at
    // z = -2.5, so the camera should settle just in front of it.
    const wall = new CollisionWorld([new Aabb(-5, 0, -2.6, 5, 10, -2.4)]);
    settle(follow, wall, 240);
    expect(follow.currentDistance).toBeGreaterThan(2);
    expect(follow.currentDistance).toBeLessThan(2.6);

    settle(follow, new CollisionWorld([]), 600);
    expect(follow.currentDistance).toBeCloseTo(DEFAULT_PLAYER_CONFIG.cameraDistance, 2);
  });

  it('keeps pitch inside the configured range', () => {
    const { camera, follow } = setup();
    follow.addLook(0, -10);
    expect(camera.pitch).toBeCloseTo(DEFAULT_PLAYER_CONFIG.cameraMinPitch, 12);
    follow.addLook(0, 10);
    expect(camera.pitch).toBeCloseTo(DEFAULT_PLAYER_CONFIG.cameraMaxPitch, 12);
  });
});
