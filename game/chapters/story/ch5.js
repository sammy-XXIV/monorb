// Chapter 5 "The Heroes Assemble": under the Great Elder Tree, Molandak equips each hero, your Chog learns an ability from its traits,
// and the team trains on dummies. Unseen glowing blue eyes watch from the bushes.
import { THREE, createKit, preload, spawn, drift, N } from "./kit.js";

export const meta = { n: 5, title: "Chapter 5 · The Heroes Assemble", card: "cards/ch5.jpg",
  text: "Under the Great Elder Tree the monanimals prepare for battle. Molandak has gifts for each of them — and something is watching from the bushes." };

const abilityOf = t => { const e = (t.Eyes || "").toLowerCase();
  if (/laser|glass|visor|vr/.test(e)) return ["Light Beam", "a beam of focused light from your eyes"];
  if (t.Head) return ["Dash", "a burst of speed that lets you slip past anything"];
  return ["Shield", "a shimmering shield that absorbs a hit"]; };

export async function build({ scene, phys, traits }) {
  await preload(["tree_oak", "tree_fat", "tree_detailed", "tree_palmTall", "plant_bushLarge", "plant_bushDetailed", "mushroom_redGroup", "mushroom_tanTall", "rock_largeA", "rock_largeC", "stone_tallB", "grass_large", "flower_purpleA", "flower_yellowB", "log"].map(k => `${N}${k}.glb`));
  const K = await createKit(scene, phys);
  K.sky(0xb8dff0, 0xcfe8e0, 0.0045);
  K.lights({ hemi: [0xfff2d0, 0x3a6a30, 1.8], sun: { color: 0xfff0c8, i: 2.5, pos: [30, 70, 20], range: 55 } });
  K.ground(110, 0x4a8a3a, 0);

  // the Elder Tree, golden and huge, with a ring of mushrooms and standing stones
  const elder = await spawn(`${N}tree_oak.glb`, { pos: [0, 0, -34] }); K.fit(elder, 46);
  elder.traverse(m => { if (!m.isMesh) return; const c = m.material.color; m.material = m.material.clone(); m.material.color.set(c.g > c.r ? 0xffc93a : 0x8a5a3a); });
  K.add(elder, { collide: "cyl", shrink: 0.16, outlined: true });
  K.updaters.push(drift(K.root, { count: 160, box: [30, 26, 30], center: [0, 24, -34], color: 0xffe066, size: 0.85, speed: 0.7 }).update);
  K.glow(0xffd23a, 34, 0, 30, -34, 0.35);
  for (let i = 0; i < 70; i++) {
    const a = K.rnd() * Math.PI * 2, r = 36 + K.rnd() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r - 10; if (Math.hypot(x, z - 0) < 34) continue;
    const k = ["tree_fat", "tree_detailed", "tree_palmTall", "tree_oak"][i % 4], t = await spawn(`${N}${k}.glb`, { pos: [x, 0, z], rot: K.rnd() * 6.3 }); K.fit(t, 14 + K.rnd() * 10); K.add(t, { collide: "cyl", shrink: 0.2, merge: true });
  }
  for (let i = 0; i < 90; i++) { const a = K.rnd() * Math.PI * 2, r = 12 + K.rnd() * 70, k = ["plant_bushLarge", "grass_large", "flower_purpleA", "mushroom_redGroup", "flower_yellowB", "plant_bushDetailed"][i % 6];
    const o = await spawn(`${N}${k}.glb`, { pos: [Math.cos(a) * r, 0, Math.sin(a) * r - 10], rot: K.rnd() * 6, scale: 4 + K.rnd() * 3, shadow: false }); K.root.add(o); K.decor.push(o); }
  for (const [x, z] of [[-14, 6], [14, 6], [-20, -6], [20, -6]]) { const st = await spawn(`${N}stone_tallB.glb`, { pos: [x, 0, z] }); K.fit(st, 7); K.add(st, { collide: "box", shrink: 0.7, outlined: true }); }

  // training platform (a stump-circle dais raised just above the grass) + three dummies
  const platform = K.stage({ x: 0, y: 14, z: 30, top: 0x9a8a6a, rim: 0x6a5a3a, ring: 0xffe27a, pillar: { h: 14, color: 0x6a5a3a } });
  const C = {}; for (const id of ["molandak", "moyaki", "salmonad", "mouch"]) C[id] = await K.cast(id);
  const dummies = [K.dummy(), K.dummy(), K.dummy()]; for (const d of dummies) { d.visible = false; K.root.add(d); }
  const watcher = []; for (const [x, z] of [[-30, 4], [34, 14], [-8, 44]]) { const e = new THREE.Group(); for (const dx of [-0.55, 0.55]) { const s = K.glow(0x66ccff, 1.4, x + dx, 2.6, z, 0); e.add(s); watcher.push(s); } }
  K.updaters.push((t) => { for (const w of watcher) if (w.userData.on) w.material.opacity = 0.7 + Math.sin(t * 6 + w.position.x) * 0.2; });

  const PL = [0, -0.5], TREE = [0, -26];
  const stand = () => { K.put(C.molandak, 0, 0, 2, 0, 12); K.put(C.moyaki, -9, 0, 6, 0, 8); K.put(C.salmonad, 9, 0, 6, 0, 8); K.put(C.mouch, -3, 3.4, 9, 0, 8); };
  const level = K.level({
    camYaw: 0, camDist: 16, camPitch: 0.45, spawnPoint: { x: 0, y: 0, z: 14 }, checkpoint: { x: 0, z: 14 },
    tick(t) { C.mouch.position.y = 3.4 + Math.sin(t * 2.2) * 0.3; C.mouch.userData.animate?.(t, 1); },
    async script(api) {
      const [ab, abText] = abilityOf(api.traits()); api.setFlag("ability", ab);
      const put = (x, z, lx, lz) => { api.chog.root.position.set(x, 2.36, z); api.chog.root.rotation.y = Math.atan2(lx - x, lz - z); api.chog.root.visible = true; };
      await api.title("The Heroes Assemble", "Chapter 5");
      stand(); put(0, 12, 0, 0);
      await api.cine([
        { dur: 4.2, cam: [0, 14, 44, 0, 14, -34], to: [0, 10, 30, 0, 16, -34], line: ["Molandak", "Under the Great Elder Tree, in the light of the past. This is where we begin."], start: () => { stand(); put(0, 12, 0, 0); } },
        { dur: 4.4, cam: [8, 4.4, 14, -2, 3.6, 4], line: ["Molandak", "None of you has fought Mongrod. None of you knows what he's become. So I brought gifts."] },
        { dur: 4.6, cam: [7, 4.8, 6, 0, 3.8, 11], to: [5, 4.5, 5.5, 0, 3.8, 11], line: ["Molandak", "Chog — a reinforced paintbrush staff. It leaves trails of light wherever you swing it."] },
        { dur: 4.2, cam: [-3.5, 5.2, 14, -3, 4.6, 8.5], line: ["Molandak", "Mouch — a humming energy blade. With your speed, it's lethal."] },
        { dur: 4.4, cam: [13, 5.2, 12, 9, 4, 6], line: ["Molandak", "Salmonad — your own inventions: shields, gadgets, traps. Build us a way out of anything."] },
        { dur: 4.6, cam: [-14, 4.4, 12, -9, 3.2, 6], line: ["Molandak", "Moyaki — a spice launcher. Smoke screens, confusion, and absolutely excellent seasoning."] },
        { dur: 3.4, cam: [-9, 4.4, 11, -9, 3.2, 6], line: ["Moyaki", "…I could grow to love this."] },
      ]);
      await api.say([["Molandak", `And you, Chog. Your traits show what you carry inside. I see ${abText}.`], ["Molandak", `Your ability: ${ab}. Let's see you use it.`]]);
      api.toast(`Ability learned: ${ab}`, 3600);
      // training: knock the dummies off the dais
      const stage = platform, actors = dummies.map((d, i) => { d.visible = true; return K.actor("dummy" + i, d, { name: "Dummy", ai: { passive: true } }); });
      await api.cine([{ dur: 3.2, cam: [0, 8, 56, 0, 14, 30], to: [0, 12, 50, 0, 15, 30], line: ["Salmonad", "Training dummies on the old stump-circle. Knock them off — spin attack, K or tap Spin. Easy."] }]);
      const res = await api.fight({ stage, actors, opts: { winsToWin: 1, shrink: false }, dist: 26 });
      for (const d of dummies) d.visible = false;
      stand(); put(0, 12, 0, 0);
      await api.cine([
        { dur: 4, cam: [10, 5, 16, 0, 3.6, 10], line: ["Mouch", res.won ? "Bzzz. Not bad for a first swing." : "Bzzz. We'll practise that again later."] },
        { dur: 4.4, cam: [-8, 4.6, 14, 0, 3.4, 8], line: ["Moyaki", "Everyone together now! Smoke, blade, shield, light — and a very good stew afterwards!"] },
        { dur: 4.4, cam: [0, 7, 8, 0, 3.4, 20], to: [0, 6, 14, 0, 3, 24], line: ["Molandak", "That's the spirit. Mongrod is out there. But now, so are we."],
          start: () => { watcher.forEach(w => { w.userData.on = true; w.material.opacity = 0.75; }); } },
        { dur: 4.2, cam: [-26, 3.4, 12, -30, 2.6, 4], to: [-27, 3.2, 9, -30, 2.6, 4], line: ["Chog #" + api.token, "(Something blue is glinting in the bushes. Two eyes… watching us.)"] },
      ]);
      api.finish({ badges: ["assembled"], text: `The heroes are armed and ready. Your ability: ${ab}. And someone is watching from the bushes…` });
    },
    autoSolve() {},
  });
  K.finish();
  return level;
}
