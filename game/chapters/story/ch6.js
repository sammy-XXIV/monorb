// Chapter 6 "The First Encounter": Salmonad's map leads to the Rilla Clan village. The heroes are caught, brought before the huge chief,
// and prove themselves in a duel with spice bombs, speed and teamwork. He tells them Mongrod is in the Dark Forests chasing a crystal.
import { THREE, createKit, preload, spawn, drift, N } from "./kit.js";

export const meta = { n: 6, title: "Chapter 6 · The First Encounter", card: "cards/ch6.jpg",
  text: "Salmonad's map points to the Rilla Clan village — the only ones who might know where Mongrod went. They don't take kindly to strangers." };

export async function build({ scene, phys, traits }) {
  await preload(["tent_detailedOpen", "tent_detailedClosed", "tent_smallOpen", "rock_largeA", "rock_largeC", "rock_tallA", "rock_tallE", "stone_tallB", "campfire_stones", "log", "log_stack", "fence_simple", "fence_gate", "grass_large", "plant_bushLarge", "tree_cone"].map(k => `${N}${k}.glb`));
  const K = await createKit(scene, phys);
  K.sky(0xf2b080, 0xe8a07a, 0.0055);
  K.lights({ hemi: [0xffe0c0, 0x7a4a30, 1.7], sun: { color: 0xffc890, i: 2.4, pos: [-40, 40, 30], range: 70 } });
  K.ground(130, 0xb98650, 0);

  // canyon rim of rocks + the village wall with a gate
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 100 + K.rnd() * 14, k = ["rock_tallA", "rock_largeA", "rock_tallE", "rock_largeC"][i % 4];
    const o = await spawn(`${N}${k}.glb`, { pos: [Math.cos(a) * r, 0, Math.sin(a) * r - 10], rot: K.rnd() * 6, tint: 0xc08a64 }); K.fit(o, 26 + K.rnd() * 18); K.add(o, { collide: "box", shrink: 0.7, merge: true }); }
  for (let i = 0; i < 36; i++) { const x = (K.rnd() - 0.5) * 150, z = 30 + K.rnd() * 55; if (Math.abs(x) < 14) continue;
    const o = await spawn(`${N}${["rock_largeA", "rock_largeC", "tree_cone", "plant_bushLarge"][i % 4]}.glb`, { pos: [x, 0, z], rot: K.rnd() * 6 }); K.fit(o, 5 + K.rnd() * 7); K.add(o, { collide: i % 4 < 3 ? "box" : null, shrink: 0.7, merge: true }); }
  for (let x = -34; x <= 34; x += 5) { if (Math.abs(x) < 6) continue; const f = await spawn(`${N}fence_simple.glb`, { pos: [x, 0, 24] }); K.fit(f, 5); f.scale.x *= 1.5; K.add(f, { outlined: true }); }
  K.box(-5, 3.5, 24, 1.6, 7, 1.6, 0x6b4a2f, { outlined: true }); K.box(5, 3.5, 24, 1.6, 7, 1.6, 0x6b4a2f, { outlined: true }); K.box(0, 7.6, 24, 12.5, 1.1, 1.6, 0x6b4a2f, { collide: false, outlined: true });
  for (const x of [-34, 34]) K.box(x, 3, 24, 2, 6, 2, 0x6b4a2f, { outlined: true });
  const skull = K.text("RILLA", "#ffffff", 5, 1.4); skull.position.set(0, 7.7, 25); K.root.add(skull);
  phys.box(-20, 3, 24, 14.5, 3, 0.6); phys.box(20, 3, 24, 14.5, 3, 0.6);

  // the village: tents in a ring, fire pit, totem poles, hanging bone charms
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, r = 42, x = Math.cos(a) * r, z = Math.sin(a) * r - 40; if (z > 14) continue;
    const t = await spawn(`${N}${i % 3 ? "tent_detailedOpen" : "tent_detailedClosed"}.glb`, { pos: [x, 0, z], tint: 0xe8a070 }); K.fit(t, 11); K.face(t, 0, -40); t.rotation.y += Math.PI; K.add(t, { collide: "box", shrink: 0.75, outlined: true }); }
  const fire = await spawn(`${N}campfire_stones.glb`, { pos: [0, 0, -4], scale: 9 }); K.add(fire);
  const fl = new THREE.PointLight(0xff8a3a, 120, 50); fl.position.set(0, 5, -4); K.root.add(fl); K.glow(0xff7a2a, 9, 0, 4, -4, 0.4);
  const flames = drift(K.root, { count: 90, box: [3, 5, 3], center: [0, 3.5, -4], color: 0xff7a2a, size: 1.8, speed: 9 }); K.updaters.push(t => { fl.intensity = 100 + Math.sin(t * 13) * 18; flames.update(t); });
  for (const [x, z] of [[-14, 8], [14, 8], [-22, -22], [22, -22]]) { K.cyl(x, 5, z, 0.8, 10, 0x6b4a2f, { outlined: true }); const f = K.box(x, 10.4, z, 2.6, 2.2, 2.6, 0xb23a3a, { collide: false, outlined: true }); K.glow(0xffb040, 4, x, 10.4, z + 1.4, 0.5); }
  K.updaters.push(drift(K.root, { count: 220, box: [150, 24, 150], center: [0, 12, -30], color: 0xffb070, size: 0.5, speed: 0.5 }).update);

  const stage = K.stage({ x: 0, y: 12, z: -44, top: 0xb08a5a, rim: 0x6a4a2f, ring: 0xff9a4a, pillar: { h: 12, color: 0x7a5a3a } });
  const C = {}; for (const id of ["molandak", "moyaki", "salmonad", "mouch"]) C[id] = await K.cast(id);
  const chief = await K.cast("rilla"), g1 = await K.cast("rillaGuard"), g2 = await K.cast("rillaGuard");
  const stand = () => { K.put(C.molandak, 4, 0, 52, 0, 0); K.put(C.moyaki, -8, 0, 56, 0, 0); K.put(C.salmonad, 8, 0, 56, 0, 0); K.put(C.mouch, -3, 3.4, 58, 0, 0); };
  const level = K.level({
    camYaw: 0, camDist: 18, camPitch: 0.45, spawnPoint: { x: 0, y: 0, z: 62 }, checkpoint: { x: 0, z: 62 },
    onUpdate(dt, player) { return player.pos.z < 30 && !this._at ? (this._at = true, [{ signal: "gate" }]) : []; },
    tick(t) { C.mouch.userData.animate?.(t, 1); },
    autoSolve(api) { api.place(0, 28); },
    async script(api) {
      const meet = () => { K.put(C.molandak, 6, 0, -1, 0, -20); K.put(C.moyaki, -9, 0, 1, 0, -20); K.put(C.salmonad, 10, 0, 3, 0, -20); K.put(C.mouch, -3, 3.4, 5, 0, -20); };
      const put = (x, z, lx, lz) => { api.chog.root.position.set(x, 2.36, z); api.chog.root.rotation.y = Math.atan2(lx - x, lz - z); api.chog.root.visible = true; };
      stand(); K.put(chief, 0, 0, -22, 0, 40); K.put(g1, -9, 0, 28, 0, 60); K.put(g2, 9, 0, 28, 0, 60); chief.visible = g1.visible = g2.visible = false;
      await api.title("The First Encounter", "Chapter 6");
      put(0, 62, 0, 20);
      await api.cine([
        { dur: 4.4, cam: [0, 12, 80, 0, 6, 30], to: [0, 9, 70, 0, 6, 30], line: ["Salmonad", "According to my map, the Rilla Clan village is right behind that gate."], start: () => { stand(); put(0, 62, 0, 20); } },
        { dur: 4.2, cam: [9, 5, 56, 0, 4, 40], line: ["Mouch", "Bzzz. Gates mean guards. I say we ask nicely. Loudly. From over here."] },
        { dur: 4.2, cam: [-9, 5, 58, 0, 4, 40], line: ["Moyaki", "Gifts! Everyone loves a pot of stew. Let me do the talking."] },
      ]);
      api.roam({ at: [0, 62], face: [0, 20], obj: "Walk to the Rilla gate" });
      await api.waitFor("gate");
      api.stopRoam(); put(0, 32, 0, 24);
      g1.visible = g2.visible = true; K.put(g1, -12, 0, 21, 0, 40); K.put(g2, 12, 0, 21, 0, 40);
      await api.cine([
        { dur: 3.8, cam: [0, 7, 40, 0, 5, 24], to: [0, 6, 36, 0, 5, 24], line: ["Rilla Guard", "HALT! Outsiders! Nobody enters the village without the chief's word!"], start: () => { g1.visible = g2.visible = true; K.put(g1, -12, 0, 22, 0, 40); K.put(g2, 12, 0, 22, 0, 40); } },
        { dur: 3.4, cam: [-7, 5, 44, -2, 4, 38], line: ["Moyaki", "We brought stew! …No? Fine. Salmonad, tell them about the map."] },
        { dur: 3.6, cam: [7, 5, 44, 2, 4, 38], line: ["Rilla Guard", "No more talking. You're coming with us. The chief will deal with you."] },
        { dur: 3.2, cam: [0, 10, 52, 0, 4, 30], line: ["Mouch", "I can outfly them — wait, no, there's two of them. Nope. Bzzz. We're caught."], start: () => api.shake(0.3) },
      ]);
      // inside, before the chief
      meet(); put(0, 2, 0, -20); K.put(chief, 0, 0, -20, 0, 40); chief.visible = true; K.put(g1, -14, 0, -16, 0, 20); K.put(g2, 14, 0, -16, 0, 20);
      await api.cine([
        { dur: 4.6, cam: [13, 8, 9, 0, 6.5, -20], to: [10, 7.4, 5, 0, 6.5, -20], line: ["Rilla Chief", "Strangers. In my village. You have the smell of the Monorb on you. Speak."], start: () => { meet(); K.put(chief, 0, 0, -20, 0, 40); chief.visible = true; } },
        { dur: 4.4, cam: [12, 5.6, 10, 6, 4.6, -1], line: ["Molandak", "We're hunting Mongrod, the one your clan once mocked. He's coming for the Monorb — and he will destroy everything."] },
        { dur: 4.4, cam: [-14, 9.5, -2, 0, 7.4, -20], to: [-11, 9, -6, 0, 7.4, -20], line: ["Rilla Chief", "That name is a curse in this village. Words are cheap. Strength is not. Show me what your little team is worth."] },
        { dur: 3.4, cam: [-12, 5.4, 11, -3, 4.6, 5], line: ["Mouch", "Oh, a challenge! Finally, my kind of conversation."] },
      ]);
      const res = await api.fight({ stage, dist: 28, opts: { winsToWin: 2, shrink: true }, actors: [
        K.actor("chief", chief, { name: "Rilla Chief", perks: { power: 1.3, weight: 1.7, body: 2.6, slam: { every: 5, wind: 1.0, r: 7.5, k: 1.1, recover: 1.7 } }, ai: { react: 0.5, aggr: 0.9 } }),
        K.actor("mouch", C.mouch, { name: "Mouch", team: "hero", baseY: 2.6, perks: { speed: 1.15, weight: 0.9 }, ai: { react: 0.2 } }),
        K.actor("moyaki", C.moyaki, { name: "Moyaki", team: "hero", perks: { reach: 1.15 }, ai: { react: 0.35 } }),
      ] });
      meet(); K.put(chief, 0, 0, -20, 0, 40); put(0, 2, 0, -20);
      await api.cine([
        { dur: 4, cam: [13, 8, 9, 0, 6.5, -20], line: ["Rilla Chief", res.won ? "Hah! You hit like a charging boulder, little one. And your friends — spice bombs and a flying blade! I like this team." : "You are not strong yet. But you stood back up. That earns my respect."] },
        { dur: 4.4, cam: [16, 5.6, 8, 10, 4.6, 3], line: ["Salmonad", "Chief — where did Mongrod go? My map ends at the edge of the Dark Forests."] },
        { dur: 4.8, cam: [-14, 9.5, -2, 0, 7.4, -20], to: [-11, 9, -6, 0, 7.4, -20], line: ["Rilla Chief", "He is in the Dark Forests. Chasing a crystal that hums like a heartbeat. Go — and strike him down before the orb finds him."] },
        { dur: 3.8, cam: [12, 5.6, 10, 6, 4.6, -1], line: ["Molandak", "We will. Thank you, Chief. Rilla and monanimals, together."] },
      ]);
      api.finish({ badges: ["rilla-respect"], text: "The Rilla chief respects the heroes and points them to the Dark Forests, where Mongrod is chasing a crystal." });
    },
  });
  K.finish();
  return level;
}
