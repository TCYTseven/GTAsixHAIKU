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

## Project layout

Source lives in `src/`, organized by layer as described in section 4 of the build plan. Unit tests mirror that layout under `tests/unit/`.
