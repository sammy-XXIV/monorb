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
const COLORS = {red:0xd8333a, blood:0x9e1b22, blue:0x2f6fe0, navy:0x23306e, noble:0x2b4bb0, royal:0x2f4fd8, sky:0x7ec8f0, black:0x26262c, dark:0x2e2a3a,
  white:0xf2f2f2, cream:0xf4ead2, yellow:0xf6d34a, lemon:0xf6ec6a, sunlight:0xffd860, gold:0xe8b923, golden:0xe8b923, green:0x3aa655, lime:0x9bdc3a,
  fresh:0x4cc46b, toad:0x4cb050, jade:0x3fae8a, mint:0x98e8c0, aqua:0x2fd0d6, cyan:0x2fd0e6, pink:0xec6aac, rose:0xf06292, rosy:0xf08fb0, rosie:0xf29ac0,
  coral:0xff7f6e, peach:0xf7b48e, magenta:0xd23fae, purple:0x8a4dff, violet:0x7a3fd8, lavender:0xb79cff, supreme:0x6a2fd0, mon:0x836ef9, orange:0xf39a1e,
  afternoon:0xf39a5e, brown:0x8b5a2b, grey:0x9a9aa6, gray:0x9a9aa6, silver:0xc8ccd6, metal:0xb0b6c2, beige:0xe8d3b0, radioactive:0x8cff3a};
const colorOf = (name, fallback) => { for (const k of (name || "").toLowerCase().split(/[^a-z]+/)) if (k in COLORS) return COLORS[k]; return fallback; };
const FUR = 0x5a38b8;
const SKIN = {Origin: FUR, "Multi Colored": FUR};
const toon = c => new THREE.MeshLambertMaterial({color: c});
function canvasTex(w, h, draw){ const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function capTex(word, c){
  return canvasTex(1024, 256, (g, w, h) => { g.fillStyle = "#" + new THREE.Color(c).getHexString(); g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    const sp = word.length > 12 ? word.lastIndexOf(" ", 12) : -1, lines = sp > 0 ? [word.slice(0, sp), word.slice(sp + 1)] : [word];
    g.font = `bold ${lines.length > 1 ? 34 : 46}px Arial`; lines.forEach((l, i) => g.fillText(l, w * 0.5, h * (lines.length > 1 ? 0.3 + i * 0.22 : 0.4))); });
}
function head(name, add){
  const n = name.toLowerCase(), c = colorOf(name, 0x8a4dff); if (!name) return;
  // hats sit OVER the big hair (like the NFT art, where the hat covers the top of the head); spikes poke out below
  const dome = (sx, sy, sz, y, mat) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat)); m.scale.set(sx, sy, sz); m.position.set(-0.1, y, -0.25); return m; };
  if (n.includes("cap") || n === "mcga" || n.includes("plumber") || n.includes("neet")) {
    const word = (name.replace(/\s*cap$/i, "") === "MCGA" ? "MAKE CHOG GREAT AGAIN" : name.replace(/\s*cap$/i, "")).toUpperCase();
    const cap = dome(1.75, 1.45, 1.6, 0.55, new THREE.MeshLambertMaterial({map: capTex(word, c)})); cap.rotation.y = -Math.PI / 2;   // texture centre faces front
    const brim = add(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.07, 40, 1, false, -Math.PI / 2, Math.PI), toon(new THREE.Color(c).multiplyScalar(0.7).getHex())));
    brim.scale.set(1.6, 1, 1.05); brim.position.set(-0.1, 0.6, 1.0); brim.rotation.x = 0.12;
  } else if (n.includes("beanie") || n.includes("russian") || n.includes("durag") || n.includes("wrap") || n.includes("robber")) {
    dome(1.7, 1.5, 1.6, 0.55, toon(c));
    const cuff = add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 40), toon(new THREE.Color(c).multiplyScalar(0.8).getHex()))); cuff.scale.set(1.45, 1, 1.4); cuff.position.set(-0.1, 0.65, -0.25);
  } else if (n.includes("bucket")) {
    const b = add(new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.7, 1.3, 40), toon(c))); b.position.set(-0.1, 1.2, -0.25);
    const br = add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.08, 40), toon(new THREE.Color(c).multiplyScalar(0.8).getHex()))); br.position.set(-0.1, 0.58, -0.15);
  } else if (n.includes("crown") || n.includes("thorn") || n.includes("wreath") || n.includes("seal")) {
    const g = n.includes("silver") ? 0xc8ccd6 : n.includes("seal") ? 0xf2e6a0 : 0xe8b923;
    const band = add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.35, 32, 1, true), new THREE.MeshLambertMaterial({color: g, side: THREE.DoubleSide}))); band.position.set(-0.1, 2.05, -0.25); band.scale.setScalar(1.3);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, s = add(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 8), toon(g))); s.scale.setScalar(1.4); s.position.set(-0.1 + Math.sin(a) * 0.97, 2.5, -0.25 + Math.cos(a) * 0.97); }
  } else if (n.includes("wizard")) {
    const h = add(new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.2, 32), toon(c === 0x8a4dff ? 0x3b3fb0 : c))); h.scale.set(1.6, 1.4, 1.6); h.position.set(-0.1, 2.3, -0.25); h.rotation.z = 0.12;
    const br = add(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.07, 40), toon(0x2c2f8a))); br.scale.set(1.45, 1, 1.45); br.position.set(-0.1, 0.75, -0.2);
  } else if (n.includes("horn")) {
    const hc = n.includes("void") ? 0x2a1f40 : n.includes("purple") ? 0x7a3fd8 : 0xd8333a;
    for (const s of [-1, 1]) { const h = add(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 16), toon(hc))); h.scale.setScalar(1.4); h.position.set(s * 0.7, 1.6, 0.35); h.rotation.z = -s * 0.35; }
  } else if (n.includes("mafia") || n.includes("peace hat")) {
    const dk = n.includes("mafia");
    const h = add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.0, 40), toon(dk ? 0x26262c : c))); h.position.set(-0.1, 1.2, -0.25);
    const br = add(new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.08, 40), toon(dk ? 0x1b1b1b : c))); br.position.set(-0.1, 0.7, -0.15);
  } else if (n.includes("headband") || n.includes("bandana")) {
    const b = add(new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.09, 12, 48), toon(c === 0x8a4dff ? 0xd8333a : c))); b.rotation.x = Math.PI / 2; b.position.set(-0.05, 0.72, -0.1);
  } else if (n.includes("helmet")) {
    dome(1.7, 1.55, 1.6, 0.5, toon(0xc9a04a));
    const plume = add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 1.6), toon(0xd8333a))); plume.scale.set(1.4, 1.4, 1.4); plume.position.set(-0.1, 2.2, -0.25);
  } else {                                           // no bespoke model yet: a small coloured badge on the hair
    const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), toon(c))); b.position.set(0.55, 1.45, 0.45);
  }
}
function eyes(name, add){
  const n = name.toLowerCase(); if (!name) return;
  const E = [[-0.42, 0.065], [0.42, 0.065]], zf = E.map(([x, y]) => surfaceZ(x, y, ["face"]) ?? 1.0);
  if (n.includes("laser")) {
    const lc = n.includes("fire") ? 0xff6a00 : colorOf(name, 0xff2a2a);
    // glowing eyes + tapered, see-through, pulsing beams (additive: they glow, no outline)
    const glow = (r, o) => new THREE.MeshBasicMaterial({ color: new THREE.Color(lc).multiplyScalar(2.5), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
    E.forEach(([x, y], i) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), glow(0, 0.95)); eye.position.set(x, y, zf[i] + 0.04); eye.userData.noOutline = true; traitGroup.add(eye);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.13, 2.6, 12, 1, true), glow(0, 0.55)); beam.rotation.x = -Math.PI / 2; beam.position.set(x, y, zf[i] + 1.35);
      beam.userData.pulse = true; beam.userData.noOutline = true; traitGroup.add(beam);
    });
  } else if (n.includes("glass") || n.includes("visor") || n.includes("vr") || n.includes("viper") || n.includes("thug")) {
    const visor = n.includes("visor") || n.includes("vr") || n.includes("viper");
    const gc = n.includes("btc") ? 0xf39a1e : n.includes("thug") ? 0x111111 : colorOf(name, visor ? 0x2fd0e6 : 0x111111);
    if (visor) { const v = add(new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 0.14), toon(gc))); v.position.set(0, 0.07, Math.max(...zf) + 0.03); return; }
    const btc = n.includes("btc") ? canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#f39a1e"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "bold 92px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("₿", w / 2, h / 2 + 6); }) : null;
    E.forEach(([x, y], i) => { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 32), [toon(gc), btc ? new THREE.MeshBasicMaterial({map: btc}) : toon(gc), toon(gc)]));
      l.rotation.x = Math.PI / 2; l.position.set(x, y, zf[i] + 0.06); });
    const br = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), toon(gc))); br.position.set(0, 0.1, Math.min(...zf) + 0.1);
  }
}
function prop(name, put){
  const n = name.toLowerCase(), g = new THREE.Group();
  if (n === "fwog" || n === "pepe") {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), toon(n === "pepe" ? 0x4c9a3a : 0x2fa83a)); b.scale.set(1, 0.85, 0.9); g.add(b);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), toon(0xffffff)); e.position.set(s * 0.13, 0.2, 0.2); g.add(e);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), toon(0x111111)); p.position.set(s * 0.13, 0.2, 0.29); g.add(p); }
  } else if (n === "coin") { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 28), toon(0xe8b923)); c.rotation.x = Math.PI / 2; g.add(c);
  } else if (n.includes("candle")) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), toon(n.includes("green") ? 0x3aa655 : 0xd8333a)); c.position.y = 0.2; g.add(c);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.04), toon(0x222222)); w.position.y = 0.2; g.add(w);
  } else if (n === "knife") { const k = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.18), toon(0xc8ccd6)); k.position.y = 0.35; g.add(k);
  } else if (n === "heart") { for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), toon(0xe0305a)); b.position.set(s * 0.13, 0.1, 0); g.add(b); }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.38, 20), toon(0xe0305a)); tip.rotation.z = Math.PI; tip.position.y = -0.15; g.add(tip);
  } else if (n === "cigar") { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 12), toon(0x7a4a24)); c.rotation.z = Math.PI / 2; g.add(c);
  } else { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), toon(colorOf(name, 0xf2f2f2)))); }
  put(g);
}
