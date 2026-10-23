// Chapter 10 "End Game": Young Mongrod, drunk on the Monorb, is destroying a clan village. The heroes fight him, Molandak tries to talk him down
// (your choices, trust/rage flags and Side/secret traits pick the ending flavour), Future Mongrod bursts out of a portal, and Young Mongrod
// sacrifices himself by overloading both orbs. A goodbye at the pub, then Molandak jumps home - into a desert wasteland. Cliffhanger.
import { THREE, createKit, preload, spawn, drift, N } from "./kit.js";

export const meta = { n: 10, title: "Chapter 10 · End Game", card: "cards/ch9.jpg",
  text: "Young Mongrod, powered by the Monorb, is tearing a village apart in a rage. This ends today — one way or another." };

const V = { x: 0, z: 0 }, PUB = { x: 320, z: 0 }, DES = { x: -320, z: 0 };   // three places: the burning village, the pub at dawn, the desert future

export async function build({ scene, phys, traits, rules }) {
  await preload(["tent_detailedOpen", "tent_detailedClosed", "tent_smallOpen", "fence_simple", "tree_detailed", "tree_fat", "tree_oak", "plant_bushLarge", "rock_largeA", "campfire_stones", "log", "stone_tallB", "flower_yellowB"].map(k => `${N}${k}.glb`));
  const K = await createKit(scene, phys);
  K.sky(0x3a1418, 0x4a1c1c, 0.0075);
  K.lights({ hemi: [0xffc8a0, 0x4a2020, 1.5], sun: { color: 0xff9060, i: 1.7, pos: [30, 50, 10], range: 70 } });
  K.ground(110, 0x4a3030, 0);

  // ---- the burning village ----
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.2, r = 38 + (i % 3) * 6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const t = await spawn(`${N}${i % 3 ? "tent_detailedOpen" : "tent_detailedClosed"}.glb`, { pos: [x, 0, z], tint: 0xc07050, rot: -a }); K.fit(t, 10); K.add(t, { collide: "box", shrink: 0.75, outlined: true, merge: false });
    const fl = K.glow(0xff6a20, 11, x, 7, z, 0.55); fl.userData.fire = true; }
  for (let i = 0; i < 40; i++) { const a = K.rnd() * Math.PI * 2, r = 62 + K.rnd() * 38, o = await spawn(`${N}${["tree_detailed", "tree_oak", "tree_fat"][i % 3]}.glb`, { pos: [Math.cos(a) * r, 0, Math.sin(a) * r], rot: K.rnd() * 6, tint: 0x6a4a40 }); K.fit(o, 12 + K.rnd() * 10); K.add(o, { collide: "cyl", shrink: 0.25, merge: true }); }
  const embers = drift(K.root, { count: 320, box: [130, 30, 130], center: [0, 15, 0], color: 0xff7a2a, size: 0.65, speed: 1.4 }); K.updaters.push(t => embers.update(t));
  const smoke = drift(K.root, { count: 90, box: [110, 26, 110], center: [0, 20, 0], color: 0x2a1818, size: 9, speed: 0.5 }); smoke.pts.material.blending = THREE.NormalBlending; smoke.pts.material.opacity = 0.35; K.updaters.push(t => smoke.update(t));
  const fireLight = new THREE.PointLight(0xff6a20, 140, 90); fireLight.position.set(0, 12, 10); K.root.add(fireLight); K.updaters.push(t => fireLight.intensity = 130 + Math.sin(t * 9) * 20);
  const stage = K.stage({ x: 78, y: 44, z: -24, top: 0x6a4040, rim: 0x3a2020, ring: 0xff6a3a, pillar: { h: 44, color: 0x3a2020 } });

  // ---- the pub at dawn (the goodbye) ----
  K.box(PUB.x, -0.5, 0, 90, 1, 90, 0x5a8a3a); K.box(PUB.x, 7, -22, 34, 14, 14, 0x8a5a3a, { outlined: true }); K.box(PUB.x, 15.5, -22, 38, 3, 18, 0x6a3a2a, { collide: false, outlined: true });
  const sign = K.text("MOYAKI'S PUB", "#ffe8a0", 12, 2.4); sign.position.set(PUB.x, 11, -14.8); K.root.add(sign);
  K.box(PUB.x, 3.4, -14.6, 5, 6.4, 0.6, 0x4a2f1a, { collide: false }); K.glow(0xffd070, 12, PUB.x, 4, -13, 0.4);
  for (const [x, z] of [[-22, 14], [24, 10], [-30, -6], [32, -10]]) { const t = await spawn(`${N}tree_detailed.glb`, { pos: [PUB.x + x, 0, z] }); K.fit(t, 15); K.add(t, { collide: "cyl", shrink: 0.2, outlined: true }); }
  const elder = await spawn(`${N}tree_oak.glb`, { pos: [PUB.x + 56, 0, -34] }); K.fit(elder, 40);
  elder.traverse(m => { if (!m.isMesh) return; const c = m.material.color; m.material = m.material.clone(); m.material.color.set(c.g > c.r ? 0xffc93a : 0x8a5a3a); }); K.add(elder, { outlined: true }); K.glow(0xffd23a, 24, PUB.x + 56, 22, -34, 0.3);
  K.updaters.push(drift(K.root, { count: 90, box: [90, 22, 70], center: [PUB.x, 11, 0], color: 0xffe9a0, size: 0.5, speed: 0.6 }).update);

  // ---- the desert future (the cliffhanger) ----
  K.box(DES.x, -0.5, 0, 110, 1, 110, 0xb89a62); const ruin = [];
  for (let i = 0; i < 14; i++) { const x = DES.x + (K.rnd() - 0.5) * 80, z = (K.rnd() - 0.5) * 70, h = 6 + K.rnd() * 16; if (Math.hypot(x - DES.x, z) < 14) continue; K.box(x, h / 2, z, 2.6 + K.rnd() * 2, h, 2.6 + K.rnd() * 2, 0x8a7a62, { outlined: true }); }
  K.updaters.push(drift(K.root, { count: 220, box: [110, 18, 100], center: [DES.x, 9, 0], color: 0xe8c890, size: 1.1, speed: 3 }).update);

  // ---- cast ----
  const C = {}; for (const id of ["molandak", "moyaki", "salmonad", "mouch"]) C[id] = await K.cast(id);
  const young = await K.cast("mongrod"), future = await K.cast("cyborg"), guards = [await K.cast("rillaGuard"), await K.cast("rillaGuard")];
  future.visible = false; guards.forEach(g => g.visible = false);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(6.5, 22, 16), new THREE.MeshBasicMaterial({ color: 0xff7aff, transparent: true, opacity: 0.25, depthWrite: false })); K.root.add(aura);
  const orbA = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 2), new THREE.MeshStandardMaterial({ color: 0xb070ff, emissive: 0xa050ff, emissiveIntensity: 2.2 })), orbB = orbA.clone(); orbB.material = orbA.material.clone(); K.root.add(orbA, orbB); orbA.visible = orbB.visible = false;
  const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); K.root.add(blast);
  const portal = new THREE.Group(); portal.position.set(0, 9, -28); { const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.9, 12, 48), new THREE.MeshStandardMaterial({ color: 0x241a3a, emissive: 0x7a3aff, emissiveIntensity: 1.8 })); const disc = new THREE.Mesh(new THREE.CircleGeometry(6.6, 36), new THREE.MeshBasicMaterial({ color: 0x9a5aff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); portal.add(ring, disc); } portal.scale.setScalar(0.001); K.root.add(portal);
  K.updaters.push((t) => { aura.position.set(young.position.x, young.position.y + 4.2, young.position.z); aura.scale.setScalar(1 + Math.sin(t * 6) * 0.05); portal.rotation.z = t * 0.9; K.root.children.forEach(c => { if (c.userData.fire) c.material.opacity = 0.45 + Math.sin(t * 7 + c.position.x) * 0.15; }); });
  const team = (x, z, lx, lz) => { K.put(C.molandak, x + 6, 0, z, lx, lz); K.put(C.moyaki, x - 8, 0, z + 2, lx, lz); K.put(C.salmonad, x + 10, 0, z + 5, lx, lz); K.put(C.mouch, x - 3, 3.4, z + 7, lx, lz); };
  const light = (bg, fog, d) => K.sky(bg, fog, d);

  let ending = "redeem";
  const level = K.level({
    camYaw: 0, camDist: 20, camPitch: 0.45, spawnPoint: { x: 0, y: 0, z: 40 }, checkpoint: { x: 0, z: 40 },
    tick(t) { C.mouch.userData.animate?.(t, 1); },
    autoSolve() {},
    async script(api) {
      const put = (x, z, lx, lz) => { api.chog.root.position.set(x, 2.36, z); api.chog.root.rotation.y = Math.atan2(lx - x, lz - z); api.chog.root.visible = true; };
      const st = api.flag("trust") || 0, rg = api.flag("rage") || 0;
      team(0, 38, 0, -10); put(0, 36, 0, -10); K.put(young, 0, 0, -12, 0, 40); await api.title("End Game", "Chapter 10");
      await api.cine([
        { dur: 4.6, cam: [0, 14, 70, 0, 6, 10], to: [0, 11, 58, 0, 6, 0], line: ["Moyaki", "The Rilla village… it's burning. All of it."], start: () => { team(0, 38, 0, -10); put(0, 36, 0, -10); K.put(young, 0, 0, -12, 0, 40); } },
        { dur: 4.4, cam: [-10, 7, 32, 0, 9, -12], to: [-6, 7, 28, 0, 9, -12], line: ["Young Mongrod", "The clan that mocked me! Look at them run! LOOK AT THEM RUN!"], start: () => { api.shake(0.7); } },
        { dur: 4.4, cam: [10, 6, 30, 4, 4, 20], line: ["Molandak", "Mongrod! Stop! The Monorb is eating you alive — you can't even see what you're doing!"] },
        { dur: 4.4, cam: [0, 9, 8, 0, 8, -12], to: [0, 8, 4, 0, 8, -12], line: ["Young Mongrod", "I see everything. I see the world that laughed. And I will make it QUIET."] },
        { dur: 3.6, cam: [-8, 5, 36, -4, 4.4, 30], line: ["Mouch", "Bzzz. Okay, that's a no. Everyone — together!"] },
      ]);
      const res = await api.fight({ stage, dist: 30, opts: { winsToWin: 2, shrink: true }, actors: [
        K.actor("mongrod", young, { name: "Young Mongrod", perks: { power: 1.5, weight: 2.0, body: 2.3, slam: { every: 4, wind: 0.85, r: 8.5, k: 1.2, recover: 1.2 } }, ai: { react: 0.4, aggr: 0.95 } }),
        K.actor("mouch", C.mouch, { name: "Mouch", team: "hero", baseY: 2.6, perks: { speed: 1.15, weight: 0.9 }, ai: { react: 0.2 } }),
        K.actor("moyaki", C.moyaki, { name: "Moyaki", team: "hero", perks: { reach: 1.15 }, ai: { react: 0.35 } }),
        K.actor("salmonad", C.salmonad, { name: "Salmonad", team: "hero", perks: { weight: 1.2 }, ai: { react: 0.4 } }),
      ] });
      team(0, 38, 0, -10); put(0, 36, 0, -10); K.put(young, 0, 0, -8, 0, 40);
      await api.cine([
        { dur: 4.2, cam: [-8, 6, 24, 0, 6, -8], line: ["Young Mongrod", res.won ? "How… how can you still stand? I have the ORB." : "Is that all?! Is that ALL?!"], start: () => { aura.material.opacity = 0.3; } },
        { dur: 4.6, cam: [10, 5.4, 30, 5, 4.4, 20], line: ["Molandak", "Mongrod. Listen to me. I know who you were. A brilliant inventor — a Rilla who wanted to build something that would make them proud."] },
      ]);
      // the plea: Molandak asks, you answer. Secret Chogs get a third option.
      await api.cine([{ dur: 0.6, cam: [8, 6, 26, 0, 5, -8], line: null }]);
      const opts = ["\"You were never a monster. They hurt you. Come back.\"", "\"Your pain doesn't excuse this. It ends now.\""];
      if (rules.secret) opts.push("\"…The orb's power. Let me share it. Together we could fix everything.\"");
      const pick = await api.choose("Molandak looks to you. What do you say to Mongrod?", opts);
      ending = pick === 2 ? "join" : pick === 1 ? "stop" : "redeem";
      if (pick === 0) st >= 0 && api.bumpFlag("trust"); else if (pick === 1) api.bumpFlag("rage"); else api.setFlag("orbbound", true);
      api.setFlag("ending", ending);
      const reply = { redeem: ["Young Mongrod", "…Nobody ever said that to me. Not once."], stop: ["Young Mongrod", "Stop me, then. If you can."], join: ["Young Mongrod", "Share it? You… you'd share it? The orb — it whispers about you, too."] }[ending];
      await api.cine([
        { dur: 4.4, cam: [8, 6, 26, 0, 5, -8], to: [5, 6, 20, 0, 5, -8], line: reply },
        { dur: 3.8, cam: [-10, 8, 26, 0, 9, -26], to: [-6, 8, 20, 0, 9, -26], line: ["Moyaki", "Uh. Why is the sky making that noise?"], start: () => { api.shake(0.8); portal.scale.setScalar(0.4); } },
        { dur: 3.6, cam: [0, 10, 10, 0, 9, -28], line: null, tick: u => portal.scale.setScalar(0.4 + u * 1.2) },
        { dur: 4.4, cam: [0, 8, 4, 0, 9, -28], to: [0, 8, -2, 0, 9, -28], line: ["Future Mongrod", "Enough. The future is inevitable. I will not be undone by a boy who still cries over a tree."], start: () => { future.visible = true; K.put(future, 0, 0, -30, 0, 40); api.sfx("roar"); api.shake(1.2); } },
      ]);
      // the sacrifice
      const wl = ending === "redeem" ? ["Young Mongrod", "I was a fool. But I heard her — I mean, him. Molandak. Somebody finally said it. And I won't let that voice end like this."]
        : ending === "stop" ? ["Young Mongrod", "I see it now. Both of us end the same way — alone. I won't be you. I WON'T."]
        : ["Young Mongrod", "The orb showed me what I become. A tyrant. And it showed me you, Chog — ready to follow me down. I won't let you."];
      await api.cine([
        { dur: 4.8, cam: [-9, 8, 14, 0, 7, -12], to: [-6, 8, 10, 0, 7, -14], line: wl, start: () => { aura.material.opacity = 0.1; K.put(young, -2, 0, -10, 0, -30); } },
        { dur: 4.2, cam: [8, 9, 6, 0, 8, -22], line: ["Future Mongrod", "What are you doing?! Get OFF me! You are NOTHING without me!"], start: () => { K.put(young, 0, 0, -20, 0, -30); K.put(future, 0, 0, -26, 0, 30); api.shake(0.9); } },
        { dur: 4.6, cam: [0, 10, 12, 0, 8, -22], line: ["Young Mongrod", "Run. All of you. I'm overloading both orbs. This is the only way anyone gets a future."], start: () => { orbA.visible = orbB.visible = true; orbA.position.set(-2, 8, -20); orbB.position.set(2, 8, -26); } },
        { dur: 3.4, cam: [-6, 6, 30, 0, 9, -22], line: ["Molandak", "MONGROD— NO!"], tick: u => { orbA.scale.setScalar(1 + u * 3); orbB.scale.setScalar(1 + u * 3); orbA.position.lerp(orbB.position, u * 0.1); } },
        { dur: 2.4, cam: [0, 10, 16, 0, 9, -22], line: null, start: () => { api.shake(1.6); api.sfx("roar"); blast.position.set(0, 8, -22); }, tick: u => { blast.material.opacity = Math.min(1, u * 2); blast.scale.setScalar(2 + u * 60); } },
      ]);
      young.visible = future.visible = false; orbA.visible = orbB.visible = false; portal.visible = false; aura.visible = false; blast.visible = false;
      light(0x7a6a80, 0x8a7a90, 0.005); fireLight.intensity = 30; K.root.children.forEach(c => { if (c.userData.fire) c.visible = false; });
      team(0, 32, 0, -20); put(0, 30, 0, -20);
      await api.cine([
        { dur: 4.8, cam: [-10, 6, 40, 0, 6, 0], to: [-6, 6, 36, 0, 6, 0], line: ["Salmonad", "…We're alive. The explosion — it took both of them. Both Mongrods. And both orbs."] },
        { dur: 4.6, cam: [10, 5.6, 40, 6, 4.4, 32], line: ["Molandak", ending === "join" ? "He chose to end it. Even when the orb was whispering. That's a kind of strength none of us expected." : "He chose to end it. After everything he did… he chose. I won't forget that."] },
        { dur: 4.4, cam: [-10, 5.4, 38, -3, 4.4, 34], line: ["Moyaki", "…I'm going to make a really big stew for him tonight. In his honour."] },
      ]);
      // the pub at dawn
      light(0xf6d89a, 0xfbe8c0, 0.003); embers.pts.visible = false; smoke.pts.visible = false;
      K.put(C.molandak, PUB.x + 4, 0, 6, PUB.x, -14); K.put(C.moyaki, PUB.x - 8, 0, 4, PUB.x, 4); K.put(C.salmonad, PUB.x + 9, 0, 6, PUB.x, 4); K.put(C.mouch, PUB.x - 3, 3.4, 8, PUB.x, 4); K.put(C.molandak, PUB.x + 4, 0, 4, PUB.x - 4, 4);
      api.chog.root.position.set(PUB.x - 2, 2.36, 4); api.chog.root.rotation.y = Math.atan2(4, 0);
      await api.cine([
        { dur: 4.4, cam: [PUB.x - 8, 12, 30, PUB.x, 8, -14], to: [PUB.x - 4, 11, 24, PUB.x, 8, -14], line: ["Moyaki", "To Mongrod the Brave, and to the best stew I've ever served. Goodbye, everyone."], start: () => { K.put(C.molandak, PUB.x + 4, 0, 4, PUB.x - 4, 4); K.put(C.moyaki, PUB.x - 8, 0, 4, PUB.x, 4); K.put(C.salmonad, PUB.x + 9, 0, 6, PUB.x, 4); K.put(C.mouch, PUB.x - 3, 3.4, 8, PUB.x, 4); api.chog.root.position.set(PUB.x - 2, 2.36, 4); api.chog.root.rotation.y = Math.atan2(6, 0); } },
        { dur: 4.2, cam: [PUB.x + 14, 6, 14, PUB.x + 9, 4.6, 6], line: ["Salmonad", "My map's blank for the first time in years. I think I'll draw something new."] },
        { dur: 3.8, cam: [PUB.x - 10, 5.6, 14, PUB.x - 3, 4.8, 8], line: ["Mouch", "Bzzz. Look us up if you ever need a fast friend. Chog — you too."] },
        { dur: 4.8, cam: [PUB.x + 10, 6, 14, PUB.x + 4, 4.6, 4], to: [PUB.x + 7, 5.6, 10, PUB.x + 4, 4.6, 4], line: ["Molandak", "Thank you, Chog. All of you. I'm going home now. I hope I changed it. I hope it's better."] },
        { dur: 3.4, cam: [PUB.x + 4, 5, 12, PUB.x + 4, 4.6, 4], line: null, start: () => { api.sfx("shard"); }, tick: u => { C.molandak.scale.setScalar(Math.max(0.01, 1 - u)); C.molandak.position.y = u * 4; } },
      ]);
      C.molandak.visible = false;
      await api.cine([{ dur: 4.4, cam: [PUB.x - 6, 6, 16, PUB.x, 8, -16], line: ["Chog #" + api.token, "(…He's gone. I hope the wasteland he came from has changed. Somehow.)"] }]);
      // the desert: Molandak's return
      light(0xe8c890, 0xf0d8a8, 0.006); C.molandak.visible = true; C.molandak.scale.setScalar(1); K.put(C.molandak, DES.x, 0, 4, DES.x, -30);
      guards.forEach((g, i) => { g.visible = true; K.put(g, DES.x + (i ? 22 : -22), 0, -22, DES.x, 4); });
      api.chog.root.position.set(DES.x + 30, 2.36, 14); api.chog.root.rotation.y = Math.atan2(-30, -10);
      await api.title("Years Later…", "", 2400);
      await api.cine([
        { dur: 4.4, cam: [DES.x - 8, 9, 30, DES.x, 5, 0], to: [DES.x - 4, 8, 22, DES.x, 5, 0], line: ["Molandak", "The jungle… it's still gone. The Elder Tree — nothing. I changed nothing?"], start: () => { K.put(C.molandak, DES.x, 0, 4, DES.x, -30); C.molandak.visible = true; } },
        { dur: 4.0, cam: [DES.x + 18, 7, -6, DES.x + 22, 5, -22], to: [DES.x + 10, 7, -2, DES.x, 5, 0], line: ["Armed Monanimal", "INTRUDER! Surround him! In the name of the Free Jungle — cut him down!"], start: () => api.shake(0.6) },
        { dur: 4.2, cam: [DES.x - 14, 7, 12, DES.x - 4, 5, 6], line: ["Molandak", "Wait — I'm not — I'm Molandak! I used to — "] },
        { dur: 4.4, cam: [DES.x + 20, 6, 24, DES.x + 30, 5, 14], to: [DES.x + 24, 6, 20, DES.x + 30, 5, 14], line: ["Old Chog", "Not here. Not now, kid. This way — quick! Take my hand!"], start: () => { api.chog.root.position.set(DES.x + 30, 2.36, 14); api.chog.root.rotation.y = Math.atan2(-30, -10); } },
        { dur: 4.6, cam: [DES.x + 16, 8, 16, DES.x + 6, 4, 6], line: ["Old Chog", "There's a lot you need to know about what came after Mongrod. …Welcome to the future."], start: () => api.shake(0.3) },
      ]);
      const endText = { redeem: "Mongrod heard the voice that finally believed in him — and chose to end it himself.", stop: "Mongrod saw the monster he'd become, and chose to end it himself.", join: "Mongrod refused to take you with him — and chose to end it himself." }[ending];
      api.finish({ badges: ["endgame", ending === "redeem" ? "redeemer" : ending === "stop" ? "stopper" : "orbbound"], text: `${endText}\n\nThe heroes said goodbye. Molandak jumped home — to a desert wasteland, and an old Chog's outstretched hand. To be continued…` });
    },
  });
  K.finish();
  return level;
}
