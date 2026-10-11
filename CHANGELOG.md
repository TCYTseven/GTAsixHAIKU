# Changelog

Notable changes, one section per milestone in [BUILD_PLAN.md](BUILD_PLAN.md). Each milestone is tagged in git (`m0-scaffold`, `m1-renderer`, and so on).

## M0: Project scaffold

- Vite, TypeScript (strict mode), Vitest, ESLint, and Prettier configured.
- Full-window canvas with a fixed 60 Hz simulation step driving the game loop. Frame time is clamped to 0.25 s.
- FPS readout in the top-left corner.
- Unit tests for the game loop and the FPS counter.
