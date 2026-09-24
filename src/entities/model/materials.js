// Kart materials: clear-coated paint, rubber, brushed metal, suit fabric, tinted visor.
// ghost = true gives one flat translucent material for the best-lap ghost.

import * as THREE from 'three';
import { LIVERY } from '../../config/kart.js';

export function kartMaterials(livery = LIVERY, ghost = false) {
  if (ghost) {
    const glass = new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.28, depthWrite: false });
    const keys = ['body', 'accent', 'frame', 'rim', 'tyre', 'engine', 'suit', 'glove', 'helmet', 'stripe', 'visor'];
    return Object.fromEntries(keys.map((k) => [k, glass]));
  }
  const L = { ...LIVERY, ...livery };
  const std = (color, roughness, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const gloss = (color, roughness = 0.3, extra = {}) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 1, clearcoatRoughness: 0.08, ...extra });
  return {
    body: gloss(L.body, 0.32),
    accent: std(L.accent, 0.55, 0.1),
    frame: std(L.frame, 0.35, 0.85),
    rim: std(L.rim, 0.22, 0.9),
    tyre: std(L.tyre, 0.9),
    engine: std(L.engine, 0.4, 0.75),
    suit: std(L.suit, 0.78),
    glove: std(L.glove, 0.7),
    helmet: gloss(L.helmet, 0.22),
    stripe: gloss(L.helmetStripe, 0.25),
    visor: gloss(L.visor, 0.04, { metalness: 0.5 }),
  };
}
