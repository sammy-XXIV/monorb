// Chapter 2 "Back to the Past": the living jungle before the fire. Camp + campfire (Moyaki), the golden Elder Tree,
// the glade where Mouch races (west), the bamboo grove with Moyaki's spices (east), the waterfall where Salmonad's map blew up the cliffs (north).
import * as THREE from "three";
import { KIT, preload, spawn } from "../engine/assets.js";
import { outline } from "../engine/gfx.js";
import { wisp, drift, glowSprite } from "../engine/fx.js";
import { outlineCharacter, mergeDecor } from "./common.js";
import { buildMolandak } from "../../molandak/molandak.js";
import { buildMoyaki } from "../../moyaki/moyaki.js";
import { buildSalmonad } from "../../salmonad/salmonad.js";
import { buildMouch } from "../../mouch/mouch.js";

const N = KIT.nature;
const MODELS = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_palm", "tree_detailed", "tree_oak", "tree_fat", "plant_bushLarge", "plant_bushDetailed",
  "plant_flatTall", "grass_large", "grass_leafsLarge", "flower_purpleA", "flower_yellowB", "flower_redA", "mushroom_redGroup", "rock_largeA", "rock_largeC", "stone_tallB",
  "campfire_stones", "log", "tent_detailedOpen", "tent_smallOpen", "crops_bambooStageB", "lily_large"].map(k => `${N}${k}.glb`);
export const SPAWN = { x: 0, y: 0, z: 18 };
export const FIRE = { x: 0, z: 0 };
const POOL = { x: 10, z: -74, r: 15 }, GLADE = { x: -64, z: 0 }, GROVE = { x: 60, z: 0 };
const RACE_TIME = 30;

export async function buildCh2(scene, phys) {
  await preload(MODELS);
  const root = new THREE.Group(); scene.add(root);
  const parts = [], updaters = [], decor = [];
  const add = (o, { collide = null, outlined = false, shrink = 1, merge = false } = {}) => {
    root.add(o); if (merge) decor.push(o);
    if (outlined) o.traverse(m => m.isMesh && (outline(m), parts.push(m)));
    if (collide) phys.fromObject(o, { kind: collide, shrink });
    return o;
  };
  const fit = (o, h) => { const b = new THREE.Box3().setFromObject(o); o.scale.multiplyScalar(h / (b.max.y - b.min.y)); return o; };
  const face = (o, x, z) => { o.rotation.y = Math.atan2(x - o.position.x, z - o.position.z); };
  let seed = 23; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // ---------- sky, sun, ground ----------
  scene.background = new THREE.Color(0x9fd6ee); scene.fog = new THREE.FogExp2(0xb8e0cf, 0.0035);
  root.add(new THREE.HemisphereLight(0xfff2d0, 0x35602a, 1.7));
  const sun = new THREE.DirectionalLight(0xfff0c8, 2.6); sun.position.set(40, 80, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 }); sun.shadow.bias = -0.0006;
  root.add(sun, sun.target);
  const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
  const onPath = (x, z) => Math.min(segDist(x, z, 0, 0, GLADE.x + 26, 0), segDist(x, z, 0, 0, GROVE.x - 16, 0), segDist(x, z, 0, 0, 2, -58));
  const groundGeo = new THREE.PlaneGeometry(260, 200, 130, 100); groundGeo.rotateX(-Math.PI / 2);
  { const col = [], pos = groundGeo.attributes.position, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i) - 20, n = Math.sin(x * 0.13) * Math.cos(z * 0.11) + Math.sin(x * 0.04 + z * 0.06);
      const p = onPath(x, z); if (p < 4) c.setHSL(0.09, 0.42, 0.42 + n * 0.02); else c.setHSL(0.27, 0.52, 0.33 + n * 0.03); col.push(c.r, c.g, c.b); }
    groundGeo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); }
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true })); ground.position.z = -20; ground.receiveShadow = true; root.add(ground);
  phys.box(0, -1, -20, 130, 1, 100);
  phys.box(-112, 20, -20, 1, 40, 100); phys.box(112, 20, -20, 1, 40, 100); phys.box(0, 20, 52, 130, 40, 1); phys.box(0, 20, -96, 130, 40, 1);   // world edge

  // ---------- jungle dressing (kept out of play areas) ----------
  const clear = (x, z) => Math.hypot(x - FIRE.x, z - FIRE.z) < 24 || Math.hypot(x - GLADE.x, z - GLADE.z) < 30 || (x > 38 && x < 86 && Math.abs(z) < 26)
    || (x > -36 && x < 36 && z < -46) || onPath(x, z) < 7 || Math.hypot(x - 26, z + 26) < 14;
  const trees = ["tree_palmTall", "tree_palmBend", "tree_palmDetailedTall", "tree_detailed", "tree_oak", "tree_fat", "tree_palm"];
  for (let i = 0; i < 150; i++) {
    const x = (rnd() - 0.5) * 216, z = -92 + rnd() * 140; if (clear(x, z)) continue;
    const k = trees[i % trees.length], t = await spawn(`${N}${k}.glb`, { pos: [x, 0, z], rot: rnd() * 6.3 }); fit(t, 13 + rnd() * 12);
    add(t, { collide: "cyl", shrink: 0.2, merge: true });
  }
  for (let i = 0; i < 260; i++) {
    const x = (rnd() - 0.5) * 216, z = -92 + rnd() * 140; if (onPath(x, z) < 4 || Math.hypot(x - FIRE.x, z - FIRE.z) < 9 || Math.hypot(x - POOL.x, z - POOL.z) < POOL.r + 1) continue;
    const k = ["grass_large", "plant_bushLarge", "plant_flatTall", "grass_leafsLarge", "flower_purpleA", "flower_yellowB", "plant_bushDetailed", "flower_redA", "mushroom_redGroup"][i % 9];
    const o = await spawn(`${N}${k}.glb`, { pos: [x, 0, z], rot: rnd() * 6, scale: k.includes("bush") ? 4 + rnd() * 2 : 4 + rnd() * 3, shadow: false }); root.add(o); decor.push(o);
  }
  updaters.push(drift(root, { count: 260, box: [220, 18, 150], center: [0, 7, -20], color: 0xfff2a0, size: 0.4, speed: 0.4 }).update);   // pollen in the sun

  // ---------- camp: campfire, tents, log seats, Moyaki ----------
  const fire = await spawn(`${N}campfire_stones.glb`, { pos: [FIRE.x, 0, FIRE.z], scale: 6 }); add(fire);
  const fireLight = new THREE.PointLight(0xff8a3a, 50, 24); fireLight.position.set(FIRE.x, 3, FIRE.z); root.add(fireLight);
  const flames = drift(root, { count: 70, box: [1.6, 3.2, 1.6], center: [FIRE.x, 2.2, FIRE.z], color: 0xff7a2a, size: 1.5, speed: 9 });
  updaters.push(t => { fireLight.intensity = 42 + Math.sin(t * 13) * 8; flames.update(t); });
  for (const [x, z, r] of [[-12, -8, 0.6], [12, -9, -0.5]]) { const t = await spawn(`${N}tent_detailedOpen.glb`, { pos: [x, 0, z], rot: r, tint: 0xd8a070 }); fit(t, 6); add(t, { collide: "box", shrink: 0.8, outlined: true }); }
  for (const [x, z, r] of [[-6, 6, 0.3], [6.5, 5.5, -0.3], [0, -7, 0]]) { const l = await spawn(`${N}log.glb`, { pos: [x, 0, z], rot: r, tint: 0x9a7650 }); fit(l, 1.1); l.scale.x *= 1.6; add(l, { outlined: true }); }

  // ---------- the Great Elder Tree, alive and golden ----------
  const elder = await spawn(`${N}tree_oak.glb`, { pos: [26, 0, -26] }); fit(elder, 40);
  elder.traverse(m => { if (!m.isMesh) return; const c = m.material.color; m.material = m.material.clone(); m.material.color.set(c.g > c.r ? 0xffc93a : 0x8a5a3a); });   // golden leaves, warm bark
  add(elder, { collide: "cyl", shrink: 0.16, outlined: true });
  updaters.push(drift(root, { count: 120, box: [26, 22, 26], center: [26, 22, -26], color: 0xffe066, size: 0.8, speed: 0.7 }).update);
  const elderGlow = glowSprite(0xffd23a, 30); elderGlow.position.set(26, 26, -26); elderGlow.material.opacity = 0.35; root.add(elderGlow);

  // ---------- collectibles ----------
  const wisps = [];
  const placeWisp = (x, y, z) => { const w = wisp(0xffe27a); w.position.set(x, y + 1.6, z); root.add(w); wisps.push({ w, x, y: y + 1.6, z, got: false }); };
  [[-14, 0, 0], [-26, 0, 0], [-38, 0, 0], [14, 0, 0], [26, 0, 0], [38, 0, 0], [1, 0, -16], [2, 0, -30], [2, 0, -44]].forEach(p => placeWisp(...p));
  const items = [];   // { kind, g, x, y, z, got }
  const glowItem = (kind, mesh, x, y, z, color) => { const g = new THREE.Group(); g.position.set(x, y + 1.6, z); g.add(mesh); const s = glowSprite(color, 3.5); g.add(s); root.add(g); items.push({ kind, g, x, y: y + 1.6, z, got: false }); };

  // ---------- EAST: bamboo grove, Moyaki's three jungle spices ----------
  for (let i = 0; i < 46; i++) {
    const x = GROVE.x - 20 + rnd() * 44, z = (rnd() - 0.5) * 46; if (Math.abs(z) < 4 && x < 70) continue;
    const b = await spawn(`${N}crops_bambooStageB.glb`, { pos: [x, 0, z], rot: rnd() * 6 }); fit(b, 9 + rnd() * 6); add(b, { merge: true }); phys.cylinder(x, 4, z, 0.5, 4);
  }
  const spiceRock = await spawn(`${N}rock_largeC.glb`, { pos: [72, 0, -6], tint: 0xa89a88 }); fit(spiceRock, 3); add(spiceRock, { collide: "box", outlined: true });
  const pepper = () => { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0xff3a1a, emissive: 0x801000, roughness: 0.4 }));
    m.rotation.z = Math.PI; g.add(m); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0x3a8a2a })); st.position.y = 1; g.add(st); outline(m); parts.push(m); return g; };
  glowItem("spice", pepper(), 50, 0, -10, 0xff6a3a); glowItem("spice", pepper(), 66, 0, 12, 0xff6a3a); glowItem("spice", pepper(), 72, 3, -6, 0xff6a3a);

  // ---------- WEST: the glade, Mouch's speed race through five rings ----------
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; if (Math.cos(a) > 0.82) continue;   // leave the east side open to the camp
    const x = GLADE.x + Math.cos(a) * 33, z = GLADE.z + Math.sin(a) * 33, t = await spawn(`${N}${i % 2 ? "tree_detailed" : "tree_fat"}.glb`, { pos: [x, 0, z], rot: rnd() * 6 });
    fit(t, 18 + rnd() * 8); add(t, { collide: "cyl", shrink: 0.2, merge: true }); }
  const rings = [];
  for (const [x, y, z] of [[-56, 3, -10], [-70, 4.5, -14], [-82, 3, 0], [-72, 6.2, 12], [-58, 3.2, 10]]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.28, 10, 32), new THREE.MeshStandardMaterial({ color: 0x9ffcff, emissive: 0x3fd8ff, emissiveIntensity: 1.6 }));
    r.position.set(x, y, z); r.lookAt(GLADE.x, y, GLADE.z); r.rotateY(Math.PI / 2); root.add(r); outline(r); parts.push(r);
    rings.push({ r, x, y, z, got: false });
  }
  let race = null;   // { t } seconds left, while a race is on

  // ---------- NORTH: waterfall, pool, stone steps up to Salmonad's map ----------
  const rock = new THREE.MeshLambertMaterial({ color: 0x6f7a62 }), rockTop = new THREE.MeshLambertMaterial({ color: 0x8aa06a });
  const block = (x, z, top, hw = 3) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, top, hw * 2), rock); b.position.set(x, top / 2, z); b.castShadow = b.receiveShadow = true; add(b, { outlined: true });
    const c = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 0.6, 0.6, hw * 2 + 0.6), rockTop); c.position.set(x, top - 0.3, z); c.receiveShadow = true; add(c, { outlined: true });
    phys.box(x, top / 2, z, hw, top / 2, hw);
  };
  { const cliff = new THREE.Mesh(new THREE.BoxGeometry(120, 26, 12), rock); cliff.position.set(0, 13, -96); cliff.receiveShadow = true; add(cliff, { outlined: true }); phys.box(0, 13, -96, 60, 13, 6); }
  { const ledge = new THREE.Mesh(new THREE.BoxGeometry(16, 15, 8), rock); ledge.position.set(-12, 7.5, -86); ledge.castShadow = ledge.receiveShadow = true; add(ledge, { outlined: true }); phys.box(-12, 7.5, -86, 8, 7.5, 4);
    const top = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.6, 8.6), rockTop); top.position.set(-12, 14.7, -86); add(top, { outlined: true }); }
  [[-4, -60, 2.5], [-12, -62, 5], [-20, -68, 7.5], [-24, -75, 10], [-16, -77, 12.5]].forEach(([x, z, h]) => { block(x, z, h); placeWisp(x, h, z); });
  const fallTex = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d");
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`; g.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 4, 20 + Math.random() * 60); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(10, 26), new THREE.MeshBasicMaterial({ color: 0xbfeaff, map: fallTex, transparent: true, opacity: 0.88 }));
  fall.position.set(POOL.x + 4, 13, -89.7); root.add(fall);
  updaters.push((t, dt) => { fallTex.offset.y += dt * 1.6; });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(POOL.r, 48), new THREE.MeshStandardMaterial({ color: 0x3fa6d8, transparent: true, opacity: 0.78, roughness: 0.1, emissive: 0x0a3a5a }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(POOL.x, 0.25, POOL.z); root.add(pool);
  updaters.push(drift(root, { count: 90, box: [10, 4, 4], center: [POOL.x + 4, 1.5, -87], color: 0xffffff, size: 0.9, speed: 3 }).update);   // spray
  for (const [x, z] of [[POOL.x - 9, POOL.z + 4], [POOL.x + 7, POOL.z + 8]]) { const l = await spawn(`${N}lily_large.glb`, { pos: [x, 0.3, z], scale: 5 }); add(l); }
  const map = new THREE.Group(); { const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2, 12), new THREE.MeshLambertMaterial({ color: 0xf0dcae })); roll.rotation.z = Math.PI / 2; map.add(roll); outline(roll); parts.push(roll);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.07, 6, 16), new THREE.MeshLambertMaterial({ color: 0xc0392b })); band.rotation.y = Math.PI / 2; map.add(band); }
  glowItem("map", map, -12, 15, -86, 0xfff2b0);

  // ---------- the heroes ----------
  const lipPts = await (await fetch("../moyaki/lip.json")).json().catch(() => null);
  const molandak = buildMolandak({ faceUrl: "../molandak/face.png", strands: 9000 }); molandak.position.set(6, 0, 9); root.add(molandak); outlineCharacter(molandak, parts, true);
  const moyaki = buildMoyaki({ faceUrl: "../moyaki/face.png", lipPts }); fit(moyaki, 3.4); moyaki.position.set(-7, 0, 1.5); root.add(moyaki); outlineCharacter(moyaki, parts);
  const salmonad = buildSalmonad(); fit(salmonad, 5.2); salmonad.position.set(0, 0, -64); root.add(salmonad); outlineCharacter(salmonad, parts);
  const mouch = buildMouch(); fit(mouch, 3); mouch.position.set(-52, 3.5, 6); root.add(mouch); outlineCharacter(mouch, parts);
  face(moyaki, FIRE.x, FIRE.z); face(salmonad, 0, 0); face(mouch, 0, 0); face(molandak, 0, 14);
  phys.cylinder(-7, 1.5, 1.5, 1.4, 1.5); phys.cylinder(0, 2.5, -64, 1.2, 2.5);
  const heroes = { molandak, moyaki, salmonad, mouch };
  const CAMP_SEATS = { salmonad: [-6, 0, -5.5], mouch: [5, 3.2, -5], moyaki: [-7, 0, 1.5] };

  // intro portal: opens above the camp, drops you and Molandak into the past
  const portal = new THREE.Group(); portal.position.set(0, 9, 14);
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.45, 12, 48), new THREE.MeshStandardMaterial({ color: 0x9ff0ff, emissive: 0x3fd8ff, emissiveIntensity: 2.5 }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshBasicMaterial({ color: 0xb59aff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    portal.add(ring, disc); }
  portal.scale.setScalar(0.001); root.add(portal);

  mergeDecor(root, decor);

  // ---------- per-frame ----------
  let time = 0;
  const api = {
    root, parts, wisps, heroes, portal, FIRE,
    spawnPoint: { ...SPAWN }, checkpoint: { ...SPAWN },
    wispTotal: () => wisps.length, chasing: () => false,
    raceLeft: () => race ? race.t : 0,
    npcs: () => [["molandak", molandak], ["moyaki", moyaki], ["salmonad", salmonad], ["mouch", mouch]],
    toCamp(id) { const [x, y, z] = CAMP_SEATS[id]; heroes[id].position.set(x, y, z); face(heroes[id], FIRE.x, FIRE.z); if (id === "salmonad") phys.cylinder(x, 2.5, z, 1.2, 2.5); },
    // events: {wisp, at}, {item: kind, at}, {ringsReset}, {fire}
    update(dt, player, playerFeetY) {
      time += dt; updaters.forEach(u => u(time, dt));
      const px = player.pos.x, pz = player.pos.z, cy = playerFeetY + 2, ev = [];
      mouch.position.y = (mouch.userData.homeY ??= mouch.position.y) + Math.sin(time * 2.2) * 0.4; mouch.userData.animate?.(time, 1);
      salmonad.position.y = Math.sin(time * 1.6) * 0.08; molandak.rotation.z = Math.sin(time * 1.3) * 0.03;
      portal.rotation.z = time * 1.5;
      for (const w of wisps) { if (w.got) continue; w.w.position.y = w.y + Math.sin(time * 2 + w.x) * 0.3; w.w.rotation.y = time;
        if (Math.hypot(w.x - px, w.z - pz) < 2.2 && Math.abs(w.y - (playerFeetY + 1.6)) < 3) { w.got = true; root.remove(w.w); ev.push({ wisp: true, at: w.w.position }); } }
      for (const it of items) { if (it.got) continue; it.g.rotation.y = time * 1.5; it.g.position.y = it.y + Math.sin(time * 2.4) * 0.3;
        if (Math.hypot(it.x - px, it.z - pz) < 2.6 && Math.abs(it.y - cy) < 3) { it.got = true; root.remove(it.g); ev.push({ item: it.kind, at: it.g.position }); } }
      // ring race: the clock starts at the first ring; run out and the rings come back
      for (const r of rings) { r.r.rotation.z += dt * 0.6; if (r.got) continue;
        if (Math.hypot(r.x - px, r.y - cy, r.z - pz) < 2.6) { r.got = true; r.r.visible = false; ev.push({ item: "ring", at: r.r.position }); if (!race) race = { t: RACE_TIME }; } }
      if (race) { race.t -= dt;
        if (rings.every(r => r.got)) race = null;
        else if (race.t <= 0) { race = null; rings.forEach(r => { r.got = false; r.r.visible = true; }); ev.push({ ringsReset: true }); } }
      if (Math.hypot(px - FIRE.x, pz - FIRE.z) < 7) ev.push({ fire: true });
      return ev;
    },
  };
  return api;
}
