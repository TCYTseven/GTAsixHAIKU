import './style.css';
import { loadGameConfig } from './data/load-config';
import { CityScene } from './game/city-scene';
import { Game } from './game/game';
import { SandboxScene } from './game/sandbox-scene';

const canvas = document.getElementById('game-canvas');
const fpsLabel = document.getElementById('fps-counter');
const fatalError = document.getElementById('fatal-error');
if (
  !(canvas instanceof HTMLCanvasElement) ||
  !(fpsLabel instanceof HTMLElement) ||
  !(fatalError instanceof HTMLElement)
) {
  throw new Error('index.html is missing #game-canvas, #fps-counter, or #fatal-error.');
}

try {
  const config = loadGameConfig();
  // `?scene=sandbox` opens the renderer test field instead of the city.
  const wantsSandbox = new URLSearchParams(window.location.search).get('scene') === 'sandbox';
  const scene = wantsSandbox
    ? new SandboxScene(canvas, fpsLabel)
    : new CityScene(canvas, fpsLabel, config.city);

  const game = new Game();
  game.setScene(scene);
  game.start();
} catch (error) {
  fpsLabel.hidden = true;
  fatalError.hidden = false;
  fatalError.textContent = error instanceof Error ? error.message : String(error);
  console.error(error);
}
