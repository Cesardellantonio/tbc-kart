// Kart materials: clear-coated paint, moulded plastic, painted steel, rubber, suit fabric, helmet
// shell and a tinted visor. Tints (engine casting, gloves, helmet stripe, fuel tank…) are colours
// only: `alias` folds each into the base material that shades alike, and the merge carries the
// tint as vertex colours, so the extra colours cost no draw calls.
// ghost = true gives one flat translucent material for the best-lap ghost.

import * as THREE from 'three';
import { LIVERY } from '../../config/kart.js';

// tint key → [base key it is drawn with, LIVERY colour key]
const TINTS = {
  engine: ['frame', 'engine'],
  exhaust: ['frame', 'exhaust'],
  shroud: ['accent', 'shroud'],
  tank: ['accent', 'tank'],
  seat: ['accent', 'seat'],
  glove: ['suit', 'glove'],
  panel: ['suit', 'body'], // suit side panels in the kart's colour
  boot: ['suit', 'boot'],
  collar: ['suit', 'collar'],
  stripe: ['helmet', 'helmetStripe'],
  trim: ['helmet', 'trim'],
  hub: ['rim', 'hub'],
};
const BASES = ['body', 'accent', 'frame', 'rim', 'tyre', 'suit', 'helmet', 'visor'];

export function kartMaterials(livery = LIVERY, ghost = false) {
  if (ghost) {
    // Lit, so the one translucent shell (ghostShell.js) still shows its form rather than a flat cut-out
    const glass = new THREE.MeshStandardMaterial({
      color: 0xb388ff, emissive: 0x3c2470, roughness: 0.45, transparent: true, opacity: 0.4, depthWrite: false,
    });
    const all = Object.fromEntries([...BASES, ...Object.keys(TINTS)].map((k) => [k, glass]));
    return { ...all, alias: new Map() };
  }
  const L = { ...LIVERY, ...livery };
  const std = (color, roughness, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const gloss = (color, roughness = 0.3, extra = {}) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 1, clearcoatRoughness: 0.08, ...extra });
  const phys = (params) => new THREE.MeshPhysicalMaterial(params);
  const mats = {
    // Rental bodywork is moulded plastic, polished: a lighter, rougher clearcoat than car paint.
    body: gloss(L.body, 0.38, { clearcoat: 0.7, clearcoatRoughness: 0.14 }),
    accent: std(L.accent, 0.62, 0.05),
    frame: phys({ color: L.frame, roughness: 0.38, metalness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.3 }), // painted steel
    rim: phys({ color: L.rim, roughness: 0.32, metalness: 1 }), // alloy (anisotropy needs tangents these rims lack)
    tyre: phys({ color: L.tyre, roughness: 0.82, sheen: 0.4, sheenRoughness: 0.55, sheenColor: 0x5a5a5a }), // rubber
    suit: phys({ color: L.suit, roughness: 0.9, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(L.suit).lerp(new THREE.Color(0xffffff), 0.35) }), // fabric
    helmet: gloss(L.helmet, 0.2),
    // Mirrored "iridium" visor: a thin-film coating that shifts colour with the angle.
    visor: gloss(L.visor, 0.04, { metalness: 0.75, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [260, 820] }),
  };
  mats.alias = new Map();
  for (const [key, [base, colour]] of Object.entries(TINTS)) {
    mats[key] = new THREE.MeshStandardMaterial({ color: L[colour] }); // colour only, never drawn
    mats.alias.set(mats[key], mats[base]);
  }
  return mats;
}
