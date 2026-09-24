// GLSL for point-sprite particles: size attenuates with distance, soft round falloff.

export const particleVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    vAlpha = aAlpha;
  }`;

export const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float a = vAlpha * (1.0 - smoothstep(0.0, 0.25, dot(d, d)));
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }`;
