// Shared kart materials: clear-coated paint, rubber, brushed metal, suit fabric, tinted visor.

import * as THREE from 'three';
import { LIVERY } from '../../config/kart.js';

export function kartMaterials() {
  const std = (color, roughness, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const gloss = (color, roughness = 0.3, extra = {}) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 1, clearcoatRoughness: 0.08, ...extra });
  return {
    body: gloss(LIVERY.body, 0.32),
    accent: std(LIVERY.accent, 0.55, 0.1),
    frame: std(LIVERY.frame, 0.35, 0.85),
    rim: std(LIVERY.rim, 0.22, 0.9),
    tyre: std(LIVERY.tyre, 0.9),
    engine: std(LIVERY.engine, 0.4, 0.75),
    suit: std(LIVERY.suit, 0.78),
    glove: std(LIVERY.glove, 0.7),
    helmet: gloss(LIVERY.helmet, 0.22),
    stripe: gloss(LIVERY.helmetStripe, 0.25),
    visor: gloss(LIVERY.visor, 0.04, { metalness: 0.5 }),
  };
}
