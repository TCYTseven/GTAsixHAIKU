import type { Mat4 } from '../math/mat4';

/** A linked vertex and fragment shader pair, with cached uniform lookups. */
export class ShaderProgram {
  private readonly program: WebGLProgram;
  private readonly locations = new Map<string, WebGLUniformLocation | null>();

  constructor(
    private readonly gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Could not create a WebGL program.');
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? 'unknown error';
      gl.deleteProgram(program);
      throw new Error(`Shader program failed to link: ${log}`);
    }
    this.program = program;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  setFloat(name: string, value: number): void {
    this.gl.uniform1f(this.location(name), value);
  }

  setVec3(name: string, x: number, y: number, z: number): void {
    this.gl.uniform3f(this.location(name), x, y, z);
  }

  setMat4(name: string, matrix: Mat4): void {
    this.gl.uniformMatrix4fv(this.location(name), false, matrix);
  }

  private location(name: string): WebGLUniformLocation | null {
    let location = this.locations.get(name);
    if (location === undefined) {
      location = this.gl.getUniformLocation(this.program, name);
      this.locations.set(name, location);
    }
    return location;
  }
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Could not create a WebGL shader.');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'unknown error';
    gl.deleteShader(shader);
    throw new Error(`Shader failed to compile: ${log}`);
  }
  return shader;
}
