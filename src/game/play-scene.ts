import type { ControlState } from '../core/controls';
import { fitCanvasToDisplay } from '../core/fit-canvas';
import { FpsCounter } from '../core/fps-counter';
import { Input } from '../core/input';
import type { Scene } from '../core/scene';
import type { GameConfig } from '../data/load-config';
import { createMat4, mat4FromTransform, type Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Camera } from '../render/camera';
import { DEFAULT_ENVIRONMENT } from '../render/environment';
import { buildFigureMesh, type FigurePalette } from '../render/figure-mesh';
import { createWebGL2Context } from '../render/gl-context';
import { Mesh } from '../render/mesh';
import { Renderer } from '../render/renderer';
import { buildStaticChunks } from '../world/chunk';
import { FollowCamera } from './follow-camera';
import { World } from './world';

const LOOK_RADIANS_PER_PIXEL = 0.0022;
const FIGURE_PALETTE: FigurePalette = {
  jacket: [0.2, 0.32, 0.5],
  pants: [0.14, 0.14, 0.18],
  skin: [0.86, 0.68, 0.52],
  accent: [0.05, 0.05, 0.06],
};

interface DrawableChunk {
  readonly center: Vec3;
  readonly radius: number;
  readonly mesh: Mesh;
}

/** Walking around the generated city with a third-person camera. */
export class PlayScene implements Scene {
  private readonly gl: WebGL2RenderingContext;
  private readonly renderer: Renderer;
  private readonly input = new Input();
  private readonly camera = new Camera();
  private readonly follow: FollowCamera;
  private readonly fps = new FpsCounter();
  private readonly world: World;
  private readonly chunks: DrawableChunk[];
  private readonly figure: Mesh;
  private readonly identity: Mat4 = mat4FromTransform(createMat4(), 0, 0, 0, 0);
  private readonly figureModel: Mat4 = createMat4();
  private readonly focus = new Vec3();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly label: HTMLElement,
    config: GameConfig,
  ) {
    this.gl = createWebGL2Context(canvas);
    this.renderer = new Renderer(this.gl);
    this.world = new World(config);
    this.follow = new FollowCamera(this.camera, config.player);
    this.chunks = buildStaticChunks(this.world.layout, config.city.chunkSize).map((chunk) => ({
      center: chunk.center,
      radius: chunk.radius,
      mesh: new Mesh(this.gl, chunk.mesh),
    }));
    this.figure = new Mesh(this.gl, buildFigureMesh(FIGURE_PALETTE));
  }

  enter(): void {
    this.input.attach(this.canvas);
  }

  exit(): void {
    this.input.detach();
  }

  fixedUpdate(dt: number): void {
    const controls: ControlState = {
      moveForward: axis(this.input.isHeld('KeyW'), this.input.isHeld('KeyS')),
      moveRight: axis(this.input.isHeld('KeyD'), this.input.isHeld('KeyA')),
      sprint: this.input.isHeld('ShiftLeft'),
      jump: this.input.consumePress('Space'),
      cameraYaw: this.camera.yaw,
    };
    this.world.step(dt, controls);
  }

  render(alpha: number, frameSeconds: number): void {
    fitCanvasToDisplay(this.canvas);
    const look = this.input.takeMouseDelta();
    this.follow.addLook(-look.x * LOOK_RADIANS_PER_PIXEL, -look.y * LOOK_RADIANS_PER_PIXEL);

    const player = this.world.player;
    player.interpolatedPosition(alpha, this.focus);
    this.follow.update(
      this.focus,
      frameSeconds,
      this.world.collision,
      this.canvas.width / this.canvas.height,
    );

    this.renderer.beginFrame(this.camera, DEFAULT_ENVIRONMENT);
    this.renderer.drawSky();
    let visible = 0;
    for (const chunk of this.chunks) {
      if (this.renderer.isSphereVisible(chunk.center, chunk.radius)) {
        this.renderer.drawMesh(chunk.mesh, this.identity);
        visible += 1;
      }
    }
    mat4FromTransform(this.figureModel, this.focus.x, this.focus.y, this.focus.z, player.heading);
    this.renderer.drawMesh(this.figure, this.figureModel);

    const fps = Math.round(this.fps.tick(frameSeconds));
    this.label.textContent =
      `${fps} FPS | ${this.renderer.stats.drawCalls} draws | ` +
      `${visible}/${this.chunks.length} chunks`;
  }
}

function axis(positive: boolean, negative: boolean): number {
  return (positive ? 1 : 0) - (negative ? 1 : 0);
}
