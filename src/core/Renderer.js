// WebGL renderer + scene: physically based colour pipeline, soft shadows, and image-based lighting
// captured from the hall itself (a generic room until the first track is built).

import * as THREE from 'three';
import { venueEnvironment } from './venueEnvironment.js';
import { captureEnvironment } from './environmentCapture.js';
import { QUALITY } from '../config/graphics.js';
import {
  PIXEL_RATIO_CAP,
  EXPOSURE,
  BG_COLOR,
  FOG_COLOR,
  FOG_DENSITY,
  ENV_INTENSITY,
  TONE_MAPPING,
} from '../config/render.js';

export class Renderer {
  constructor(container = document.body) {
    // Anti-aliasing happens in PostFX's multisampled target, not on the canvas.
    const gl = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    gl.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_CAP));
    gl.setSize(window.innerWidth, window.innerHeight);
    gl.toneMapping = TONE_MAPPING === 'agx' ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = EXPOSURE;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(gl.domElement);
    this.three = gl;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    this.scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);

    this.scene.environment = venueEnvironment(gl);
    this.scene.environmentIntensity = ENV_INTENSITY;
  }

  // Light and reflect the scene with a capture of the scene itself (see core/environmentCapture.js).
  captureEnvironment(at, hide) {
    const texture = captureEnvironment(this.three, this.scene, at, QUALITY.envSize, hide);
    this.scene.environment?.dispose();
    this.scene.environment = texture;
  }

  get maxAnisotropy() {
    return this.three.capabilities.getMaxAnisotropy();
  }

  setSize(width, height) {
    this.three.setSize(width, height);
  }
}
