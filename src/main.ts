import './style.css';
import { Game } from './game/game';
import { SandboxScene } from './game/sandbox-scene';

const canvas = document.getElementById('game-canvas');
const fpsLabel = document.getElementById('fps-counter');
if (!(canvas instanceof HTMLCanvasElement) || !(fpsLabel instanceof HTMLElement)) {
  throw new Error('index.html is missing #game-canvas or #fps-counter.');
}

const game = new Game();
game.setScene(new SandboxScene(canvas, fpsLabel));
game.start();
