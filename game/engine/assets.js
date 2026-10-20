// Asset loading + placement. Models are cached and cloned (skinned ones via SkeletonUtils so each has its own skeleton).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as skClone } from "three/addons/utils/SkeletonUtils.js";

const loader = new GLTFLoader(), cache = new Map(), tintCache = new Map();
export const KIT = {
  grave: "assets/kenney_graveyard-kit_5.0/Models/GLB format/",
  nature: "assets/kenney_nature-kit/Models/GLTF format/",
  plat: "assets/kenney_platformer-kit/Models/GLB format/",
};
export function preload(paths) { return Promise.all(paths.map(p => model(p))); }
export function model(path) {
  if (!cache.has(path)) cache.set(path, loader.loadAsync(path).then(g => { g.scene.traverse(m => { if (m.isMesh && m.material.metalness !== undefined) m.material.metalness = 0; }); return g; }));   // glTF defaults to metalness 1: black wherever the sun does not hit (no env map)
  return cache.get(path);
}
// synchronous clone of a preloaded model
export async function spawn(path, { pos = [0, 0, 0], rot = 0, scale = 1, tint = null, shadow = true } = {}) {
  const g = await model(path), skinned = g.scene.getObjectByProperty("type", "SkinnedMesh");
  const o = skinned ? skClone(g.scene) : g.scene.clone(true);
  o.position.set(...pos); o.rotation.y = rot; o.scale.setScalar(scale);
  o.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = shadow; m.receiveShadow = true;
    if (tint) { const k = m.material.uuid + tint; if (!tintCache.has(k)) { const c = m.material.clone(); c.color.multiply(new THREE.Color(tint)); tintCache.set(k, c); } m.material = tintCache.get(k); }   // shared: lets decor merge
  });
  o.userData.clips = g.animations;
  return o;
}
// play a named clip on a spawned (skinned) model; returns { mixer, play(name, fade) }
export function animate(o) {
  const mixer = new THREE.AnimationMixer(o), actions = {}; let cur = null;
  for (const c of o.userData.clips || []) actions[c.name] = mixer.clipAction(c);
  return { mixer, play(name, fade = 0.2, once = false) {
    const a = actions[name]; if (!a || a === cur) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once;
    if (cur) cur.crossFadeTo(a, fade, false); a.play(); cur = a;
  } };
}
