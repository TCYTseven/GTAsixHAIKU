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
| `npm test`             | Runs the Vitest unit suite once                  |
| `npm run test:watch`   | Runs Vitest in watch mode                        |
| `npm run lint`         | Runs ESLint                                      |
| `npm run format:check` | Checks Prettier formatting                       |

## Scenes

- `index.html` (default): walk the generated city. The layout comes from the seed in `src/data/city.config.ts`, so the same seed always builds the same city. Player tuning lives in `src/data/player.config.ts`.
- `index.html?scene=fly`: a free-fly camera over the city, for checking the layout.
- `index.html?scene=sandbox`: the renderer test field from M1.

## Controls

Click the canvas to capture the mouse. Gameplay controls for driving, combat, and missions arrive with later milestones and are listed in section 9 of the build plan.

On foot:

| Input            | Action                       |
| ---------------- | ---------------------------- |
| W, A, S, D       | Walk, relative to the camera |
| Left Shift       | Sprint                       |
| Space            | Jump                         |
| Click the canvas | Capture the mouse            |
| Mouse (captured) | Orbit the camera             |
| Esc              | Release the mouse            |

Free-fly scenes (`?scene=fly` and `?scene=sandbox`):

| Input            | Action        |
| ---------------- | ------------- |
| W, A, S, D       | Move          |
| Space, Left Ctrl | Rise, descend |
| Left Shift       | Move faster   |
| Mouse (captured) | Look around   |

## Project layout

Source lives in `src/`, organized by layer as described in section 4 of the build plan. Unit tests mirror that layout under `tests/unit/`.
