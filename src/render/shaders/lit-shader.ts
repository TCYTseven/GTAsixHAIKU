/** Vertex-colored surfaces with hemisphere ambient light, one directional sun, and linear fog. */
export const LIT_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;

uniform mat4 uModel;
uniform mat4 uViewProj;
uniform vec3 uTint;

out vec3 vWorldPos;
out vec3 vNormal;
out vec3 vColor;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor * uTint;
  gl_Position = uViewProj * world;
}
`;

export const LIT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec3 vColor;

uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbientSky;
uniform vec3 uAmbientGround;
uniform vec3 uFogColor;
uniform float uFogStart;
uniform float uFogEnd;

out vec4 fragColor;

void main() {
  vec3 n = normalize(vNormal);
  float sunDiffuse = max(dot(n, normalize(uSunDir)), 0.0);
  float hemisphere = 0.5 + 0.5 * n.y;
  vec3 ambient = mix(uAmbientGround, uAmbientSky, hemisphere);
  vec3 lit = vColor * (ambient + uSunColor * sunDiffuse);
  float distanceToEye = length(vWorldPos - uCameraPos);
  float fog = smoothstep(uFogStart, uFogEnd, distanceToEye);
  fragColor = vec4(mix(lit, uFogColor, fog), 1.0);
}
`;
