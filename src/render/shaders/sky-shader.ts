/**
 * Fullscreen sky gradient drawn from one oversized triangle, so it needs no vertex buffer.
 * The fragment shader reconstructs each pixel's view direction from the far-plane point.
 */
export const SKY_VERTEX_SHADER = `#version 300 es
uniform mat4 uInvViewProj;

out vec3 vFarPoint;

const vec2 CORNERS[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));

void main() {
  vec2 p = CORNERS[gl_VertexID];
  gl_Position = vec4(p, 1.0, 1.0);
  vec4 farPoint = uInvViewProj * vec4(p, 1.0, 1.0);
  vFarPoint = farPoint.xyz / farPoint.w;
}
`;

export const SKY_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vFarPoint;

uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;

out vec4 fragColor;

void main() {
  vec3 dir = normalize(vFarPoint - uCameraPos);
  float up = clamp(dir.y, 0.0, 1.0);
  vec3 sky = mix(uSkyHorizon, uSkyTop, pow(up, 0.6));
  float sunAmount = max(dot(dir, normalize(uSunDir)), 0.0);
  sky += uSunColor * (pow(sunAmount, 256.0) * 1.5 + pow(sunAmount, 8.0) * 0.12);
  fragColor = vec4(sky, 1.0);
}
`;
