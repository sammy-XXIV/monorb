// Chapter 8 "The Ambush": Future Mongrod, in his most savage cyborg form, ambushes the heroes. A brutal team fight, then the repaired
// time device opens a vortex behind him and Molandak's beam gun blasts him into the rift. The portal seals.
import { THREE, createKit, preload, spawn, drift, N } from "./kit.js";

export const meta = { n: 8, title: "Chapter 8 · The Ambush", card: "cards/ch8.jpg",
  text: "Deep in the Dark Forests, the air crackles. Mongrod has not just built a time machine — he has brought his future self's war with him." };

export async function build({ scene, phys, traits }) {
  await preload(["tree_cone_dark", "tree_oak_dark", "tree_detailed_dark", "rock_largeA", "rock_largeC", "rock_tallA", "log", "grass_large", "mushroom_redGroup", "stone_tallB"].map(k => `${N}${k}.glb`));
  const K = await createKit(scene, phys);
  K.sky(0x241a3c, 0x33264f, 0.0095);
  K.lights({ hemi: [0xb0a0e8, 0x2a1d40, 1.5], sun: { color: 0xb8a8ff, i: 1.6, pos: [-20, 60, 30], range: 55 } });
  K.ground(110, 0x3a3050, 0);
  for (let i = 0; i < 110; i++) { const a = K.rnd() * Math.PI * 2, r = 46 + K.rnd() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const k = ["tree_cone_dark", "tree_oak_dark", "tree_detailed_dark"][i % 3], t = await spawn(`${N}${k}.glb`, { pos: [x, 0, z], rot: K.rnd() * 6.3, tint: 0x8a7ab0 }); K.fit(t, 12 + K.rnd() * 16); K.add(t, { collide: "cyl", shrink: 0.25, merge: true }); }
  for (let i = 0; i < 70; i++) { const a = K.rnd() * Math.PI * 2, r = 8 + K.rnd() * 42, o = await spawn(`${N}${["grass_large", "mushroom_redGroup", "grass_large"][i % 3]}.glb`, { pos: [Math.cos(a) * r, 0, Math.sin(a) * r], rot: K.rnd() * 6, scale: 3 + K.rnd() * 2, shadow: false, tint: 0x9a8ac0 }); K.root.add(o); K.decor.push(o); }
  K.updaters.push(drift(K.root, { count: 240, box: [120, 22, 120], center: [0, 11, 0], color: 0x9a7aff, size: 0.45, speed: 0.6 }).update);
  K.glow(0x7a5aff, 30, 0, 22, -10, 0.12);

  const stage = K.stage({ x: 78, y: 40, z: -24, top: 0x6a6280, rim: 0x3a3450, ring: 0x9a7aff, pillar: { h: 40, color: 0x3a3450 } });   // high above the clearing so cutscene cameras never sit inside it
  const C = {}; for (const id of ["molandak", "moyaki", "salmonad", "mouch"]) C[id] = await K.cast(id);
  const mongrod = await K.cast("cyborg");
  // the force field around him, and the vortex
  const field = new THREE.Mesh(new THREE.SphereGeometry(7.5, 28, 20), new THREE.MeshBasicMaterial({ color: 0x66d8ff, transparent: true, opacity: 0, wireframe: true, depthWrite: false })); K.root.add(field);
  const zaps = new THREE.Group(); K.root.add(zaps); const zapMat = new THREE.LineBasicMaterial({ color: 0xaaf0ff });
  for (let i = 0; i < 6; i++) { const g = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 6 }, (_, k) => new THREE.Vector3(k * 2, 0, 0))); const l = new THREE.Line(g, zapMat); l.visible = false; zaps.add(l); }
  const vortex = new THREE.Group(); vortex.position.set(0, 9, -22);
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 1.6, 0.35, 10, 40), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7a3aff : 0x2a1a5a, transparent: true, opacity: 0.85 })); r.userData.sp = (i + 1) * 0.7 * (i % 2 ? 1 : -1); vortex.add(r); }
  const core = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })); vortex.add(core); vortex.scale.setScalar(0.001); K.root.add(vortex);
  K.updaters.push((t) => { for (const r of vortex.children) if (r.userData.sp) r.rotation.z = t * r.userData.sp; field.rotation.y = t; });
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), new THREE.MeshBasicMaterial({ color: 0xff7ae0 })); bolt.visible = false; K.root.add(bolt);

  const team = () => { K.put(C.molandak, -8, 0, 22, 0, 0); K.put(C.moyaki, 8, 0, 24, 0, 0); K.put(C.salmonad, 2, 0, 28, 0, 0); K.put(C.mouch, -3, 3.4, 20, 0, 0); };
  const level = K.level({
    camYaw: 0, camDist: 20, camPitch: 0.45, spawnPoint: { x: 0, y: 0, z: 30 }, checkpoint: { x: 0, z: 30 },
    tick(t) { C.mouch.userData.animate?.(t, 1);
      if (field.material.opacity > 0) zaps.children.forEach((l, i) => { l.visible = true; const a = t * 5 + i * 1.047, p = l.geometry.attributes.position; for (let k = 0; k < 6; k++) p.setXYZ(k, Math.cos(a) * (k * 1.2 + 1), 1 + Math.sin(a * 2 + k) * 2 + k * 0.4, Math.sin(a) * (k * 1.2 + 1) + (Math.random() - 0.5) * 0.7); p.needsUpdate = true; l.position.copy(mongrod.position); }); else zaps.children.forEach(l => l.visible = false); },
    autoSolve() {},
    async script(api) {
      const put = (x, z, lx, lz) => { api.chog.root.position.set(x, 2.36, z); api.chog.root.rotation.y = Math.atan2(lx - x, lz - z); api.chog.root.visible = true; };
      team(); put(0, 24, 0, 0); K.put(mongrod, 0, 40, -14, 0, 30); await api.title("The Ambush", "Chapter 8");
      await api.cine([
        { dur: 4, cam: [0, 7, 40, 0, 4, 20], to: [0, 6, 36, 0, 4, 20], line: ["Salmonad", "My map ends in this clearing. The wire led right here. Which means…"], start: () => { team(); put(0, 24, 0, 0); K.put(mongrod, 0, 40, -14, 0, 30); } },
        { dur: 3.2, cam: [-6, 6, 30, 0, 12, -8], line: ["Mouch", "Bzzz. Something's… coming down. Fast."], tick: u => { mongrod.position.y = 40 * (1 - u * u); } },
        { dur: 3.6, cam: [8, 7, 8, 0, 6, -14], line: null, start: () => { api.shake(1.2); api.sfx("roar"); mongrod.position.y = 0; }, tick: u => { field.position.set(mongrod.position.x, 6, mongrod.position.z); } },
        { dur: 4.4, cam: [0, 8, 10, 0, 7, -14], to: [0, 7.5, 6, 0, 7, -14], line: ["Future Mongrod", "Hello, little heroes. I've waited so long to see you again. To end you for the first time."], start: () => { field.material.opacity = 0.45; } },
        { dur: 4.2, cam: [-10, 5.4, 26, -6, 4.2, 22], line: ["Molandak", "That's him. The version that burned everything. Everyone — hit him with everything you have!"] },
      ]);
      field.material.opacity = 0;
      // three waves of his cyborg drones drop first; the heroes fight beside you, then the boss himself
      const heroes = () => [
        K.actor("mouch", C.mouch, { name: "Mouch", team: "hero", baseY: 2.6, perks: { speed: 1.15, weight: 0.9 }, ai: { react: 0.2 } }),
        K.actor("moyaki", C.moyaki, { name: "Moyaki", team: "hero", perks: { reach: 1.15 }, ai: { react: 0.35 } }),
        K.actor("salmonad", C.salmonad, { name: "Salmonad", team: "hero", perks: { weight: 1.2 }, ai: { react: 0.4 } })];
      const drone = async (k, o) => { const m = await K.cast("cyborg"); m.scale.multiplyScalar(k); m.visible = false; return { m, o }; };
      const wave = async (title, line, specs) => {
        const foes = []; for (let i = 0; i < specs.length; i++) foes.push(await drone(specs[i].k, specs[i]));
        await api.say([line]); api.toast(title, 2600); foes.forEach(f => f.m.visible = true);
        const r = await api.fight({ stage, dist: 30, opts: { winsToWin: 1, shrink: false }, actors: [...foes.map((f, i) => K.actor("drone" + i, f.m, { name: f.o.name || "Drone", perks: f.o.perks, ai: f.o.ai })), ...heroes()] });
        foes.forEach(f => { f.m.visible = false; }); return r;
      };
      const scout = { k: 0.42, name: "Drone", perks: { body: 1.5, weight: 0.9 }, ai: { react: 0.5, aggr: 0.8 } };
      await wave("Wave 1 of 3 · Drone scouts", ["Molandak", "His drones — they drop from the canopy! Knock them off the platform!"], [scout, scout]);
      await wave("Wave 2 of 3 · Shock troops", ["Salmonad", "More! Faster ones this time — and they hit harder. Use your skill, Chog!"], [{ ...scout, perks: { body: 1.5, speed: 1.15, power: 1.15 }, ai: { react: 0.38, aggr: 0.9 } }, { ...scout, perks: { body: 1.5, speed: 1.15, power: 1.15 }, ai: { react: 0.38, aggr: 0.9 } }, scout]);
      await wave("Wave 3 of 3 · The bruiser", ["Moyaki", "That big one slams the ground. Watch for the red ring — jump it, then hit him while he recovers!"], [{ k: 0.7, name: "Bruiser", perks: { body: 2.2, power: 1.25, weight: 1.6, slam: { every: 5, wind: 1.0, r: 6.5, k: 1, recover: 1.6 } }, ai: { react: 0.45, aggr: 0.9 } }, scout, scout]);
      const res = await api.fight({ stage, dist: 30, opts: { winsToWin: 2, shrink: true }, actors: [
        K.actor("mongrod", mongrod, { name: "Future Mongrod", perks: { power: 1.45, weight: 2.1, body: 2.8, slam: { every: 4.5, wind: 0.9, r: 8, k: 1.2, recover: 1.4 } }, ai: { react: 0.42, aggr: 0.95 } }),
        K.actor("mouch", C.mouch, { name: "Mouch", team: "hero", baseY: 2.6, perks: { speed: 1.15, weight: 0.9 }, ai: { react: 0.2 } }),
        K.actor("moyaki", C.moyaki, { name: "Moyaki", team: "hero", perks: { reach: 1.15 }, ai: { react: 0.35 } }),
        K.actor("salmonad", C.salmonad, { name: "Salmonad", team: "hero", perks: { weight: 1.2 }, ai: { react: 0.4 } }),
      ] });
      team(); put(0, 24, 0, 0); K.put(mongrod, 0, 0, -8, 0, 30);
      await api.cine([
        { dur: 4, cam: [0, 9, 6, 0, 7, -8], line: ["Future Mongrod", res.won ? "Impressive. But electricity doesn't tire. Neither do I." : "You can't hurt what's already broken. But go on, keep trying."], start: () => { field.position.set(0, 6, -8); field.material.opacity = 0.55; api.shake(0.5); } },
        { dur: 4.2, cam: [-6, 5, 28, 2, 4, 28], line: ["Salmonad", "Force fields up — I can't get through! …The time device! I patched it on the road. It'll open a vortex!"] },
        { dur: 4.2, cam: [4, 7, 20, 0, 7, -8], line: ["Molandak", "Open it behind him! I'll push him through with my beam gun. Everyone — hold him in place!"] },
        { dur: 3.8, cam: [0, 10, 12, 0, 9, -22], to: [0, 10, 4, 0, 9, -22], line: ["Salmonad", "Vortex opening… NOW!"], start: () => api.shake(0.9), tick: u => vortex.scale.setScalar(Math.max(0.001, u * 2.6)) },
        { dur: 3.4, cam: [-10, 5, 24, -3, 4.2, 22], line: ["Molandak", "This is for the Elder Tree. …FIRE!"], start: () => { bolt.visible = true; api.sfx("roar"); }, tick: u => { const a = new THREE.Vector3(-3, 4.2, 22), b = new THREE.Vector3(0, 6, -8); bolt.position.copy(a).lerp(b, 0.5); bolt.scale.set(1, a.distanceTo(b), 1); bolt.lookAt(b); bolt.rotateX(Math.PI / 2); bolt.scale.x = bolt.scale.z = 1 - u * 0.7; } },
        { dur: 4.2, cam: [4, 8, 6, 0, 8, -16], line: ["Future Mongrod", "NO! The Monorb is MINE! I'll tear this whole timeline apart—!"], start: () => { bolt.visible = false; field.material.opacity = 0; api.shake(1.2); },
          tick: u => { mongrod.position.z = -8 - u * 14; mongrod.position.y = u * 8; const s = Math.max(0.05, 1 - u * 0.93); mongrod.scale.setScalar(s); } },
        { dur: 3.2, cam: [0, 9, 10, 0, 9, -22], line: null, tick: u => { vortex.scale.setScalar(Math.max(0.001, 2.6 * (1 - u))); } },
      ]);
      mongrod.visible = false; vortex.visible = false;
      await api.cine([
        { dur: 4.2, cam: [-8, 5.4, 26, -2, 4.2, 22], line: ["Moyaki", "…Did we just throw a monster into a hole in time?"] },
        { dur: 4.4, cam: [8, 5.6, 28, 2, 4.2, 24], line: ["Molandak", "The portal's sealed. Future Mongrod is trapped in the time prison. But the younger one is still out there — and he's still after the Monorb."] },
      ]);
      api.finish({ badges: ["ambush-survived"], text: "Future Mongrod is trapped in the rift and the portal seals. The younger Mongrod is still out there, closing in on the Monorb." });
    },
  });
  K.finish();
  return level;
}
