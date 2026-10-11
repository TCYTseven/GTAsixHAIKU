# Vice Harbor

A single-player, third-person open-world action game that runs in the browser. The engine is ours: the game loop, renderer, physics, AI, and UI are written on top of the browser platform. The full design and milestone plan is in [BUILD_PLAN.md](BUILD_PLAN.md).

## Requirements

- Node.js 20.19 or newer, or 22.12 or newer (developed on Node 22)
- A desktop browser with WebGL2 (Chrome, Edge, Safari, or Firefox)

## Getting started

```bash
npm install
npm run dev
```

Then open the URL that Vite prints.

## Scripts

| Command                | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Starts the Vite dev server                       |
| `npm run build`        | Type checks, then writes static files to `dist/` |
| `npm run preview`      | Serves the production build locally              |
| `npm test`             | Runs the Vitest unit suite once, including soak  |
| `npm run test:watch`   | Runs Vitest in watch mode                        |
| `npm run lint`         | Runs ESLint                                      |
| `npm run format:check` | Checks Prettier formatting                       |

## Scenes

- `index.html` (default): play the game. The city layout comes from the seed in `src/data/city.config.ts`, so the same seed always builds the same city. Tuning lives in `src/data/`: player in `player.config.ts`, vehicles in `vehicles.config.ts`, population in `population.config.ts`, weapons in `weapons.config.ts`, and missions in `missions.config.ts`.
- `index.html?scene=fly`: a free-fly camera over the city, for checking the layout.
- `index.html?scene=sandbox`: the renderer test field.

## Controls

Click the canvas to capture the mouse. Esc releases the mouse and opens the pause menu.

On foot:

| Input            | Action                                     |
| ---------------- | ------------------------------------------ |
| W, A, S, D       | Walk, relative to the camera               |
| Left Shift       | Sprint                                     |
| Space            | Jump                                       |
| F                | Enter a nearby car, start a nearby mission |
| Q                | Melee strike in front of you               |
| Left click       | Fire the equipped weapon                   |
| R                | Reload                                     |
| Mouse (captured) | Orbit the camera                           |
| Esc              | Pause or resume                            |

In a car:

| Input            | Action                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| W, S             | Accelerate, brake, or reverse                                              |
| A, D             | Steer                                                                      |
| Space            | Handbrake                                                                  |
| F                | Leave the car                                                              |
| Mouse (captured) | Orbit the camera, which swings back behind the car when the mouse is still |

Free-fly scenes (`?scene=fly` and `?scene=sandbox`):

| Input            | Action        |
| ---------------- | ------------- |
| W, A, S, D       | Move          |
| Space, Left Ctrl | Rise, descend |
| Left Shift       | Move faster   |
| Mouse (captured) | Look around   |

## HUD

- Top left: frame rate.
- Top center: the current mission objective.
- Top right: minimap, rotated so forward is up.
- Bottom left: health, cash, ammo in the magazine and in reserve, and the wanted stars.
- Bottom right: speedometer while driving.

Missions are listed in `src/data/missions.config.ts` (Harbor Run, Clean Up, Lights Out). A mission starts when you press F near its marker on foot. Each mission is a list of steps: reach a point, drive to a point, or eliminate a number of targets.

Violence and reckless driving raise the wanted level, and the stars fade after you have been out of sight for a while. Higher levels send more police.

## Testing

`npm test` runs the unit suite. It includes a headless soak test that plays a few simulated minutes of random input and checks that nothing goes non-finite and no car or person ends up inside a building. For the full 30-minute run:

```bash
SOAK_MINUTES=30 npm test
```

## Project layout

Source lives in `src/`, organized by layer as described in section 4 of the build plan. Unit tests mirror that layout under `tests/unit/`.
