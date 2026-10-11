import { createMat4, mat4Invert, type Mat4 } from '../math/mat4';
import type { Vec3 } from '../math/vec3';
import { WHITE, type Rgb } from './color';
import type { Camera } from './camera';
import type { Environment } from './environment';
import { Frustum } from './frustum';
import type { Mesh } from './mesh';
import { ShaderProgram } from './shader-program';
import { LIT_FRAGMENT_SHADER, LIT_VERTEX_SHADER } from './shaders/lit-shader';
import { SKY_FRAGMENT_SHADER, SKY_VERTEX_SHADER } from './shaders/sky-shader';

export interface RenderStats {
  drawCalls: number;
  triangles: number;
}

/** Draws the sky and lit meshes for one camera per frame. */
export class Renderer {
  readonly stats: RenderStats = { drawCalls: 0, triangles: 0 };
  private readonly lit: ShaderProgram;
  private readonly sky: ShaderProgram;
  private readonly emptyVao: WebGLVertexArrayObject;
  private readonly inverseViewProjection: Mat4 = createMat4();
  private readonly frustum = new Frustum();
  private readonly eye = [0, 0, 0];
  private environment: Environment | null = null;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.lit = new ShaderProgram(gl, LIT_VERTEX_SHADER, LIT_FRAGMENT_SHADER);
    this.sky = new ShaderProgram(gl, SKY_VERTEX_SHADER, SKY_FRAGMENT_SHADER);
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('Could not create a WebGL vertex array.');
    }
    this.emptyVao = vao;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
  }

  /** Clears the frame, updates the view frustum, and uploads camera and lighting uniforms. */
  beginFrame(camera: Camera, environment: Environment): void {
    const gl = this.gl;
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.environment = environment;
    this.eye[0] = camera.eye.x;
    this.eye[1] = camera.eye.y;
    this.eye[2] = camera.eye.z;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.depthMask(true);
    gl.clearColor(environment.fogColor[0], environment.fogColor[1], environment.fogColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4Invert(this.inverseViewProjection, camera.viewProjection);
    this.frustum.setFromViewProjection(camera.viewProjection);

    this.lit.use();
    this.lit.setMat4('uViewProj', camera.viewProjection);
    setVec3(this.lit, 'uCameraPos', this.eye);
    setVec3(this.lit, 'uSunDir', environment.sunDirection);
    setVec3(this.lit, 'uSunColor', environment.sunColor);
    setVec3(this.lit, 'uAmbientSky', environment.ambientSky);
    setVec3(this.lit, 'uAmbientGround', environment.ambientGround);
    setVec3(this.lit, 'uFogColor', environment.fogColor);
    this.lit.setFloat('uFogStart', environment.fogStart);
    this.lit.setFloat('uFogEnd', environment.fogEnd);
  }

  /** Draws the gradient sky. Call after `beginFrame` and before any world geometry. */
  drawSky(): void {
    const gl = this.gl;
    const environment = this.requireEnvironment();
    gl.depthMask(false);
    gl.depthFunc(gl.LEQUAL);

    this.sky.use();
    this.sky.setMat4('uInvViewProj', this.inverseViewProjection);
    setVec3(this.sky, 'uCameraPos', this.eye);
    setVec3(this.sky, 'uSunDir', environment.sunDirection);
    setVec3(this.sky, 'uSunColor', environment.sunColor);
    setVec3(this.sky, 'uSkyTop', environment.skyTop);
    setVec3(this.sky, 'uSkyHorizon', environment.skyHorizon);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    this.lit.use();
    this.stats.drawCalls += 1;
    this.stats.triangles += 1;
  }

  /** Draws a static mesh with a model matrix and an optional color multiplier. */
  drawMesh(mesh: Mesh, model: Mat4, tint: Rgb = WHITE): void {
    this.lit.setMat4('uModel', model);
    this.lit.setVec3('uTint', tint[0], tint[1], tint[2]);
    this.gl.bindVertexArray(mesh.vao);
    this.gl.drawElements(this.gl.TRIANGLES, mesh.indexCount, this.gl.UNSIGNED_INT, 0);
    this.stats.drawCalls += 1;
    this.stats.triangles += mesh.indexCount / 3;
  }

  /** True when a world-space bounding sphere touches the view frustum from the last `beginFrame`. */
  isSphereVisible(center: Vec3, radius: number): boolean {
    return this.frustum.intersectsSphere(center.x, center.y, center.z, radius);
  }

  private requireEnvironment(): Environment {
    if (!this.environment) {
      throw new Error('Renderer.beginFrame must run before drawing.');
    }
    return this.environment;
  }
}

function setVec3(program: ShaderProgram, name: string, value: readonly number[]): void {
  program.setVec3(name, value[0], value[1], value[2]);
}
