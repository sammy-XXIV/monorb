// The player's Chog: model + skeleton + traits (looks) + gait. Built from the token's metadata.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { outline as outlineId } from "./engine/gfx.js";

const parts = []; let bones = {}, rest = {}, traitGroup = null, propGroup = null;
let root, inner;
const ray = new THREE.Raycaster();
function addPart(m) { outlineId(m); parts.push(m); return m; }
function surfaceZ(x, y, kinds) {
  const ms = parts.filter(m => kinds.includes(m.userData.kind) && m.visible);
  ray.set(new THREE.Vector3(x, y, 6), new THREE.Vector3(0, 0, -1)); const h = ray.intersectObjects(ms, false)[0];
  return h ? inner.worldToLocal(h.point.clone()).z : null;
}

export const FOOT_Y = -2.36;                      // model's feet; root is placed so feet sit on the ground

export async function loadChog(base = "..") {
  root = new THREE.Group(); inner = new THREE.Group(); root.add(inner); parts.length = 0;
  const loader = new GLTFLoader();
  for (const file of [`${base}/face/face.glb`, `${base}/hair/hair.glb`, `${base}/body/body_rig.glb`]) {
    const g = await loader.loadAsync(file);
    const meshes = []; g.scene.traverse(o => o.isMesh && meshes.push(o));
    meshes.forEach(m => {
      if (m.name.startsWith("ink")) { m.visible = false; return; }
      m.userData.kind = file.includes("hair") ? "hair" : file.includes("body") ? m.name.replace(/_.*/, "") : "face";
      const tex = m.material.map;
      m.material = tex ? new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 })
                       : new THREE.MeshLambertMaterial({ color: m.material.color });
      outlineId(m, (m.name.startsWith("leg") || m.name.startsWith("torso")) ? 9999 : undefined);   // legs share the torso id: no hip line
      m.frustumCulled = false; m.castShadow = true; parts.push(m);
    });
    inner.add(g.scene);
  }
  bones = {}; rest = {};
  inner.traverse(o => { if (o.isBone) { bones[o.name] = o; rest[o.name] = o.quaternion.clone(); } });
  return { root, parts, applyTraits, update };
}

// ---- gait: idle / walk / run, blended by speed ----
const GAITS = {
  idle: { cad: 2.0, thigh: 0, knee: 0, arm: 0.04, elbow: 0.25, elbowX: 0, lean: 0, bob: 0.03 },
  walk: { cad: 6.0, thigh: 0.55, knee: 0.9, arm: 0.5, elbow: 0.35, elbowX: 0.3, lean: 0.08, bob: 0.12 },
  run:  { cad: 11.0, thigh: 0.95, knee: 1.6, arm: 0.85, elbow: 1.45, elbowX: 0.1, lean: 0.28, bob: 0.22 },
};
const G = { ...GAITS.idle }; let phase = 0;
const qx = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0);
function bend(name, a) { const b = bones[name]; if (b) b.quaternion.copy(rest[name]).multiply(qx.setFromAxisAngle(X, a)); }
function update(dt, speed, airborne = false) {
  const tgt = GAITS[speed <= 0.01 ? "idle" : speed < 5 ? "walk" : "run"];
  for (const k in G) G[k] += (tgt[k] - G[k]) * Math.min(1, dt * 6);
  phase += dt * G.cad; const sw = Math.sin(phase);
  for (const [s, k] of [["L", 1], ["R", -1]]) {
    const leg = airborne ? 0.4 * k : sw * k, lift = airborne ? 1 : Math.max(0, Math.cos(phase) * k);
    bend("thigh_" + s, G.thigh * leg); bend("shin_" + s, -(0.15 + G.knee * lift));
    bend("upperarm_" + s, -G.arm * (airborne ? -1.2 : leg)); bend("forearm_" + s, -(G.elbow + G.elbowX * Math.max(0, -leg)));
  }
  inner.position.y = Math.abs(Math.cos(phase)) * G.bob; inner.rotation.x = G.lean;
  if (traitGroup) traitGroup.children.forEach(m => { if (m.userData.pulse) { const k = 0.75 + 0.25 * Math.sin(phase * 3 + m.position.x * 9); m.scale.set(k, 1, k); m.material.opacity = 0.35 + 0.25 * k; } });
}

// ---- traits (looks): skin, clothes, hat, eyes, accessory, aura. Returns the background colour for the scene. ----
function applyTraits(t) {
  const p0 = root.position.clone(), r0 = root.rotation.clone(); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
  inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0);
  for (const b in bones) bones[b].quaternion.copy(rest[b]); root.updateMatrixWorld(true);
  const drop = g => g.traverse(o => { const i = parts.indexOf(o); if (i >= 0) parts.splice(i, 1); });
  if (traitGroup) { drop(traitGroup); inner.remove(traitGroup); }
  if (propGroup) { drop(propGroup); propGroup.parent && propGroup.parent.remove(propGroup); }
  traitGroup = new THREE.Group(); inner.add(traitGroup); propGroup = new THREE.Group();
  const add = (m, parent = traitGroup) => { parent.add(m); m.traverse(o => o.isMesh && addPart(o)); return m; };
  const fur = SKIN[t.Skin] ?? colorOf(t.Skin, FUR), cloth = t.Body ? colorOf(t.Body, 0xf2f2f2) : null;
  parts.forEach(m => { const k = m.userData.kind;
    if (["hair", "arm", "leg"].includes(k)) m.material.color.setHex(fur);
    if (k === "torso") m.material.color.setHex(cloth ?? fur); });
  const num = (t.Body || "").match(/\d+/);
  if (num) { const z = surfaceZ(0, -1.25, ["torso"]); if (z !== null) {
    const tex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#1b1b1b"; g.font = "bold 150px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(num[0], w / 2, h / 2); });
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); d.position.set(0, -1.25, z + 0.02); traitGroup.add(d); } }
  head(t.Head || "", add); eyes(t.Eyes || "", add);
  const fa = bones["forearm_R"];
  if (t.Accessory && fa) { fa.add(propGroup); propGroup.position.set(0, 0.55, 0.1); prop(t.Accessory, m => { propGroup.add(m); m.traverse(o => o.isMesh && addPart(o)); }); }
  if (t.Aura && t.Aura !== "Clean") {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.75, 48), new THREE.MeshBasicMaterial({ color: colorOf(t.Aura, 0xffffff), transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, FOOT_Y + 0.03, 0); traitGroup.add(ring);
  }
  root.position.copy(p0); root.rotation.copy(r0);
  root.userData.traitParts = [...traitGroup.children, ...propGroup.children];   // for the transform pop-in
  return colorOf(t.Background, 0x5b6cf7);
}

// ---------------- trait look functions (from body/traits_patch.js) ----------------
