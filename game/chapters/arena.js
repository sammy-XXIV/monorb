// Bonk Arena scene: a Rilla Clan stone platform floating over a sea of clouds at dusk. Visual only: the server runs the fight.
import * as THREE from "three";
import { KIT, preload, spawn } from "../engine/assets.js";
import { outline } from "../engine/gfx.js";
import { drift, glowSprite } from "../engine/fx.js";
import { R0 } from "../arena_sim.js";

const N = KIT.nature;

export async function buildArena(scene) {
  await preload([`${N}statue_obelisk.glb`, `${N}statue_head.glb`, `${N}tree_palmTall.glb`, `${N}rock_largeA.glb`]);
  const root = new THREE.Group(); scene.add(root);
  const parts = [], updaters = [];
  scene.background = new THREE.Color(0x3a2a6a); scene.fog = new THREE.FogExp2(0x5a3f8a, 0.008);
  root.add(new THREE.HemisphereLight(0xffd9f0, 0x2a1d4a, 1.6));
  const sun = new THREE.DirectionalLight(0xffc89a, 2.4); sun.position.set(30, 50, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 120 }); root.add(sun, sun.target);

  // platform: stone disc with a carved ring; it is rebuilt to the server's radius as it shrinks
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64), new THREE.MeshLambertMaterial({ color: 0xb9a88f }));
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.55, 1, 64), new THREE.MeshLambertMaterial({ color: 0x7d6a58 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.66, 64), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.8 }));
  ring.rotation.x = -Math.PI / 2; top.receiveShadow = true; rim.castShadow = true;
  const plat = new THREE.Group(); plat.add(top, rim, ring); root.add(plat); outline(top); outline(rim); parts.push(top, rim);
  const setRadius = R => { top.scale.set(R, 0.8, R); top.position.y = -0.4; rim.scale.set(R, 6, R); rim.position.y = -3.8; ring.scale.setScalar(R); ring.position.y = 0.02; };
  setRadius(R0);

  // cloud sea below, totems and palms on far floating rocks
  const clouds = drift(root, { count: 500, box: [220, 6, 220], center: [0, -18, 0], color: 0x8f74c8, size: 2.2, speed: 0.4 }); updaters.push(clouds.update);
  updaters.push(drift(root, { count: 160, box: [80, 30, 80], center: [0, 8, 0], color: 0xffd36a, size: 0.4, speed: 0.6 }).update);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, d = 38 + (i % 2) * 10, x = Math.cos(a) * d, z = Math.sin(a) * d, y = -4 + (i % 3) * 3;
    const isle = await spawn(`${N}rock_largeA.glb`, { pos: [x, y - 6, z], rot: a, tint: 0x8a7aa8 }); isle.scale.set(10, 5, 10); root.add(isle);
    const o = await spawn(`${N}${i % 2 ? "statue_obelisk" : "tree_palmTall"}.glb`, { pos: [x, y, z], rot: a }); o.scale.setScalar(i % 2 ? 9 : 14); root.add(o);
    if (i % 2) { const g = glowSprite(0xffb35a, 6); g.position.set(x, y + 10, z); root.add(g); }
  }
  return { root, parts, setRadius, update: t => updaters.forEach(u => u(t)) };
}
