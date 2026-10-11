import { fitCanvasToDisplay } from '../core/fit-canvas';
import { FpsCounter } from '../core/fps-counter';
import { Input } from '../core/input';
import type { Scene } from '../core/scene';
import type { CityConfig } from '../data/schemas';
import { createMat4, mat4FromTransform, type Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Camera } from '../render/camera';
import { DEFAULT_ENVIRONMENT } from '../render/environment';
import { createWebGL2Context } from '../render/gl-context';
import { Mesh } from '../render/mesh';
import { Renderer } from '../render/renderer';
import { buildStaticChunks } from '../world/chunk';
import { generateCity } from '../world/city-generator';
import { applyMouseLook, stepFreeFly } from './free-fly';

const FLY_SPEED = 60;
const LOOK_RADIANS_PER_PIXEL = 0.0022;
const START_POSITION = new Vec3(0, 90, -430);
const START_PITCH = -0.3;

interface DrawableChunk {
  readonly center: Vec3;
  readonly radius: number;
  readonly mesh: Mesh;
}

/**
 * M2 city view: a free-fly camera over the generated city. Each chunk is one draw call and is
 * skipped when its bounding sphere falls outside the view frustum.
 */
export class CityScene implements Scene {
  private readonly gl: WebGL2RenderingContext;
  private readonly renderer: Renderer;
  private readonly input = new Input();
  private readonly camera = new Camera();
  private readonly fps = new FpsCounter();
  private readonly chunks: DrawableChunk[];
  private readonly identity: Mat4 = mat4FromTransform(createMat4(), 0, 0, 0, 0);
  private readonly seed: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly label: HTMLElement,
    config: CityConfig,
  ) {
    this.gl = createWebGL2Context(canvas);
    this.renderer = new Renderer(this.gl);
    this.seed = config.seed;
    const layout = generateCity(config);
    this.chunks = buildStaticChunks(layout, config.chunkSize).map((chunk) => ({
      center: chunk.center,
      radius: chunk.radius,
      mesh: new Mesh(this.gl, chunk.mesh),
    }));
    this.camera.position.copy(START_POSITION);
    this.camera.previousPosition.copy(START_POSITION);
    this.camera.pitch = START_PITCH;
  }

  enter(): void {
    this.input.attach(this.canvas);
  }

  exit(): void {
    this.input.detach();
  }

  fixedUpdate(dt: number): void {
    stepFreeFly(this.camera, this.input, dt, FLY_SPEED);
  }

  render(alpha: number, frameSeconds: number): void {
    fitCanvasToDisplay(this.canvas);
    applyMouseLook(this.camera, this.input, LOOK_RADIANS_PER_PIXEL);
    this.camera.updateMatrices(alpha, this.canvas.width / this.canvas.height);

    this.renderer.beginFrame(this.camera, DEFAULT_ENVIRONMENT);
    this.renderer.drawSky();
    let visible = 0;
    for (const chunk of this.chunks) {
      if (this.renderer.isSphereVisible(chunk.center, chunk.radius)) {
        this.renderer.drawMesh(chunk.mesh, this.identity);
        visible += 1;
      }
    }

    const fps = Math.round(this.fps.tick(frameSeconds));
    this.label.textContent =
      `${fps} FPS | ${this.renderer.stats.drawCalls} draws | ` +
      `${visible}/${this.chunks.length} chunks | seed ${this.seed}`;
  }
}
