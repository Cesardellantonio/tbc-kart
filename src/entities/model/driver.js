// Seated driver: the race suit (suit.js), skinned arms that keep the gloves on the wheel, and a
// full-face helmet on a head group that pivots at the neck so it can lean into corners.

import * as THREE from 'three';
import { mergeStatic } from './merge.js';
import { buildSuit } from './suit.js';
import { buildHelmet } from './helmet.js';
import { buildArms } from './arms.js';
import { COCKPIT } from '../../config/kart.js';

export function buildDriver(mats) {
  const group = new THREE.Group();
  group.add(...buildSuit(mats));
  const head = new THREE.Group(); // pivots at the neck so it can lean into corners
  head.position.set(...COCKPIT.headPivot);
  const helmet = buildHelmet(mats);
  helmet.position.set(0, 0.125, -0.022); // shell centre above the neck joint
  helmet.rotation.x = -0.06; // looking ahead over the reclined torso
  head.add(helmet);
  group.add(head);
  mergeStatic(head, { alias: mats.alias });

  const arms = buildArms(mats);
  arms.update(0);
  group.add(arms.mesh);
  mergeStatic(group, { keep: [head, arms.mesh], alias: mats.alias });
  return { group, head, arms };
}
