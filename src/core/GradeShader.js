// Colour grade in linear light before tone mapping: saturation, contrast, vignette, a touch of lens
// colour fringing toward the frame edge, and fine animated film grain (breaks up banding, reads as
// a camera image rather than a render).

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uVignette: { value: 0.3 },
    uGrain: { value: 0 },
    uFringe: { value: 0 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uFringe;
    uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float edge = dot(d, d);
      vec2 shift = d * edge * uFringe; // lateral chromatic aberration, zero at the centre
      vec4 c = texture2D(tDiffuse, vUv);
      c.r = texture2D(tDiffuse, vUv + shift).r;
      c.b = texture2D(tDiffuse, vUv - shift).b;
      float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(luma), c.rgb, uSaturation);
      c.rgb = max((c.rgb - 0.18) * uContrast + 0.18, 0.0); // pivot on mid-grey
      c.rgb *= 1.0 - uVignette * smoothstep(0.18, 0.62, edge * 1.6);
      float n = hash(vUv * 1024.0 + fract(uTime * 7.3) * 91.0) - 0.5;
      c.rgb *= 1.0 + n * uGrain; // grain scales with the signal, like film
      gl_FragColor = c;
    }`,
};
