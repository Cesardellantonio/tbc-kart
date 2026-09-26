// Light through the hall's haze (high tiers): a soft additive shaft under every LED panel, brightest
// facing the camera and fading toward the floor — tyre smoke and dust hang in the air of a kart hall.
// One instanced mesh for the whole roof.

import * as THREE from 'three';
import { LIGHT_PANEL } from '../config/venue.js';
import { HAZE } from '../config/render.js';

const material = () =>
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(LIGHT_PANEL.color).multiplyScalar(HAZE.intensity) } },
    vertexShader: /* glsl */ `
      varying float vDown;
      varying float vFacing;
      void main() {
        vec4 view = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vFacing = abs(dot(n, normalize(-view.xyz)));
        vDown = 1.0 - uv.y; // 0 at the panel, 1 at the floor
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vDown;
      varying float vFacing;
      void main() {
        float up = clamp(1.0 - vDown, 0.0, 1.0);
        float a = pow(clamp(vFacing, 0.0, 1.0), 2.5) * up * up * smoothstep(0.0, 0.08, up);
        gl_FragColor = vec4(uColor * a, 0.0); // pure light added: no alpha written
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    side: THREE.DoubleSide,
  });

// spots: [[x, y, z]] panel positions (world/Rig.js).
export function createLightShafts(spots) {
  const height = LIGHT_PANEL.y - 0.1;
  const geometry = new THREE.CylinderGeometry(0.5, HAZE.spread, height, 20, 1, true).translate(0, -height / 2, 0);
  const mesh = new THREE.InstancedMesh(geometry, material(), spots.length);
  const m = new THREE.Matrix4();
  const stretch = new THREE.Vector3(LIGHT_PANEL.width / 1.2, 1, 1); // panel-shaped: long across X
  spots.forEach(([x, y, z], i) => mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y - 0.1, z), new THREE.Quaternion(), stretch)));
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return mesh;
}
