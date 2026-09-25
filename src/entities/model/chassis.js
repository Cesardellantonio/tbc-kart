// Kart chassis in kart space (−Z forward, +Y up, origin on the ground at the centre): tubular frame,
// bodywork, cockpit and engine, baked into one mesh per material; number roundels on the front
// panel and the rear board. The steering wheel stays a separate group so it can turn.

import * as THREE from 'three';
import { numberPlateTexture } from '../../world/textures/markings.js';
import { KART_NUMBER } from '../../config/kart.js';
import { mergeStatic } from './merge.js';
import { buildFrame } from './frame.js';
import { buildBodywork, PANEL, BOARD } from './bodywork.js';
import { buildCockpit } from './cockpit.js';
import { buildEngine } from './engine.js';

// Number roundel of radius r at `at`, facing along `normal`.
function plate(mat, r, at, normal) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat);
  m.position.copy(at);
  m.lookAt(at.clone().add(normal));
  m.userData.small = true;
  return m;
}

export function buildChassis(mats, number = KART_NUMBER, ghost = false) {
  const g = new THREE.Group();
  g.add(...buildFrame(mats), ...buildBodywork(mats), ...buildEngine(mats));
  const cockpit = buildCockpit(mats);
  g.add(...cockpit.parts, cockpit.steering);

  const plateMat = ghost ? mats.body
    : new THREE.MeshStandardMaterial({ map: numberPlateTexture(number), roughness: 0.4 });
  const [by, bz] = PANEL.bottom;
  const [ty, tz] = PANEL.top;
  const panelNormal = new THREE.Vector3(0, tz - bz, -(ty - by)).normalize();
  const panelMid = new THREE.Vector3(0, (by + ty) / 2 + 0.01, (bz + tz) / 2 - 0.035)
    .addScaledVector(panelNormal, 0.014);
  // Rear roundel in the board's own frame: its back face (the box's +z side, tilted) plus 3 mm
  const rearNormal = new THREE.Vector3(0, -Math.sin(BOARD.tilt), Math.cos(BOARD.tilt));
  const rearAt = new THREE.Vector3(...BOARD.centre).addScaledVector(rearNormal, BOARD.thickness / 2 + 0.003);
  g.add(plate(plateMat, 0.075, panelMid, panelNormal), plate(plateMat, 0.07, rearAt, rearNormal));

  const wheel = cockpit.wheel;
  wheel.children.forEach((m) => (m.userData.small = true));
  mergeStatic(wheel, { alias: new Map([...mats.alias, [mats.frame, mats.accent]]) });
  mergeStatic(g, { keep: [cockpit.steering], alias: mats.alias });
  return { group: g, steeringWheel: wheel };
}
