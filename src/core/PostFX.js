// Post-processing: MSAA scene pass → bloom → colour grade → tone mapping + sRGB output.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GradeShader } from './GradeShader.js';
import { MSAA_SAMPLES, BLOOM, GRADE } from '../config/render.js';

export class PostFX {
  constructor(renderer, scene, camera) {
    const gl = renderer.three;
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: MSAA_SAMPLES,
    });
    this.composer = new EffectComposer(gl, target);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(size.clone(), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uSaturation.value = GRADE.saturation;
    this.grade.uniforms.uContrast.value = GRADE.contrast;
    this.grade.uniforms.uVignette.value = GRADE.vignette;
    this.composer.addPass(this.grade);

    this.composer.addPass(new OutputPass());
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
  }

  render(dt) {
    this.composer.render(dt);
  }
}
