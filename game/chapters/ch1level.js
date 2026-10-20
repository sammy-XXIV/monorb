// Chapter 1 "The Genesis": the ruined future. Hub clearing (Doctor + burned Elder Tree), toxic swamp (west),
// haunted graveyard (east), crumbling ruins (north), and the escape chase south to the time portal.
import * as THREE from "three";
import { KIT, preload, spawn, animate } from "../engine/assets.js";
import { outline } from "../engine/gfx.js";
import { wisp, drift, burst, glowSprite } from "../engine/fx.js";
import { outlineCharacter, mergeDecor } from "./common.js";
import { createEnemy, stepEnemy } from "../enemy.js";
import { createRaft, stepRaft, EAST as RAFT_EAST } from "./raft.js";
import { buildCyborgMongrod } from "../../mongrod/cyborg.js";
import { buildMolandak } from "../../molandak/molandak.js";

const G = KIT.grave, N = KIT.nature, P = KIT.plat;
const MODELS = [
  `${G}character-keeper.glb`, `${G}character-skeleton.glb`, `${G}character-zombie.glb`, `${G}pine-crooked.glb`, `${G}pine-fall-crooked.glb`,
  `${G}gravestone-cross.glb`, `${G}gravestone-round.glb`, `${G}gravestone-broken.glb`, `${G}gravestone-decorative.glb`, `${G}crypt.glb`, `${G}crypt-large.glb`,
  `${G}iron-fence.glb`, `${G}iron-fence-damaged.glb`, `${G}lantern-candle.glb`, `${G}lightpost-single.glb`, `${G}altar-stone.glb`, `${G}pillar-large.glb`,
  `${G}column-large.glb`, `${G}stone-wall-damaged.glb`, `${G}trunk-long.glb`, `${G}fire-basket.glb`, `${G}debris.glb`, `${G}rocks-tall.glb`, `${G}candle-multiple.glb`,
  `${N}tree_oak_dark.glb`, `${N}tree_default_dark.glb`, `${N}tree_detailed_dark.glb`, `${N}log_large.glb`, `${N}stump_round.glb`, `${N}stump_old.glb`,
  `${N}rock_largeA.glb`, `${N}rock_largeC.glb`, `${N}rock_tallA.glb`, `${N}rock_tallE.glb`, `${N}lily_large.glb`, `${N}mushroom_redGroup.glb`, `${N}mushroom_tanTall.glb`,
  `${N}cliff_block_rock.glb`, `${N}cliff_blockHalf_rock.glb`, `${N}campfire_stones.glb`, `${N}grass_large.glb`,
];
export const SPAWN = { x: 0, y: 0, z: 14 };
const SWAMP = { x0: -128, x1: -38, z0: -34, z1: 34, level: 1.1 }, CHASE_END = -238;

export async function buildCh1(scene, phys, rules) {
  await preload(MODELS);
  const root = new THREE.Group(); scene.add(root);
  const parts = [], updaters = [];
  const decor = [];                               // static, un-outlined props: merged into a few meshes at the end
  const add = (o, { collide = null, outlined = false, shrink = 1, merge = false } = {}) => {
    root.add(o); if (merge) decor.push(o);
    if (outlined) o.traverse(m => m.isMesh && (outline(m), parts.push(m)));
    if (collide) phys.fromObject(o, { kind: collide, shrink });
    return o;
  };
  const fit = (o, h) => { const b = new THREE.Box3().setFromObject(o); o.scale.multiplyScalar(h / (b.max.y - b.min.y)); return o; };
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // ---------- sky, light, ground ----------
  scene.background = new THREE.Color(0x3b2a52); scene.fog = new THREE.FogExp2(0x4a3566, 0.0105);
  const hemi = new THREE.HemisphereLight(0xb59cff, 0x2a1d33, 1.25); root.add(hemi);
  const moon = new THREE.DirectionalLight(0xc6b8ff, 2.2); moon.position.set(40, 70, 30); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 }); moon.shadow.bias = -0.0006;
  root.add(moon, moon.target);
  const groundGeo = new THREE.PlaneGeometry(420, 520, 140, 170); groundGeo.rotateX(-Math.PI / 2);
  { const col = [], pos = groundGeo.attributes.position, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), n = Math.sin(x * 0.11) * Math.cos(z * 0.13) + Math.sin(x * 0.03 + z * 0.05);
      c.setHSL(0.76, 0.18, 0.13 + n * 0.025); col.push(c.r, c.g, c.b); }
    groundGeo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); }
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true })); ground.position.z = -60; ground.receiveShadow = true; root.add(ground);
  phys.box(0, -1, -60, 210, 1, 260);
  // world edge: invisible walls
  phys.box(-150, 20, -60, 1, 40, 260); phys.box(150, 20, -60, 1, 40, 260); phys.box(0, 20, 140, 210, 40, 1); phys.box(0, 20, CHASE_END - 12, 210, 40, 1);
  // south of the hub: wall with a single gap (the sealed road), then a walled corridor for the chase
  phys.box(-79.5, 20, -34, 70.5, 40, 1); phys.box(79.5, 20, -34, 70.5, 40, 1);
  phys.box(-10.5, 20, (-34 + CHASE_END) / 2, 0.5, 40, (CHASE_END + 34) / -2 + 2); phys.box(10.5, 20, (-34 + CHASE_END) / 2, 0.5, 40, (CHASE_END + 34) / -2 + 2);
  // dead-forest dressing (keeps clear of play areas)
  const px_inSwamp = (x, z) => x > SWAMP.x0 && x < SWAMP.x1 && z > SWAMP.z0 && z < SWAMP.z1;
  const clear = (x, z) => Math.hypot(x, z) < 34 || (x < -30 && x > -135 && Math.abs(z) < 42) || (x > 30 && x < 125 && Math.abs(z) < 42) || (Math.abs(x) < 34 && z > 30 && z < 125) || (Math.abs(x) < 16 && z < -20);
  const trees = [`${G}pine-crooked.glb`, `${N}tree_oak_dark.glb`, `${N}tree_default_dark.glb`, `${N}tree_detailed_dark.glb`, `${G}pine-fall-crooked.glb`];
  for (let i = 0; i < 110; i++) {
    const x = (rnd() - 0.5) * 290, z = -230 + rnd() * 360; if (clear(x, z)) continue;
    const t = await spawn(trees[i % trees.length], { pos: [x, 0, z], rot: rnd() * 6.3, tint: 0x6a5a7a }); fit(t, 12 + rnd() * 14);
    add(t, { collide: "cyl", shrink: 0.25, merge: true });
  }
  for (let i = 0; i < 70; i++) { const x = (rnd() - 0.5) * 280, z = -220 + rnd() * 350; if (clear(x, z)) continue;
    const r = await spawn(i % 2 ? `${N}rock_largeA.glb` : `${N}rock_tallE.glb`, { pos: [x, 0, z], rot: rnd() * 6, scale: 5 + rnd() * 5, tint: 0x8a7f9a }); add(r, { collide: "box", shrink: 0.8, merge: true }); }
  for (let i = 0; i < 150; i++) {
    const x = (rnd() - 0.5) * 280, z = -150 + rnd() * 280; if (px_inSwamp(x, z)) continue;
    const kind = i % 7 === 0 ? `${N}mushroom_redGroup.glb` : i % 5 === 0 ? `${G}debris.glb` : `${N}grass_large.glb`;
    const o = await spawn(kind, { pos: [x, 0, z], rot: rnd() * 6, scale: kind.includes("grass") ? 5 : 4, tint: kind.includes("grass") ? 0x6a5a88 : null, shadow: false }); root.add(o); decor.push(o);
    if (kind.includes("mushroom") && i % 3 === 0) { const l = glowSprite(0xff5ad8, 3); l.position.set(x, 1, z); root.add(l); }
  }
  updaters.push(drift(root, { count: 500, box: [300, 26, 360], center: [0, 12, -50], color: 0xff9a5a, size: 0.55 }).update);

  // ---------- hub clearing: burned Elder Tree, the Doctor, campfire ----------
  const elder = await spawn(`${N}tree_oak_dark.glb`, { pos: [0, 0, -26], tint: 0x2a1f30 }); fit(elder, 42); add(elder, { collide: "cyl", shrink: 0.18 });
  const scar = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({ color: 0x120c18, transparent: true, opacity: 0.45 }));
  scar.rotation.x = -Math.PI / 2; scar.position.set(0, 0.05, -26); root.add(scar);
  const doctor = await spawn(`${G}character-keeper.glb`, { pos: [-5, 0, -4], rot: 0.4 }); fit(doctor, 4.2); add(doctor, { outlined: true });
  phys.cylinder(-5, 2.1, -4, 1.1, 2.1);
  const docAnim = animate(doctor); docAnim.play("idle");
  const fire = await spawn(`${N}campfire_stones.glb`, { pos: [6, 0, -2], scale: 6 }); add(fire);
  const fireLight = new THREE.PointLight(0xff8a3a, 60, 26); fireLight.position.set(6, 3, -2); root.add(fireLight);
  const flames = drift(root, { count: 70, box: [1.6, 3.2, 1.6], center: [6, 2.2, -2], color: 0xff7a2a, size: 1.5, speed: 9 });
  updaters.push(t => { fireLight.intensity = 50 + Math.sin(t * 13) * 10; flames.update(t); });
  // lanterns marking the three paths + the sealed south road
  const lamp = async (x, z, color = 0xffb35a) => {
    const l = await spawn(`${G}lightpost-single.glb`, { pos: [x, 0, z] }); fit(l, 7); add(l, { collide: "cyl", shrink: 0.3 });
    const pl = glowSprite(color, 4); pl.position.set(x, 6.5, z); root.add(pl);
  };
  for (const [x, z] of [[-24, 4], [-24, -8], [24, 4], [24, -8], [8, 26], [-8, 26]]) await lamp(x, z);

  // ---------- collectibles ----------
  const wisps = [];
  const placeWisp = (x, y, z) => { const w = wisp(); w.position.set(x, y + 1.6, z); root.add(w); wisps.push({ w, x, y: y + 1.6, z, got: false }); };
  [[0, 0, 24], [0, 0, 32], [-30, 0, 0], [-36, 0, 0], [30, 0, 0], [36, 0, 0]].forEach(p => placeWisp(...p));

  // ---------- WEST: toxic swamp + stepping stumps, logs, sinking lily pads ----------
  const sludge = new THREE.Mesh(new THREE.PlaneGeometry(SWAMP.x1 - SWAMP.x0, SWAMP.z1 - SWAMP.z0, 40, 30),
    new THREE.MeshStandardMaterial({ color: 0x18301a, emissive: 0x1d5a10, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.2 }));
  sludge.rotation.x = -Math.PI / 2; sludge.position.set((SWAMP.x0 + SWAMP.x1) / 2, SWAMP.level, 0); root.add(sludge);
  updaters.push(t => { const p = sludge.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.3 + t * 1.6) * 0.12 + Math.cos(p.getY(i) * 0.25 + t) * 0.1); p.needsUpdate = true; });
  updaters.push(drift(root, { count: 220, box: [90, 2, 68], center: [-83, 1.6, 0], color: 0x9dff6a, size: 0.7, speed: 2 }).update);   // rising bubbles
  for (let i = 0; i < 60; i++) {                     // banks: reeds, tall mushrooms, stumps
    const side = i % 2 ? SWAMP.z1 + 2 + rnd() * 6 : SWAMP.z0 - 2 - rnd() * 6, x = SWAMP.x0 + rnd() * (SWAMP.x1 - SWAMP.x0);
    const k = [`${N}mushroom_tanTall.glb`, `${N}grass_large.glb`, `${N}stump_old.glb`][i % 3];
    const o = await spawn(k, { pos: [x, 0, side], rot: rnd() * 6, scale: k.includes("stump") ? 8 : 7, tint: k.includes("grass") ? 0x4a6a3a : 0xb0a0c0 }); root.add(o); decor.push(o);
  }
  const stump = async (x, z, h = 2.2, w = 3.4) => {
    const s = await spawn(`${N}stump_round.glb`, { pos: [x, 0, z], tint: 0x8a7a6a }); s.scale.set(w / 0.32, h / 0.21, w / 0.37); add(s, { outlined: true });
    phys.cylinder(x, h / 2, z, w / 2, h / 2); placeWisp(x, h, z); return s;
  };
  // raft ferry: hop on at the east dock, it sails you to the shard rock while skull spitters lob sludge at you
  const deckY = SWAMP.level + 0.5;                // top of the deck
  const raftG = new THREE.Group(), plank = new THREE.MeshLambertMaterial({ color: 0x8a6a4a }), rope = new THREE.MeshLambertMaterial({ color: 0x5a4430 });
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 1.12), plank); p.position.set(0, -0.25, -2.4 + i * 1.2); p.castShadow = true; raftG.add(p); }
  for (const x of [-2.2, 2.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 6.2), rope); b.position.set(x, 0.1, 0); raftG.add(b); }
  raftG.scale.set(7 / 6, 1, 7 / 6); add(raftG, { outlined: true });   // 7x7 deck: room to dodge
  const raftPl = phys.platform(RAFT_EAST, deckY - 0.3, 0, 3.5, 0.3, 3.5);
  let raft = createRaft();
  const placeRaft = () => { raftPl.setPos(raft.x, deckY - 0.3, 0); raftG.position.set(raft.x, deckY + Math.sin(raft.x * 0.7) * 0.06, 0); };
  placeRaft();
  [-54, -64, -74, -84, -94, -104].forEach((x, i) => placeWisp(x, i % 2 ? deckY + 3 : deckY, 0));   // some low, some only by jumping
  const spitters = [];
  for (const [x, z] of [[-58, 13], [-72, -13], [-86, 13], [-100, -13]]) {
    await stump(x, z, 2.2, 4);
    const o = await spawn(`${G}character-skeleton.glb`, { pos: [x, 2.2, z], rot: z > 0 ? Math.PI : 0 }); fit(o, 4.2); add(o, { outlined: true });
    const an = animate(o); an.play("idle");
    spitters.push({ x, z, o, an, cd: 1 + spitters.length * 0.6, t: 0 });
  }
  const blobs = [], blobGeo = new THREE.SphereGeometry(0.7, 14, 10), blobMat = new THREE.MeshStandardMaterial({ color: 0x7dff4a, emissive: 0x3fbf1a, emissiveIntensity: 1.4, roughness: 0.3 });
  const rockTop = await spawn(`${N}rock_tallA.glb`, { pos: [-123, 0, 0], tint: 0x9a8faa }); fit(rockTop, 4.5); add(rockTop, { collide: "box", shrink: 0.75 });
  const swampSafe = [{ x: -34, z: 0 }];           // dry bank, outside the sludge (x > -38)

  // ---------- EAST: graveyard with skull minions ----------
  for (let z = -36; z <= 36; z += 4) for (const x of [42, 122]) {
    if (x === 42 && Math.abs(z) < 6) continue;   // gate opening
    const f = await spawn(z % 12 === 0 ? `${G}iron-fence-damaged.glb` : `${G}iron-fence.glb`, { pos: [x, 0, z], rot: Math.PI / 2 }); f.scale.setScalar(4); add(f, { collide: "box" });
  }
  for (let x = 46; x <= 118; x += 4) for (const z of [-38, 38]) { const f = await spawn(`${G}iron-fence.glb`, { pos: [x, 0, z] }); f.scale.setScalar(4); add(f, { collide: "box" }); }
  const stones = [`${G}gravestone-cross.glb`, `${G}gravestone-round.glb`, `${G}gravestone-broken.glb`, `${G}gravestone-decorative.glb`];
  for (let gx = 0; gx < 6; gx++) for (let gz = 0; gz < 5; gz++) {
    const x = 54 + gx * 10 + (rnd() - 0.5) * 2, z = -26 + gz * 13 + (rnd() - 0.5) * 2; if (Math.abs(z) < 5 && gx < 4) continue;   // central aisle
    const s = await spawn(stones[(gx + gz) % 4], { pos: [x, 0, z], rot: (rnd() - 0.5) * 0.4 }); s.scale.setScalar(3.6); add(s, { collide: "box", outlined: true });
  }
  for (const [x, z, r] of [[66, 28, Math.PI], [96, -28, 0], [108, 26, Math.PI]]) { const c = await spawn(`${G}crypt.glb`, { pos: [x, 0, z], rot: r }); c.scale.setScalar(6); add(c, { collide: "box", outlined: true }); }
  for (const [x, z] of [[50, 6], [50, -6], [80, 6], [80, -6], [104, 8], [104, -8]]) {
    const c = await spawn(`${G}candle-multiple.glb`, { pos: [x, 0, z], scale: 4 }); add(c);
    const pl = glowSprite(0xffc06a, 3); pl.position.set(x, 2, z); root.add(pl);
  }
  const altar = await spawn(`${G}altar-stone.glb`, { pos: [114, 0, 0], rot: -Math.PI / 2, scale: 5 }); add(altar, { collide: "box", outlined: true });
  [[58, 0, 0], [70, 0, 12], [84, 0, -12], [94, 0, 0], [70, 0, -18]].forEach(p => placeWisp(...p));
  const enemies = [];
  const minion = async (a, b) => {
    const o = await spawn(`${G}character-skeleton.glb`, { pos: [a.x, 0, a.z] }); fit(o, 4.2); add(o, { outlined: true });
    const an = animate(o); an.play("walk");
    const eyeL = glowSprite(0xff3a3a, 1.2); eyeL.position.set(0, 3.4 / o.scale.y, 0.6 / o.scale.z); eyeL.material = eyeL.material.clone(); eyeL.material.opacity = 0; o.add(eyeL); eyeL.intensityProxy = true;
    enemies.push({ brain: createEnemy({ a, b }), o, an, flash: eyeL, dieT: 0 });
  };
  await minion({ x: 56, z: -8 }, { x: 56, z: 8 }); await minion({ x: 72, z: -14 }, { x: 72, z: 14 }); await minion({ x: 86, z: 10 }, { x: 98, z: 10 });
  await minion({ x: 86, z: -10 }, { x: 98, z: -10 }); await minion({ x: 106, z: -12 }, { x: 106, z: 12 });

  // ---------- NORTH: crumbling ruins tower climb ----------
  const stoneSide = new THREE.MeshLambertMaterial({ color: 0x77708a }), stoneTop = new THREE.MeshLambertMaterial({ color: 0xa79fbc });
  const block = async (x, y, z, w = 6, h = 2, d = 6) => {     // a ruined stone pillar: column body + chunky slab cap
    const g = new THREE.Group(); g.position.set(x, y, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, Math.max(0.1, h - 0.9), d * 0.82), stoneSide); body.position.y = (h - 0.9) / 2; g.add(body);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), [stoneSide, stoneSide, stoneTop, stoneSide, stoneSide, stoneSide]); cap.position.y = h - 0.45; g.add(cap);
    for (let k = 0; k < Math.floor(h / 3); k++) { const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.35, d * 0.9), stoneSide); band.position.y = 1.5 + k * 3; g.add(band); }
    g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    add(g, { outlined: true }); phys.box(x, y + h / 2, z, w / 2, h / 2, d / 2); return g;
  };
  for (let i = 0; i < 16; i++) {                      // ruin dressing around the base: broken walls, fallen columns, debris
    const a = i / 16 * Math.PI * 2, r = 30 + rnd() * 8, x = Math.sin(a) * r * 0.8, z = 82 + Math.cos(a) * r * 0.7; if (z < 42) continue;
    const k = [`${G}stone-wall-damaged.glb`, `${G}column-large.glb`, `${G}debris.glb`, `${G}pillar-large.glb`][i % 4];
    const o = await spawn(k, { pos: [x, 0, z], rot: rnd() * 6, scale: 6, tint: 0xb0a8c4 }); add(o, { collide: "box", outlined: true });
  }
  await block(0, 0, 44, 10, 2, 8);
  const steps = [[8, 3.5, 54], [16, 6.5, 62], [10, 9.5, 72], [0, 12, 76], [-10, 14.5, 72], [-16, 17, 64]];
  for (const [x, y, z] of steps) { await block(x, 0, z, 5, y, 5); placeWisp(x, y, z); }
  // moving platform bridging to the top
  const mover = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), new THREE.MeshLambertMaterial({ color: 0xb59a6a })); mover.castShadow = true; add(mover, { outlined: true });
  const moverPl = phys.platform(-16, 19, 74, 3, 0.5, 3);
  updaters.push(t => { const z = 82 + Math.sin(t * 0.8) * 9; moverPl.setPos(-16, 19, z); mover.position.set(-16, 19, z); });
  await block(-14, 0, 100, 12, 21, 12);
  for (const [x, z] of [[-24, 96], [-4, 96], [-24, 106], [-4, 106]]) { const c = await spawn(`${G}column-large.glb`, { pos: [x, 21, z] }); fit(c, 8); add(c, { collide: "box", outlined: true }); }
  // falling debris over the climb: hazard rocks dropping on a loop (shadow marks where)
  const drops = [];
  for (const [x, z, off] of [[13, 58, 0], [5, 74, 1.3], [-13, 68, 2.4]]) {
    const r = await spawn(`${N}rock_largeC.glb`, { tint: 0x7a7088 }); r.scale.setScalar(3); add(r, { outlined: true });
    const mark = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })); mark.rotation.x = -Math.PI / 2; root.add(mark);
    drops.push({ r, mark, x, z, off, y: 40 });
  }

  // ---------- SOUTH: sealed road -> escape chase corridor ----------
  const gateRocks = [];
  for (let x = -7; x <= 7; x += 4.6) { const r = await spawn(`${N}rock_tallA.glb`, { pos: [x, 0, -34], tint: 0x7a6a8a }); fit(r, 9); add(r); gateRocks.push(r); }
  const gateCol = phys.box(0, 5, -34, 9, 5, 2);
  for (let z = -40; z > CHASE_END; z -= 6) for (const s of [-1, 1]) {
    if (rnd() < 0.5) continue; const t = await spawn(trees[(Math.abs(z) + s) % trees.length], { pos: [s * (10 + rnd() * 6), 0, z], rot: rnd() * 6, tint: 0x5a4a6a }); fit(t, 14 + rnd() * 8); add(t);
  }
  const chaseObs = [];
  for (let i = 0; i < 12; i++) {
    const z = -56 - i * 15, x = ((i * 37) % 13) - 6, kind = i % 3;
    const o = kind === 1 ? await spawn(`${N}log_large.glb`, { pos: [0, 0, z], tint: 0x7a5f4a }) : await spawn(stones[i % 4], { pos: [x, 0, z] });
    if (kind === 1) { o.scale.set(14, 4, 4); add(o, { outlined: true }); phys.box(0, 0.85, z, 7, 0.85, 1.1); }   // jump over
    else { o.scale.setScalar(4.5); add(o, { collide: "box", outlined: true }); }
    chaseObs.push(o);
  }
  const portal = new THREE.Group(); portal.position.set(0, 6, CHASE_END + 4);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.6, 16, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fe3ff).multiplyScalar(2.5) }));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), new THREE.MeshBasicMaterial({ color: 0x9fefff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  portal.add(ring, disc); root.add(portal); const portalLight = new THREE.PointLight(0x6fe3ff, 80, 40); portalLight.position.set(0, 6, CHASE_END + 6); root.add(portalLight);
  updaters.push(t => { ring.rotation.z = t * 0.8; disc.material.opacity = 0.45 + Math.sin(t * 3) * 0.12; });
  // the war beast is CYBORG MONGROD himself, giant-sized, storming down the road after you
  const beast = buildCyborgMongrod(); beast.scale.setScalar(3.1); beast.visible = false; root.add(beast); outlineCharacter(beast, parts);
  const beastAnim = { mixer: { update() {} } };
  // Molandak waits at the portal (the hero of the story; the Doctor's device is meant for him)
  const molandak = buildMolandak({ faceUrl: "../molandak/face.png", strands: 9000 }); molandak.position.set(4.5, 0, CHASE_END + 10); molandak.rotation.y = 0.3;
  root.add(molandak); outlineCharacter(molandak, parts, true);

  // ---------- Time Shards ----------
  const shards = [];
  const shard = (id, x, y, z) => {
    const g = new THREE.Group(); g.position.set(x, y + 2.4, z);
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), new THREE.MeshStandardMaterial({ color: 0x8ff0ff, emissive: 0x3fc8ff, emissiveIntensity: 2.2, roughness: 0.2 })); c.scale.y = 1.6; g.add(c);
    const l = new THREE.PointLight(0x6fe3ff, 40, 16); g.add(l); root.add(g); shards.push({ id, g, x, y: y + 2.4, z, got: false });
  };
  shard("swamp", -123, 4.5, 0); shard("graveyard", 114, 3.2, 0); shard("ruin", -14, 21, 100);

  mergeDecor(root, decor);

  // ---------- per-frame gameplay ----------
  let time = 0, chase = null;
  const api = {
    root, parts, enemies, wisps, shards, doctor, gateRocks, beast, portal,
    spawnPoint: { ...SPAWN }, checkpoint: { ...SPAWN },
    wispTotal: () => wisps.length, raft: () => raft,
    // returns events for main: {wisp}, {shard:id}, {hurt:{x,z}}, {stomp}, {splash}, {portal}, {caught}
    update(dt, player, playerFeetY, spinning) {
      time += dt; updaters.forEach(u => u(time, dt)); docAnim.mixer.update(dt);
      moon.position.set(player.pos.x + 40, 70, player.pos.z + 30); moon.target.position.copy(player.pos);
      const ev = [], px = player.pos.x, pz = player.pos.z;
      // checkpoints by area
      if (px < -38 && Math.abs(pz) < 40) api.checkpoint = swampSafe[0];
      else if (px > 40 && Math.abs(pz) < 40) api.checkpoint = { x: 36, z: 0 };
      else if (pz > 40 && Math.abs(px) < 30) api.checkpoint = { x: 0, z: 40 };
      else if (Math.hypot(px, pz) < 30) api.checkpoint = { ...SPAWN };
      // wisps + shards
      for (const w of wisps) { if (w.got) continue; w.w.position.y = w.y + Math.sin(time * 2 + w.x) * 0.3; w.w.rotation.y = time;
        if (Math.hypot(w.x - px, w.z - pz) < 2.2 && Math.abs(w.y - (playerFeetY + 1.6)) < 3) { w.got = true; root.remove(w.w); ev.push({ wisp: true, at: w.w.position }); } }
      for (const s of shards) { if (s.got) continue; s.g.rotation.y = time * 1.5; s.g.position.y = s.y + Math.sin(time * 2) * 0.4;
        if (Math.hypot(s.x - px, s.z - pz) < 2.8 && Math.abs(s.y - (playerFeetY + 2)) < 3.5) { s.got = true; root.remove(s.g); ev.push({ shard: s.id, at: s.g.position }); } }
      // swamp sludge
      if (px > SWAMP.x0 && px < SWAMP.x1 && pz > SWAMP.z0 && pz < SWAMP.z1 && playerFeetY < SWAMP.level - 0.2) ev.push({ splash: true });
      // raft ferry
      const onRaft = Math.abs(px - raft.x) < 3.8 && Math.abs(pz) < 3.8 && Math.abs(playerFeetY - deckY) < 0.7;
      raft = stepRaft(raft, onRaft, px, dt); placeRaft();
      // skull spitters: lob a sludge blob at where you'll be (raft drift included) when you're out on the swamp
      const onSwamp = px < SWAMP.x1 - 4 && px > SWAMP.x0 + 9 && Math.abs(pz) < 8;
      for (const s of spitters) {
        s.cd -= dt; s.t -= dt; s.an.mixer.update(dt); if (s.t <= 0) s.an.play("idle");
        if (!onSwamp || s.cd > 0 || Math.abs(px - s.x) > 14) continue;
        const from = new THREE.Vector3(s.x, 5.6, s.z), T = Math.hypot(px - s.x, pz - s.z) / 10;   // slow lob: about 1.3 s to react
        const to = new THREE.Vector3(px + (onRaft ? raft.vx : 0) * T, playerFeetY + 1.2, pz);
        const m = new THREE.Mesh(blobGeo, blobMat); m.position.copy(from); root.add(m);
        blobs.push({ m, from, v: to.sub(from).divideScalar(T), T, t: 0 });
        s.cd = 3.5 + Math.random() * 1.2; s.t = 0.6; s.an.play("attack-melee-right", 0.1, true);
      }
      for (let i = blobs.length - 1; i >= 0; i--) {   // hits cost a heart but never push you (power 0): no shove off the raft
        const b = blobs[i]; b.t += dt; const u = b.t / b.T;
        b.m.position.copy(b.from).addScaledVector(b.v, b.t); b.m.position.y += u < 1 ? Math.sin(u * Math.PI) * 3 : -(b.t - b.T) * 12;   // lob arc, then drop
        const d = Math.hypot(b.m.position.x - px, b.m.position.y - (playerFeetY + 1.2), b.m.position.z - pz);
        let gone = b.t > b.T + 1.2;
        if (spinning && d < 3) { ev.push({ stomp: true, spin: true, at: b.m.position.clone() }); gone = true; }   // spin swats it
        else if (d < 1.1) { ev.push({ hurt: { x: b.m.position.x, z: b.m.position.z, power: 0 } }); burst(scene, b.m.position, { color: 0x7dff4a, count: 20, speed: 8 }); gone = true; }
        if (gone) { root.remove(b.m); blobs.splice(i, 1); }
      }
      // falling debris
      for (const d of drops) {
        const cyc = (time + d.off) % 3.6, h = cyc < 2 ? 40 - cyc * cyc * 9.6 : -10;
        const topY = steps.reduce((a, [x, y, z]) => Math.hypot(x - d.x, z - d.z) < 4 ? y : a, 0);
        const y = Math.max(topY, h); d.r.position.set(d.x, y, d.z); d.r.visible = h > topY - 0.5; d.mark.position.set(d.x, topY + 0.06, d.z); d.mark.material.opacity = cyc < 2 ? 0.15 + cyc * 0.2 : 0;
        if (d.r.visible && Math.abs(y - topY) < 1.5 && cyc > 1.6 && cyc < 2 && Math.hypot(d.x - px, d.z - pz) < 2.6 && Math.abs(playerFeetY - topY) < 3) ev.push({ hurt: { x: d.x, z: d.z } });
      }
      // skull minions
      for (const e of enemies) {
        const st = e.brain.state;
        if (st === "dead") { e.dieT += dt; e.an.mixer.update(dt); if (e.dieT > 1.6 && e.o.visible) { e.o.visible = false; } continue; }
        const r = stepEnemy(e.brain, { x: px, y: playerFeetY, z: pz }, dt); e.brain = r.enemy;
        e.o.position.set(e.brain.x, 0, e.brain.z); e.o.rotation.y = e.brain.heading;
        e.an.play({ patrol: "walk", return: "walk", chase: "sprint", windup: "attack-melee-right", lunge: "attack-melee-right", recover: "idle" }[e.brain.state] || "idle");
        e.flash.material.opacity = e.brain.state === "windup" ? 0.5 + 0.5 * Math.sin(time * 30) : 0;
        e.an.mixer.update(dt);
        const dx = px - e.brain.x, dz = pz - e.brain.z, d = Math.hypot(dx, dz);
        if (player.vel.y < -2 && playerFeetY > 2.4 && playerFeetY < 5.5 && d < 2.4) { e.brain = { ...e.brain, state: "dead" }; e.an.play("die", 0.1, true); ev.push({ stomp: true, at: e.o.position.clone().setY(3) }); continue; }
        if (spinning && d < 4.2 && Math.abs(playerFeetY) < 3) { e.brain = { ...e.brain, state: "dead" }; e.an.play("die", 0.1, true); ev.push({ stomp: true, spin: true, at: e.o.position.clone().setY(3) }); continue; }
        if (r.hitPlayer) ev.push({ hurt: { x: e.brain.x, z: e.brain.z } });
      }
      // chase
      if (chase) {
        chase.t += dt; chase.speed = Math.min(15.2, 9 + chase.t * 1.4);
        chase.z = Math.min(chase.z - chase.speed * dt, pz + 30); beast.position.set(Math.sin(time * 2) * 1.5, Math.abs(Math.sin(time * 7)) * 0.9, chase.z); beast.rotation.set(0.22, Math.PI, Math.sin(time * 7) * 0.08);   // heavy bounding stomp, leaning in
        molandak.position.y = Math.abs(Math.sin(time * 6)) * 0.6; molandak.rotation.y = Math.sin(time * 3) * 0.4;   // hopping, facing you as you run in
        if (chase.z - pz < 5) ev.push({ caught: true });
        if (pz < CHASE_END + 8 && Math.abs(px) < 6) ev.push({ portal: true });
      }
      return ev;
    },
    startChase() {                                  // the gate rocks blow away; the beast appears behind you
      phys.world.removeCollider(gateCol, false); gateRocks.forEach(r => { burst(scene, r.position.clone().setY(4), { color: 0xb59aff, count: 30, speed: 14 }); root.remove(r); });
      beast.visible = true; chase = { t: 0, z: 22, speed: 9 }; api.checkpoint = { x: 0, z: -26 };
    },
    restartChase(player) { chase = { t: 0, z: 8, speed: 9 }; player.teleport(0, 0, -26); },
    chasing: () => !!chase,
  };
  return api;
}
