// ==========================================
// 3D Components & Mesh Builders (Three.js)
// ==========================================
import * as THREE from 'three';
import { rnd, pick, spriteEmoji } from '../util/util.js';

export const lanes = [-2.6, 0, 2.6];
export const SEG = 20;
export const COUNT = 10;

// Material caches/factories
export const mat = (color) => new THREE.MeshLambertMaterial({ color });
export const basic = (color) => new THREE.MeshBasicMaterial({ color });

/**
 * Helper to construct and attach a mesh to a parent group
 */
export function mesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const obj = new THREE.Mesh(geo, material);
  obj.position.set(x, y, z);
  parent.add(obj);
  obj.castShadow = true;
  return obj;
}

// Character definitions
export const characters = [
  { name: 'Arun', icon: '🧢', shirt: 0xff5935, pants: 0x234c98, hat: 0x12b6a4, cost: 0 },
  { name: 'Meena', icon: '🎀', shirt: 0xe84393, pants: 0x7141a9, hat: 0xffd400, cost: 0 },
  { name: 'Karthi', icon: '🧶', shirt: 0x28aa64, pants: 0x34495e, hat: 0xe74c3c, cost: 0 },
  { name: 'Ninja', icon: '🥷', shirt: 0x24242b, pants: 0x15151a, hat: 0xff3434, cost: 100 },
  { name: 'Astro', icon: '🧑‍🚀', shirt: 0xf0f3f8, pants: 0xabb8d4, hat: 0xffc400, cost: 250 },
  { name: 'Hero', icon: '🦸', shirt: 0xd62828, pants: 0x1d3557, hat: 0x176edb, cost: 500 }
];

/**
 * Build 3D rigged humanoid character
 */
export function createCharacter(charConfig) {
  const g = new THREE.Group();
  const skin = mat(0xe7b580);
  const shirt = mat(charConfig.shirt);
  const pants = mat(charConfig.pants);
  const hat = mat(charConfig.hat);
  const dark = mat(0x20202b);
  const white = mat(0xffffff);

  // Torso, head, hat, face
  mesh(g, new THREE.CylinderGeometry(0.31, 0.29, 0.8, 12), shirt, 0, 1.17);
  mesh(g, new THREE.SphereGeometry(0.28, 16, 12), skin, 0, 1.8);
  mesh(g, new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.53), hat, 0, 1.85);

  // Eyes and mouth
  for (const s of [-1, 1]) {
    mesh(g, new THREE.SphereGeometry(0.03, 8, 6), dark, s * 0.1, 1.8, -0.26);
  }
  mesh(g, new THREE.BoxGeometry(0.14, 0.025, 0.025), dark, 0, 1.7, -0.27);
  mesh(g, new THREE.BoxGeometry(0.36, 0.46, 0.18), hat, 0, 1.2, 0.28);

  function limb(x, y, len, r, m, shoe) {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    g.add(p);
    mesh(p, new THREE.CylinderGeometry(r, r * 0.9, len, 8), m, 0, -len / 2);
    if (shoe) {
      mesh(p, new THREE.BoxGeometry(0.3, 0.15, 0.4), white, 0, -len, -0.08);
    } else {
      mesh(p, new THREE.SphereGeometry(r * 1.1, 8, 6), skin, 0, -len);
    }
    return p;
  }

  const legL = limb(-0.15, 0.8, 0.75, 0.13, pants, true);
  const legR = limb(0.15, 0.8, 0.75, 0.13, pants, true);
  const armL = limb(-0.43, 1.45, 0.62, 0.09, shirt, false);
  const armR = limb(0.43, 1.45, 0.62, 0.09, shirt, false);

  const flames = [];
  for (const s of [-1, 1]) {
    const f = mesh(g, new THREE.ConeGeometry(0.11, 0.45, 8), basic(0xff8c19), s * 0.16, 0.72, 0.51);
    f.rotation.x = Math.PI;
    flames.push(f);
  }

  return { g, legL, legR, armL, armR, flames };
}

// Track materials
const bedMat = mat(0x777780);
const railMat = mat(0xc8d0d9);
const wood = mat(0x765034);
const curb = mat(0xb5b2a8);
const yellow = mat(0xffc400);

/**
 * Track segment with 3 lanes and rails
 */
export function createTrackSegment() {
  const g = new THREE.Group();
  const bed = mesh(g, new THREE.PlaneGeometry(9.4, SEG), bedMat);
  bed.rotation.x = -Math.PI / 2;
  bed.receiveShadow = true;

  for (const x of lanes) {
    for (const d of [-0.75, 0.75]) {
      mesh(g, new THREE.BoxGeometry(0.12, 0.15, SEG), railMat, x + d, 0.08);
    }
    for (let j = 0; j < 10; j++) {
      mesh(g, new THREE.BoxGeometry(2.15, 0.1, 0.35), wood, x, 0.04, -9 + j * 2);
    }
  }

  for (const s of [-1, 1]) {
    mesh(g, new THREE.BoxGeometry(1, 0.45, SEG), curb, s * 5.2, 0.22);
    mesh(g, new THREE.BoxGeometry(0.16, 0.03, SEG), yellow, s * 4.85, 0.46);
  }

  return g;
}

// Obstacle models
const trainColors = [0x2e86de, 0xe67e22, 0x27ae60, 0xc0392b, 0x8e44ad];
const pole = mat(0x444854);
const lamp = basic(0xffedab);

export function createTrain() {
  const g = new THREE.Group();
  const c = mat(pick(trainColors));
  const dark = mat(0x172c46);
  const roof = mat(0xcfd4da);

  mesh(g, new THREE.BoxGeometry(2.3, 3, 8), c, 0, 1.85);
  mesh(g, new THREE.BoxGeometry(2.15, 0.17, 7.8), roof, 0, 3.42);
  mesh(g, new THREE.BoxGeometry(2.1, 0.45, 7.5), dark, 0, 0.2);

  for (const s of [-1, 1]) {
    for (let z = -3; z <= 3; z += 1.5) {
      mesh(g, new THREE.BoxGeometry(0.05, 0.8, 1.05), dark, s * 1.18, 2.65, z);
    }
  }
  mesh(g, new THREE.BoxGeometry(1.85, 1.1, 0.05), dark, 0, 2.45, 4.03);
  for (const x of [-0.7, 0.7]) {
    mesh(g, new THREE.SphereGeometry(0.12, 8, 6), lamp, x, 1.25, 4.06);
  }
  return g;
}

export function createBarrier() {
  const g = new THREE.Group();
  mesh(g, new THREE.BoxGeometry(2.25, 0.9, 0.5), mat(0xf4f4f4), 0, 0.45);
  for (const x of [-0.7, 0, 0.7]) {
    const stripe = mesh(g, new THREE.BoxGeometry(0.25, 0.92, 0.53), mat(0xe53935), x, 0.45);
    stripe.rotation.z = 0.45;
  }
  return g;
}

export function createOverhead() {
  const g = new THREE.Group();
  for (const x of [-1, 1]) {
    mesh(g, new THREE.BoxGeometry(0.18, 2.25, 0.2), pole, x * 1.04, 1.12);
  }
  mesh(g, new THREE.BoxGeometry(2.25, 0.65, 0.35), yellow, 0, 1.65);
  return g;
}

// Powerups and Collectibles
export const powerColors = { jet: 0xa765ef, mag: 0xff4646, shoe: 0xffd400, box: 0xf76abf };
export const powerIcons = { jet: '🚀', mag: '🧲', shoe: '⚡', box: '🎁' };

export const coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.1, 20);
coinGeo.rotateX(Math.PI / 2);
export const coinMat = new THREE.MeshLambertMaterial({ color: 0xffd025, emissive: 0x6e4200 });

export function createPowerupMesh(type) {
  const g = new THREE.Group();
  mesh(g, new THREE.TorusGeometry(0.58, 0.09, 8, 18), basic(powerColors[type]));
  g.add(spriteEmoji(powerIcons[type]));
  return g;
}

export function createBoardMesh() {
  const geo = new THREE.CylinderGeometry(0.72, 0.72, 0.07, 20);
  const material = new THREE.MeshBasicMaterial({ color: 0x7dfcff, transparent: true, opacity: 0.7 });
  const bMesh = new THREE.Mesh(geo, material);
  bMesh.visible = false;
  return bMesh;
}
