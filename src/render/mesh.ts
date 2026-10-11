import { Vec3 } from '../math/vec3';
import { FLOATS_PER_VERTEX, type MeshData } from './mesh-builder';

const STRIDE_BYTES = FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;

/** GPU copy of one static mesh. The vertex layout matches `FLOATS_PER_VERTEX` in mesh-builder. */
export class Mesh {
  readonly vao: WebGLVertexArrayObject;
  readonly indexCount: number;
  readonly min: Vec3;
  readonly max: Vec3;
  private readonly vertexBuffer: WebGLBuffer;
  private readonly indexBuffer: WebGLBuffer;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    data: MeshData,
  ) {
    this.vao = requireGl(gl.createVertexArray(), 'vertex array');
    this.vertexBuffer = requireGl(gl.createBuffer(), 'vertex buffer');
    this.indexBuffer = requireGl(gl.createBuffer(), 'index buffer');
    this.indexCount = data.indices.length;
    this.min = data.min;
    this.max = data.max;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE_BYTES, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE_BYTES, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, STRIDE_BYTES, 24);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteBuffer(this.indexBuffer);
    this.gl.deleteVertexArray(this.vao);
  }
}

function requireGl<T>(value: T | null, what: string): T {
  if (!value) {
    throw new Error(`Could not create a WebGL ${what}.`);
  }
  return value;
}
