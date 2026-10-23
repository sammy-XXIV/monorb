// Rilla Clan chief: a huge purple brute with a spiked back ridge, heavy brow, tusks and leather shoulder pads.
// No reference sheet exists for him; the build follows the chapter 6 card (purple, spiky back, angry). Faces +z. About 8.4 units tall.
import * as THREE from "three";

const COL = { body: 0x6d3f94, dark: 0x4a2a68, belly: 0xa77fc6, spike: 0xd9c2ee, white: 0xf4f0ff, pupil: 0x1a1020, tusk: 0xf0e8d0, leather: 0x6b4a2f, bone: 0xeee6d2, mouth: 0x2a1020 };
const lam = c => new THREE.MeshLambertMaterial({ color: c });

export function buildRilla() {
  const root = new THREE.Group();
  const add = (geo, color, pos, scale = [1, 1, 1], rot = [0, 0, 0], parent = root) => {
    const m = new THREE.Mesh(geo, lam(color)); m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const S = new THREE.SphereGeometry(1, 32, 24), CONE = new THREE.ConeGeometry(1, 1, 10), CYL = new THREE.CylinderGeometry(1, 1, 1, 14), BOX = new THREE.BoxGeometry(1, 1, 1);

  // legs and body
  for (const x of [-1.25, 1.25]) { add(S, COL.body, [x, 1.2, 0.1], [1.05, 1.25, 1.15]); add(S, COL.dark, [x, 0.25, 0.65], [1.1, 0.45, 1.5]); }   // thighs + big feet
  add(S, COL.body, [0, 4.0, 0], [2.7, 2.9, 2.3]);
  add(S, COL.belly, [0, 3.7, 0.95], [1.85, 2.0, 1.5]);
  add(BOX, COL.leather, [0, 2.1, 0.35], [2.6, 1.2, 1.8], [0.05, 0, 0]);   // loincloth
  add(BOX, COL.dark, [0, 2.1, 1.28], [2.7, 0.18, 0.12]);                   // belt
  // arms: heavy shoulders, long forearms, big fists
  for (const side of [-1, 1]) {
    const sh = add(S, COL.leather, [side * 2.85, 5.45, 0.1], [1.15, 0.85, 1.1]);   // shoulder pad
    for (let i = 0; i < 3; i++) add(CONE, COL.spike, [side * (2.85 + (i - 1) * 0.15), 6.2 + (i === 1 ? 0.15 : 0), 0.1 + (i - 1) * 0.5], [0.22, 0.9, 0.22], [0, 0, side * (0.25 * (1 - i))]);
    add(S, COL.body, [side * 3.15, 4.2, 0.35], [0.95, 1.9, 1.0], [0, 0, side * 0.12]);                 // upper arm
    add(S, COL.body, [side * 3.45, 2.5, 0.8], [0.85, 1.6, 0.9], [-0.15, 0, side * -0.08]);              // forearm
    add(S, COL.dark, [side * 3.5, 1.3, 1.15], [1.05, 0.95, 1.1]);                                      // fist
    for (let k = -1; k <= 1; k++) add(S, COL.dark, [side * 3.5 + k * 0.5, 1.0, 1.9], [0.32, 0.3, 0.3]); // knuckles
  }
  // spiked ridge down the back: each cone sits on the body's back surface, tip pointing up and back
  for (let i = 0; i < 7; i++) { const y = 6.5 - i * 0.55, u = (y - 4.0) / 2.9, surf = -2.3 * Math.sqrt(Math.max(0.05, 1 - u * u)), k = 1.0 - Math.abs(i - 1.5) * 0.1, h = 1.5 * k + 0.5, th = -0.95;
    add(CONE, COL.spike, [0, y + Math.cos(th) * (h / 2 - 0.15), surf + Math.sin(th) * (h / 2 - 0.15)], [0.55 * k, h, 0.55 * k], [th, 0, 0]); }
  // necklace of bones
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.12 + 0.76 * i / 8), x = Math.cos(a) * 1.7 * -1, y = 5.55 - Math.sin(a) * 0.5; add(CYL, COL.bone, [x, y, 1.15 + Math.sin(a) * 0.3], [0.11, 0.42, 0.11], [Math.PI / 2 - 0.4, 0, 0.3 * (4 - i) / 4]); }

  // head: set forward, low brow, deep-set angry eyes, wide muzzle, open mouth, tusks (features sit ON the skull surface)
  const head = new THREE.Group(); head.position.set(0, 6.9, 1.25); root.add(head); root.userData.head = head;
  add(S, COL.body, [0, 0, 0], [1.85, 1.6, 1.7], [0, 0, 0], head);
  add(S, COL.dark, [0, 0.5, 1.2], [1.6, 0.3, 0.55], [0.35, 0, 0], head);                      // heavy brow ridge, hugging the forehead
  for (const x of [-1, 1]) {
    add(S, COL.white, [x * 0.62, 0.18, 1.5], [0.34, 0.22, 0.2], [0, 0, 0], head);               // eye
    add(S, COL.pupil, [x * 0.58, 0.16, 1.66], [0.15, 0.15, 0.09], [0, 0, 0], head);
    add(BOX, COL.dark, [x * 0.62, 0.52, 1.5], [0.7, 0.13, 0.16], [0, 0, x * -0.4], head);         // angry slanted brow over it
    add(S, COL.belly, [x * 0.9, -0.55, 1.15], [0.4, 0.38, 0.3], [0, 0, 0], head);               // cheek
  }
  add(S, COL.belly, [0, -0.45, 1.4], [1.1, 0.62, 0.62], [0, 0, 0], head);                      // muzzle
  for (const x of [-1, 1]) add(S, COL.pupil, [x * 0.26, -0.22, 1.95], [0.1, 0.07, 0.06], [0, 0, 0], head);   // nostrils
  add(S, COL.mouth, [0, -0.82, 1.5], [0.85, 0.2, 0.45], [0, 0, 0], head);                      // open mouth
  add(S, COL.body, [0, -1.1, 1.3], [0.9, 0.36, 0.6], [0, 0, 0], head);                         // lower jaw
  for (const x of [-1, 1]) add(CONE, COL.tusk, [x * 0.58, -0.78, 1.72], [0.12, 0.55, 0.12], [0, 0, 0], head);   // tusks
  for (const x of [-1, 1]) add(S, COL.body, [x * 1.7, 0.05, -0.1], [0.36, 0.44, 0.22], [0, 0, 0], head);        // ears
  return root;
}
