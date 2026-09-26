// Post-processing: MSAA scene pass → ground-truth ambient occlusion (high tiers) → depth of field (TV
// cameras, high tiers) → bloom on light sources → colour grade + film grain → tone mapping + sRGB output.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GradeShader } from './GradeShader.js';
import { MSAA_SAMPLES, BLOOM, GRADE, AO, DOF } from '../config/render.js';
import { QUALITY } from '../config/graphics.js';

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

    if (QUALITY.gtao) {
      // Contact shading where karts sit on the floor, drivers in seats, barriers meet the concrete.
      const half = (v) => Math.max(1, Math.round(v * AO.resolution)); // AO is soft: half res is plenty
      this.ao = new GTAOPass(scene, camera, half(size.x), half(size.y));
      const setSize = this.ao.setSize.bind(this.ao);
      this.ao.setSize = (w, h) => setSize(half(w), half(h));
      this.ao.blendIntensity = AO.intensity;
      this.ao.updateGtaoMaterial(AO.gtao);
      this.ao.updatePdMaterial(AO.denoise);
      this.composer.addPass(this.ao);
    }
    if (QUALITY.dof) {
      this.dof = new BokehPass(scene, camera, { focus: 10, aperture: DOF.aperture, maxblur: DOF.maxBlur });
      this.dof.enabled = false; // only while a TV camera is on (setFocus)
      this.composer.addPass(this.dof);
    }

    this.bloom = new UnrealBloomPass(size.clone(), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uSaturation.value = GRADE.saturation;
    this.grade.uniforms.uContrast.value = GRADE.contrast;
    this.grade.uniforms.uVignette.value = GRADE.vignette;
    this.grade.uniforms.uGrain.value = GRADE.grain;
    this.grade.uniforms.uFringe.value = GRADE.fringe;
    this.composer.addPass(this.grade);

    this.composer.addPass(new OutputPass());
  }

  // Depth of field on the subject `distance` metres away (a long TV lens), or off with null.
  setFocus(distance) {
    if (!this.dof) return;
    this.dof.enabled = distance != null;
    if (this.dof.enabled) this.dof.uniforms.focus.value = distance;
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
  }

  render(dt) {
    this.grade.uniforms.uTime.value += dt;
    this.composer.render(dt);
  }
}
