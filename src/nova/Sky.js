// NOVA sky: a dome shaded from the planet's palette — zenith to horizon gradient, the sun's disc and
// glow, stars, a nebula and aurora curtains where the planet has them — and a giant planet or moon
// (banded, lit from the sun's side, with a ring) hanging over the horizon. Unfogged, drawn first.

import * as THREE from 'three';

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww; // on the far plane
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uZenith, uHorizon, uGround, uSunColor, uSunDir;
  uniform float uStars, uAurora, uNebula, uTime;
  varying vec3 vDir;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash(i), n100 = hash(i + vec3(1,0,0)), n010 = hash(i + vec3(0,1,0)), n110 = hash(i + vec3(1,1,0));
    float n001 = hash(i + vec3(0,0,1)), n101 = hash(i + vec3(1,0,1)), n011 = hash(i + vec3(0,1,1)), n111 = hash(i + vec3(1,1,1));
    return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += noise(p) * a; p *= 2.07; a *= 0.5; } return s; }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 1.0, max(h, 0.0)), 0.4));
    col = mix(col, uGround, smoothstep(0.0, -0.25, h)); // below the horizon: the haze thickens to ground
    col += uHorizon * 0.15 * exp(-abs(h) * 18.0); // bright band at the horizon
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(mix(vec3(l), col, 1.35), 0.0); // the vivid skies of a strange world

    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunColor * (pow(sd, 900.0) * 30.0 + pow(sd, 60.0) * 0.6 + pow(sd, 6.0) * 0.18);

    float up = smoothstep(-0.02, 0.25, h);
    if (uStars > 0.0) {
      vec3 cell = floor(d * 420.0);
      float s = hash(cell);
      float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + s * 60.0);
      col += vec3(step(0.9975, s) * 3.0 * twinkle) * uStars * up;
      col += vec3(step(0.9993, hash(cell + 3.1)) * 8.0) * uStars * up * vec3(0.8, 0.9, 1.0);
    }
    if (uNebula > 0.0) {
      float n = fbm(d * 3.0 + vec3(0.0, uTime * 0.005, 0.0));
      float m = fbm(d * 6.0 - 4.0);
      vec3 neb = mix(vec3(0.55, 0.1, 0.8), vec3(1.0, 0.25, 0.65), m) * pow(n, 3.0) * 3.2;
      col += neb * uNebula * up;
    }
    if (uAurora > 0.0) {
      float band = smoothstep(0.08, 0.3, h) * smoothstep(0.75, 0.35, h);
      float wave = sin(d.x * 7.0 + sin(d.z * 5.0 + uTime * 0.25) * 2.2 + uTime * 0.1);
      float curtain = pow(max(wave, 0.0), 6.0) * fbm(vec3(d.xz * 9.0, uTime * 0.08));
      col += mix(vec3(0.1, 1.0, 0.6), vec3(0.6, 0.3, 1.0), smoothstep(0.2, 0.6, h)) * curtain * band * 2.2 * uAurora;
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const bodyVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vLocal;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const bodyFragment = /* glsl */ `
  uniform vec3 uColor, uSunDir, uHaze;
  varying vec3 vNormal;
  varying vec3 vLocal;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    float lat = normalize(vLocal).y;
    float bands = sin(lat * 18.0 + sin(lat * 7.0) * 2.0) * 0.5 + 0.5;
    vec3 col = uColor * (0.75 + 0.35 * bands);
    float lit = max(dot(normalize(vNormal), normalize(uSunDir)), 0.0);
    col *= 0.08 + 1.1 * lit;
    float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 3.0);
    col = mix(col, uHaze, 0.35); // seen through the planet's own air
    gl_FragColor = vec4(col + uColor * rim * 0.15, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColor, uHaze;
  varying vec3 vLocal;
  void main() {
    float r = length(vLocal.xy);
    float t = clamp((r - 1.35) / 0.9, 0.0, 1.0);
    float bands = 0.55 + 0.45 * sin(t * 60.0) * sin(t * 13.0 + 1.0);
    float alpha = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.85, t) * bands * 0.85;
    gl_FragColor = vec4(mix(uColor, uHaze, 0.3), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const color = (c) => new THREE.Color(c);

// planet: config/planets.js entry; centre: THREE.Vector3; radius: m. Returns { group, update(dt) }.
export function createSky(planet, centre, radius) {
  const group = new THREE.Group();
  group.position.copy(centre);
  const sunDir = new THREE.Vector3(...planet.sun[2]).normalize();
  const ground = color(planet.haze[0]).multiplyScalar(0.55);
  const uniforms = {
    uZenith: { value: color(planet.sky[0]) },
    uHorizon: { value: color(planet.sky[1]) },
    uGround: { value: ground },
    uSunColor: { value: color(planet.sun[0]) },
    uSunDir: { value: sunDir },
    uStars: { value: planet.stars ?? 0 },
    uAurora: { value: planet.aurora ?? 0 },
    uNebula: { value: planet.nebula ?? 0 },
    uTime: { value: 0 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 24),
    new THREE.ShaderMaterial({ uniforms, vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  dome.renderOrder = -2;
  dome.frustumCulled = false;
  group.add(dome);

  const b = planet.body;
  if (b) {
    const dir = new THREE.Vector3(...b.dir).normalize();
    const at = dir.clone().multiplyScalar(radius * 0.82);
    const size = b.size * (radius / 850);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(size, 48, 32),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: color(b.color) }, uSunDir: { value: sunDir }, uHaze: { value: color(planet.sky[1]) } },
        vertexShader: bodyVertex,
        fragmentShader: bodyFragment,
        depthWrite: false,
        fog: false,
      }),
    );
    body.position.copy(at);
    body.rotation.set(0.35, 0.8, 0.25);
    body.renderOrder = -1;
    group.add(body);
    if (b.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(size * 1.35, size * 2.25, 96, 1),
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: color(b.ring) }, uHaze: { value: color(planet.sky[1]) } },
          vertexShader: bodyVertex.replace('vLocal = position;', 'vLocal = position / ' + size.toFixed(3) + ';'),
          fragmentShader: ringFragment,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      );
      ring.position.copy(at);
      // Ring plane mostly level, tipped a little toward the viewer: seen as a wide ellipse across the disc
      const normal = dir.clone().multiplyScalar(-0.45).add(new THREE.Vector3(0.15, 1, 0)).normalize();
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      ring.renderOrder = -1;
      group.add(ring);
    }
    // A small second moon for company
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.18, 24, 16),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: color(planet.rock).lerp(color(0xffffff), 0.5) }, uSunDir: { value: sunDir }, uHaze: { value: color(planet.sky[1]) } },
        vertexShader: bodyVertex,
        fragmentShader: bodyFragment,
        depthWrite: false,
        fog: false,
      }),
    );
    moon.position.copy(new THREE.Vector3(-b.dir[0] * 0.7, 0.45, b.dir[2] * 0.4).normalize().multiplyScalar(radius * 0.8));
    moon.renderOrder = -1;
    group.add(moon);
  }
  return {
    group,
    update(dt) {
      uniforms.uTime.value += dt;
    },
  };
}
