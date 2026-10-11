import './style.css';
import { loadGameConfig } from './data/load-config';
import { CityScene } from './game/city-scene';
import { Game } from './game/game';
import { PlayScene } from './game/play-scene';
import { SandboxScene } from './game/sandbox-scene';

const canvas = document.getElementById('game-canvas');
const fpsLabel = document.getElementById('fps-counter');
const speedometer = document.getElementById('speedometer');
const prompt = document.getElementById('prompt');
const fatalError = document.getElementById('fatal-error');
if (
  !(canvas instanceof HTMLCanvasElement) ||
  !(fpsLabel instanceof HTMLElement) ||
  !(speedometer instanceof HTMLElement) ||
  !(prompt instanceof HTMLElement) ||
  !(fatalError instanceof HTMLElement)
) {
  throw new Error('index.html is missing one of the required elements.');
}

try {
  const config = loadGameConfig();
  // `?scene=fly` opens the free-fly city view, and `?scene=sandbox` opens the renderer test field.
  const sceneName = new URLSearchParams(window.location.search).get('scene');
  let scene;
  if (sceneName === 'sandbox') {
    scene = new SandboxScene(canvas, fpsLabel);
  } else if (sceneName === 'fly') {
    scene = new CityScene(canvas, fpsLabel, config.city);
  } else {
    scene = new PlayScene(canvas, fpsLabel, { speedometer, prompt }, config);
  }

  const game = new Game();
  game.setScene(scene);
  game.start();
} catch (error) {
  fpsLabel.hidden = true;
  fatalError.hidden = false;
  fatalError.textContent = error instanceof Error ? error.message : String(error);
  console.error(error);
}
