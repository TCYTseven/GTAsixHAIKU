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

- `index.html` (default): a fly-through of the generated city. The layout comes from the seed in `src/data/city.config.ts`, so the same seed always builds the same city.
- `index.html?scene=sandbox`: the renderer test field from M1. It is not part of normal play.

## Controls

Click the canvas to capture the mouse. Gameplay controls arrive with later milestones and are listed in section 9 of the build plan.

| Input            | Action                     |
| ---------------- | -------------------------- |
| W, A, S, D       | Move                       |
| Space, Left Ctrl | Rise, descend              |
| Left Shift       | Move faster                |
| Click the canvas | Capture the mouse for look |
| Mouse (captured) | Look around                |
| Esc              | Release the mouse          |

## Project layout

Source lives in `src/`, organized by layer as described in section 4 of the build plan. Unit tests mirror that layout under `tests/unit/`.
