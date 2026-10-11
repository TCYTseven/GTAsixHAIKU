import './style.css';
import { Game } from './game/game';
import { ClearScene } from './game/clear-scene';

const canvas = document.getElementById('game-canvas');
const fpsLabel = document.getElementById('fps-counter');
if (!(canvas instanceof HTMLCanvasElement) || !(fpsLabel instanceof HTMLElement)) {
  throw new Error('index.html is missing #game-canvas or #fps-counter.');
}

const game = new Game();
game.setScene(new ClearScene(canvas, fpsLabel));
game.start();
