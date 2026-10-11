import type { ControlState } from '../core/controls';
import { fitCanvasToDisplay } from '../core/fit-canvas';
import { FpsCounter } from '../core/fps-counter';
import { Input } from '../core/input';
import type { Scene } from '../core/scene';
import type { GameConfig } from '../data/load-config';
import type { ChaseCameraConfig } from '../data/schemas';
import { createMat4, mat4FromTransform, type Mat4 } from '../math/mat4';
import { clamp } from '../math/util';
import { Vec3 } from '../math/vec3';
import { Camera } from '../render/camera';
import { DEFAULT_ENVIRONMENT } from '../render/environment';
import { buildFigureMesh, type FigurePalette } from '../render/figure-mesh';
import { createWebGL2Context } from '../render/gl-context';
import { Mesh } from '../render/mesh';
import { Renderer } from '../render/renderer';
import { buildVehicleMesh } from '../render/vehicle-mesh';
import { buildStaticChunks } from '../world/chunk';
import { FollowCamera, type OrbitShot } from './follow-camera';
import { World } from './world';

const LOOK_RADIANS_PER_PIXEL = 0.0022;
const FIGURE_PALETTE: FigurePalette = {
  jacket: [0.2, 0.32, 0.5],
  pants: [0.14, 0.14, 0.18],
  skin: [0.86, 0.68, 0.52],
  accent: [0.05, 0.05, 0.06],
};
const REVERSING_SPEED = -0.5;

/** DOM readouts the play scene keeps up to date. */
export interface PlayHud {
  readonly speedometer: HTMLElement;
  readonly prompt: HTMLElement;
}

interface DrawableChunk {
  readonly center: Vec3;
  readonly radius: number;
  readonly mesh: Mesh;
}

/** Walking the city on foot, or driving through it, with a third-person camera. */
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
  private readonly vehicleMeshes = new Map<string, Mesh>();
  private readonly chase: ChaseCameraConfig;
  private readonly identity: Mat4 = mat4FromTransform(createMat4(), 0, 0, 0, 0);
  private readonly model: Mat4 = createMat4();
  private readonly focus = new Vec3();
  private readonly carPosition = new Vec3();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly label: HTMLElement,
    private readonly hud: PlayHud,
    config: GameConfig,
  ) {
    this.gl = createWebGL2Context(canvas);
    this.renderer = new Renderer(this.gl);
    this.world = new World(config);
    this.follow = new FollowCamera(this.camera, config.player);
    this.chase = config.vehicles.chaseCamera;
    this.chunks = buildStaticChunks(this.world.layout, config.city.chunkSize).map((chunk) => ({
      center: chunk.center,
      radius: chunk.radius,
      mesh: new Mesh(this.gl, chunk.mesh),
    }));
    this.figure = new Mesh(this.gl, buildFigureMesh(FIGURE_PALETTE));
    for (const type of config.vehicles.types) {
      const data = buildVehicleMesh(type.length, type.width, type.height);
      this.vehicleMeshes.set(type.id, new Mesh(this.gl, data));
    }
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
      handbrake: this.input.isHeld('Space'),
      interact: this.input.consumePress('KeyF'),
      cameraYaw: this.camera.yaw,
    };
    this.world.step(dt, controls);
  }

  render(alpha: number, frameSeconds: number): void {
    fitCanvasToDisplay(this.canvas);
    const look = this.input.takeMouseDelta();
    this.follow.addLook(-look.x * LOOK_RADIANS_PER_PIXEL, -look.y * LOOK_RADIANS_PER_PIXEL);
    const aspect = this.canvas.width / this.canvas.height;

    const car = this.world.player.vehicle;
    if (car) {
      // With the mouse idle, swing the camera around behind the car.
      if (look.x === 0 && look.y === 0) {
        this.follow.alignYaw(car.heading, this.chase.alignRate * frameSeconds);
      }
      car.interpolatedPosition(alpha, this.focus);
      const speed = Math.abs(car.forwardSpeed);
      const distance = clamp(
        this.chase.baseDistance + this.chase.speedDistance * speed,
        this.chase.baseDistance,
        this.chase.maxDistance,
      );
      const shot: OrbitShot = {
        distance,
        height: this.chase.height,
        lagSharpness: this.chase.lagSharpness,
      };
      this.follow.update(this.focus, frameSeconds, this.world.collision, aspect, shot);
    } else {
      this.world.player.interpolatedPosition(alpha, this.focus);
      this.follow.update(this.focus, frameSeconds, this.world.collision, aspect);
    }

    this.renderer.beginFrame(this.camera, DEFAULT_ENVIRONMENT);
    this.renderer.drawSky();
    let visible = 0;
    for (const chunk of this.chunks) {
      if (this.renderer.isSphereVisible(chunk.center, chunk.radius)) {
        this.renderer.drawMesh(chunk.mesh, this.identity);
        visible += 1;
      }
    }
    this.drawVehicles(alpha);
    if (!car) {
      const player = this.world.player;
      mat4FromTransform(this.model, this.focus.x, this.focus.y, this.focus.z, player.heading);
      this.renderer.drawMesh(this.figure, this.model);
    }

    this.updateHud(car?.speedKmh ?? 0, car?.forwardSpeed ?? 0);
    const fps = Math.round(this.fps.tick(frameSeconds));
    this.label.textContent =
      `${fps} FPS | ${this.renderer.stats.drawCalls} draws | ` +
      `${visible}/${this.chunks.length} chunks`;
  }

  private drawVehicles(alpha: number): void {
    for (const vehicle of this.world.vehicles) {
      vehicle.interpolatedPosition(alpha, this.carPosition);
      const radius = vehicle.halfLength + vehicle.halfWidth;
      if (!this.renderer.isSphereVisible(this.carPosition, radius)) {
        continue;
      }
      const mesh = this.vehicleMeshes.get(vehicle.tuning.id);
      if (!mesh) {
        continue;
      }
      mat4FromTransform(
        this.model,
        this.carPosition.x,
        this.carPosition.y,
        this.carPosition.z,
        vehicle.heading,
      );
      this.renderer.drawMesh(mesh, this.model, vehicle.bodyColor);
    }
  }

  private updateHud(speedKmh: number, forwardSpeed: number): void {
    const car = this.world.player.vehicle;
    if (car) {
      this.hud.speedometer.hidden = false;
      const gear = forwardSpeed < REVERSING_SPEED ? 'R' : 'D';
      this.hud.speedometer.textContent = `${Math.round(speedKmh)} km/h  ${gear}`;
      this.hud.prompt.textContent = 'F  Leave the car';
      this.hud.prompt.hidden = false;
      return;
    }
    this.hud.speedometer.hidden = true;
    const nearby = this.world.nearestEnterableVehicle();
    this.hud.prompt.hidden = nearby === null;
    if (nearby) {
      this.hud.prompt.textContent = 'F  Enter the car';
    }
  }
}

function axis(positive: boolean, negative: boolean): number {
  return (positive ? 1 : 0) - (negative ? 1 : 0);
}
