import { fitCanvasToDisplay } from '../core/fit-canvas';
import { FpsCounter } from '../core/fps-counter';
import { Input } from '../core/input';
import { createRng } from '../core/rng';
import type { Scene } from '../core/scene';
import { createMat4, mat4FromTransform } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Camera } from '../render/camera';
import { type Rgb } from '../render/color';
import { createWebGL2Context } from '../render/gl-context';
import { DEFAULT_ENVIRONMENT } from '../render/environment';
import { Mesh } from '../render/mesh';
import { MeshBuilder, type MeshData } from '../render/mesh-builder';
import { Renderer } from '../render/renderer';

const MOVE_SPEED = 12;
const BOOST_MULTIPLIER = 3;
const LOOK_RADIANS_PER_PIXEL = 0.0022;
const SANDBOX_SEED = 1977;

const PALETTE: readonly Rgb[] = [
  [0.88, 0.36, 0.22],
  [0.22, 0.6, 0.86],
  [0.95, 0.8, 0.3],
  [0.55, 0.82, 0.5],
  [0.8, 0.8, 0.84],
  [0.6, 0.36, 0.78],
];

/**
 * M1 sandbox: a field of lit colored boxes, ramps, and columns under the sky and fog, with a
 * free-fly camera. WASD moves, Space and Ctrl rise and fall, Shift boosts, and mouse look needs a
 * click on the canvas to capture the pointer.
 */
export class SandboxScene implements Scene {
  private readonly gl: WebGL2RenderingContext;
  private readonly renderer: Renderer;
  private readonly input = new Input();
  private readonly camera = new Camera();
  private readonly fps = new FpsCounter();
  private readonly ground: Mesh;
  private readonly props: Mesh;
  private readonly identity = mat4FromTransform(createMat4(), 0, 0, 0, 0);
  private readonly scratchForward = new Vec3();
  private readonly scratchRight = new Vec3();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly label: HTMLElement,
  ) {
    this.gl = createWebGL2Context(canvas);
    this.renderer = new Renderer(this.gl);
    const world = buildSandboxWorld(SANDBOX_SEED);
    this.ground = new Mesh(this.gl, world.ground);
    this.props = new Mesh(this.gl, world.props);
    this.camera.position.set(0, 4, -40);
    this.camera.previousPosition.copy(this.camera.position);
  }

  enter(): void {
    this.input.attach(this.canvas);
  }

  exit(): void {
    this.input.detach();
  }

  fixedUpdate(dt: number): void {
    this.camera.beginStep();
    const forward = this.camera.flatForward(this.scratchForward);
    const right = this.camera.flatRight(this.scratchRight);

    let along = 0;
    let across = 0;
    let lift = 0;
    if (this.input.isHeld('KeyW')) along += 1;
    if (this.input.isHeld('KeyS')) along -= 1;
    if (this.input.isHeld('KeyD')) across += 1;
    if (this.input.isHeld('KeyA')) across -= 1;
    if (this.input.isHeld('Space')) lift += 1;
    if (this.input.isHeld('ControlLeft')) lift -= 1;

    const boost = this.input.isHeld('ShiftLeft') ? BOOST_MULTIPLIER : 1;
    const step = MOVE_SPEED * boost * dt;
    const position = this.camera.position;
    position.addScaled(forward, along * step);
    position.addScaled(right, across * step);
    position.y += lift * step;
  }

  render(alpha: number, frameSeconds: number): void {
    fitCanvasToDisplay(this.canvas);
    const look = this.input.takeMouseDelta();
    this.camera.addLook(-look.x * LOOK_RADIANS_PER_PIXEL, -look.y * LOOK_RADIANS_PER_PIXEL);
    this.camera.updateMatrices(alpha, this.canvas.width / this.canvas.height);

    this.renderer.beginFrame(this.camera, DEFAULT_ENVIRONMENT);
    this.renderer.drawSky();
    this.renderer.drawMesh(this.ground, this.identity);
    this.renderer.drawMesh(this.props, this.identity);

    const fps = Math.round(this.fps.tick(frameSeconds));
    this.label.textContent = `${fps} FPS | ${this.renderer.stats.drawCalls} draws`;
  }
}

function buildSandboxWorld(seed: number): { ground: MeshData; props: MeshData } {
  const rng = createRng(seed);

  const ground = new MeshBuilder()
    .addBox(new Vec3(-600, -0.5, -600), new Vec3(600, 0, 600), [0.26, 0.32, 0.25])
    .build();

  const props = new MeshBuilder();
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      if (rng.chance(0.25)) {
        continue;
      }
      const x = -60 + i * 10;
      const z = 10 + j * 10;
      const height = rng.range(2, 28);
      props.addBox(new Vec3(x - 3, 0, z - 3), new Vec3(x + 3, height, z + 3), rng.pick(PALETTE));
    }
  }
  props.addRamp(new Vec3(-90, 0, 0), new Vec3(-70, 3, 20), [0.7, 0.7, 0.72]);
  for (let i = 0; i < 8; i++) {
    props.addCylinder(new Vec3(40 + i * 6, 0, -20), 1.5, 10 + i * 2, 16, rng.pick(PALETTE));
  }
  // A distant row of towers, so the fog haze is visible above the near field.
  for (let i = -5; i <= 5; i++) {
    const x = i * 40;
    const z = 500 + Math.abs(i) * 30;
    props.addBox(
      new Vec3(x - 10, 0, z - 10),
      new Vec3(x + 10, rng.range(120, 200), z + 10),
      rng.pick(PALETTE),
    );
  }

  return { ground: ground, props: props.build() };
}
