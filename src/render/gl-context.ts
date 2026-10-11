/** Creates the WebGL2 context used for all world rendering. Throws when WebGL2 is unavailable. */
export function createWebGL2Context(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    throw new Error(
      'WebGL2 is not available. Use a current version of Chrome, Edge, Firefox, or Safari.',
    );
  }
  return gl;
}
