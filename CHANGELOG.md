# Changelog

Notable changes, one section per milestone in [BUILD_PLAN.md](BUILD_PLAN.md). Each milestone is tagged in git (`m0-scaffold`, `m1-renderer`, and so on).

## M1: Renderer and camera

- WebGL2 context, shader program with cached uniforms, and a lit vertex-color shader with hemisphere ambient light, one sun, and linear fog.
- Gradient sky drawn from a single fullscreen triangle before the world.
- Mesh builder for boxes, quads, ramps, and cylinders, with outward winding checked by tests.
- Vec3 and Mat4 math with preallocated scratch objects for hot paths.
- Free-fly camera with interpolation between fixed steps, plus a latching input layer.
- Sandbox scene: a field of lit boxes, ramps, columns, and distant towers in fog.

## M0: Project scaffold

- Vite, TypeScript (strict mode), Vitest, ESLint, and Prettier configured.
- Full-window canvas with a fixed 60 Hz simulation step driving the game loop. Frame time is clamped to 0.25 s.
- FPS readout in the top-left corner.
- Unit tests for the game loop and the FPS counter.
