// The last full-screen pass, doing in one read of the frame what used to take three passes: add the
// bloom glow, the colour grade (saturation, contrast, vignette, lens fringing, film grain — see the
// old GradeShader, same maths), then three's own tone mapping and sRGB output (as OutputPass).

import { ColorManagement, RawShaderMaterial, SRGBTransfer, AgXToneMapping, ACESFilmicToneMapping } from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform sampler2D tBloom;
  uniform float uBloom;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uVignette;
  uniform float uGrain;
  uniform float uFringe;
  uniform float uTime;
  #include <tonemapping_pars_fragment>
  #include <colorspace_pars_fragment>
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  // As UnrealBloomPass's additive blend (SRC_ALPHA, ONE): the glow weighted by its own alpha.
  vec4 frame(vec2 uv) { vec4 b = texture2D(tBloom, uv); return texture2D(tDiffuse, uv) + vec4(uBloom * b.rgb * b.a, 0.0); }
  void main() {
    vec2 d = vUv - 0.5;
    float edge = dot(d, d);
    vec2 shift = d * edge * uFringe; // lateral chromatic aberration, zero at the centre
    vec4 c = frame(vUv);
    c.r = frame(vUv + shift).r;
    c.b = frame(vUv - shift).b;
    float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    c.rgb = mix(vec3(luma), c.rgb, uSaturation);
    c.rgb = max((c.rgb - 0.18) * uContrast + 0.18, 0.0); // pivot on mid-grey
    c.rgb *= 1.0 - uVignette * smoothstep(0.18, 0.62, edge * 1.6);
    float n = hash(vUv * 1024.0 + fract(uTime * 7.3) * 91.0) - 0.5;
    c.rgb *= 1.0 + n * uGrain;
    #if defined( AGX_TONE_MAPPING )
      c.rgb = AgXToneMapping(c.rgb);
    #elif defined( ACES_FILMIC_TONE_MAPPING )
      c.rgb = ACESFilmicToneMapping(c.rgb);
    #endif
    #ifdef SRGB_TRANSFER
      c = sRGBTransferOETF(c);
    #endif
    gl_FragColor = c;
  }`;

const vertexShader = /* glsl */ `
  precision highp float;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

export class FinalPass extends Pass {
  // bloom: a BloomTexturePass (or null); grade: { saturation, contrast, vignette, grain, fringe }
  constructor(bloom, grade) {
    super();
    this.bloom = bloom;
    this.uniforms = {
      tDiffuse: { value: null },
      tBloom: { value: null },
      uBloom: { value: 0 },
      toneMappingExposure: { value: 1 },
      uSaturation: { value: grade.saturation },
      uContrast: { value: grade.contrast },
      uVignette: { value: grade.vignette },
      uGrain: { value: grade.grain },
      uFringe: { value: grade.fringe },
      uTime: { value: 0 },
    };
    this.material = new RawShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader });
    this.fsQuad = new FullScreenQuad(this.material);
    this._key = '';
  }

  render(renderer, writeBuffer, readBuffer) {
    const u = this.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    const glow = this.bloom?.enabled;
    u.tBloom.value = glow ? this.bloom.texture : readBuffer.texture;
    u.uBloom.value = glow ? 1 : 0;
    u.toneMappingExposure.value = renderer.toneMappingExposure;
    const key = `${renderer.outputColorSpace}|${renderer.toneMapping}`;
    if (key !== this._key) {
      this._key = key;
      this.material.defines = {};
      if (ColorManagement.getTransfer(renderer.outputColorSpace) === SRGBTransfer) this.material.defines.SRGB_TRANSFER = '';
      if (renderer.toneMapping === AgXToneMapping) this.material.defines.AGX_TONE_MAPPING = '';
      else if (renderer.toneMapping === ACESFilmicToneMapping) this.material.defines.ACES_FILMIC_TONE_MAPPING = '';
      this.material.needsUpdate = true;
    }
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
