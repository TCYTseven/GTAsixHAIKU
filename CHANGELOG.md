# Changelog

Notable changes, one section per milestone in [BUILD_PLAN.md](BUILD_PLAN.md). Each milestone is tagged in git (`m0-scaffold`, `m1-renderer`, and so on).

## M9: Polish

- Synthesized sound effects with the Web Audio API, so no audio files are shipped. Engine pitch follows speed, and there are gunshots, impacts, and a siren while the player has a wanted level. Audio starts on the Start click, as browsers require.
- Headless soak test: random play for a few simulated minutes, checking for non-finite values, runaway car speeds, and bodies inside buildings. `SOAK_MINUTES=30 npm test` runs the full 30-minute version, which passes.
- Not done: a day and night cycle, an F3 profiling overlay, tracer and pickup visuals, and a separate police config file. Police tuning is currently in code.
- Performance has not been measured on target hardware. Headless software rendering runs at about 10 to 17 FPS, which says nothing about a real GPU.

## M8: Missions and HUD

- Data-driven missions in `missions.config.ts`: Harbor Run, Clean Up, and Lights Out. Each step is reach a point, drive to a point, or eliminate targets.
- Mission markers are blocks on the walkways. Press F near a marker on foot to start.
- Objective line at the top of the screen, a toast when a mission completes, and a rotating minimap in the top right.
- Title and pause menus. Esc pauses and resumes.

## M7: Wanted and police

- Wanted level from heat points, with five thresholds mapped to stars. Heat decays once the player has been out of sight for a while.
- Police cars scale with the wanted level. They patrol, search the last known spot, or pursue. A car stuck for more than 3 seconds is moved to the nearest intersection.
- Stars appear in the status line.

## M6: Combat and death

- Melee cone in front of the player and a hitscan pistol with distance falloff, tested against the world, pedestrians, and cars.
- Reload from a magazine and reserve. Cash pickups are scattered on the walkways and collected by walking over them.
- Death sends the player to the hospital with a respawn. Tests cover the death and respawn cycle.

## M5: NPCs and traffic

- Pedestrians walk along walkways and flee from fast cars nearby.
- Traffic follows lanes with pure-pursuit steering, keeps a gap from the car ahead, obeys signals that alternate by axis every 12 seconds, and makes random turns at intersections.
- Population spawns and despawns outside the player's view, within a distance band around the player.

## M4: Vehicles

- Arcade car model with yaw from steering and speed, a handbrake that reduces grip, and drag with a quadratic engine taper.
- Cars collide with buildings and each other through oriented-box separation tests, with a small bounce. Impacts above a closing speed of 6 m/s cause damage.
- Enter and leave with F. A chase camera follows the car and swings back behind it when the mouse is still.

## M3: On-foot movement

- Box-shaped body physics: X then Z motion, step-up onto ledges up to 0.4 m when grounded, gravity, and a ground probe that snaps the body onto support within the step height.
- Player controller with camera-relative walking, sprint, turning toward the movement direction, and jumping.
- Collision index on a 10 m grid, with box queries and an Amanatides and Woo raycast. The city's pads, buildings, and invisible perimeter walls are colliders.
- Third-person orbit camera. It pulls in quickly when a building is between the player and the camera, and eases back out.
- Player tuning in a Zod-validated config file.
- The city walk is now the default scene, and the fly-through moves to `?scene=fly`.
- Tests cover ray and box intersection, grid queries, body physics (walls, ledges, jumps, landings, curbs), a random 30-second walk that must never end inside a collider, and camera wall avoidance.

## M2: City generation

- Seeded city of 16 by 16 blocks (about 960 m square). Streets run 60 m apart, with two lanes each way and raised sidewalks.
- Each block holds 2 to 4 buildings, 8 to 60 m tall, in a random palette. Buildings have darker roof caps.
- Directed lane graph with one node per intersection and one edge per lane per direction. Right-hand traffic. A* routing over intersections.
- Static geometry is grouped into 100 m chunks. Each chunk draws in one call and is culled against the view frustum using its bounding sphere.
- Config is validated with Zod at startup. An invalid config shows a readable error panel instead of a blank screen.
- City fly-through is the default scene. The M1 sandbox moves to `?scene=sandbox`.
- Tests cover determinism by seed, building placement, road and sidewalk clearance, lane direction, routing, chunk bounds, frustum tests, and config validation.

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
