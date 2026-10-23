// Chapter 9 "Guardians in the Cave": the heroes sneak through the Monorb's cave past giant stone guardians (visor / glass / laser eyes see their
// vision cones; Skull / Radioactive / 1:1 Chogs find a hidden passage). They arrive just too late: Young Mongrod has taken the glowing orb
// and its power has healed and strengthened him. The remaining guardians awaken; the heroes fight them.
import { THREE, createKit, preload, spawn, drift, outline, N, G } from "./kit.js";
import { buildGuardian } from "./kit.js";

export const meta = { n: 9, title: "Chapter 9 · Guardians in the Cave", card: "cards/ch9.jpg",
  text: "The Monorb lies deep inside an ancient cave, watched by giant stone guardians that never sleep. Mongrod is somewhere ahead of you." };

export async function build({ scene, phys, traits, rules }) {
  await preload([`${N}rock_largeA.glb`, `${N}rock_tallA.glb`, `${N}stone_tallB.glb`, `${N}rock_largeC.glb`]);
  const K = await createKit(scene, phys);
  K.sky(0x120a1e, 0x1e1230, 0.0105);
  K.lights({ hemi: [0xa890ff, 0x2a1a44, 1.7], sun: { color: 0xb8a0ff, i: 1.2, pos: [10, 70, 30], range: 70 } });
  const floorTex = 0x3c3050;
  K.box(0, -0.5, 0, 40, 1, 184, floorTex); K.box(-16.8, 15, 0, 1.6, 30, 184, 0x2a2040); K.box(16.8, 15, 0, 1.6, 30, 184, 0x2a2040); K.box(0, 15, 93, 40, 30, 1.6, 0x2a2040);   // back wall well behind the spawn camera
   K.box(0, 15, -91, 40, 30, 1.6, 0x2a2040);
  // glowing crystal clusters along the walls
  const crystal = (x, z, h, c = 0xa070ff) => { for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.2, h - i * 1.4, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, roughness: 0.3 })); m.position.set(x + (i - 1) * 0.9, (h - i * 1.4) / 2, z + (i % 2 ? 0.6 : -0.4)); m.rotation.z = (i - 1) * 0.25; m.castShadow = true; K.root.add(m); outline(m); K.parts.push(m); } K.glow(c, 7, x, h * 0.55, z, 0.4); };
  for (let z = 60; z > -86; z -= 14) { crystal(-15, z, 5 + K.rnd() * 3); crystal(15, z - 6, 4 + K.rnd() * 4, K.rnd() > 0.5 ? 0xa070ff : 0x70a0ff); }
  for (let i = 0; i < 24; i++) { const x = (K.rnd() < 0.5 ? -1 : 1) * (11 + K.rnd() * 3.5), z = 62 - K.rnd() * 150; const r = await spawn(`${N}rock_largeC.glb`, { pos: [x, 0, z], rot: K.rnd() * 6, tint: 0x6a5a8a }); K.fit(r, 2.4 + K.rnd() * 2.2); K.add(r, { collide: "box", shrink: 0.7, merge: true }); }
  K.updaters.push(drift(K.root, { count: 200, box: [32, 18, 150], center: [0, 9, -10], color: 0xb090ff, size: 0.4, speed: 0.4 }).update);

  // the hidden passage: a crystal-sealed door in the left wall for most Chogs, an open glowing archway for secret ones
  const secret = !!rules.secret;
  const doorLight = K.glow(secret ? 0x66ffd0 : 0x6a5a8a, 8, -16, 4, 26, secret ? 0.7 : 0.15);
  if (!secret) crystal(-15.4, 26, 7, 0x6a5a8a), phys.box(-15.2, 4, 26, 1, 4, 2.2); else { const r = K.text("✦ ✦ ✦", "#66ffd0", 4, 1); r.position.set(-15.9, 6.5, 26); r.rotation.y = Math.PI / 2; K.root.add(r); }
  K.box(-27, -0.5, -4, 18, 1, 66, floorTex); K.box(-35.8, 8, -4, 1.4, 16, 66, 0x2a2040); K.box(-17, 8, -4, 1.2, 16, 66, 0x2a2040, { collide: false }).visible = false;
  K.box(-27, 14.5, -4, 18, 1, 66, 0x2a2040, { collide: false });
  for (const z of [30, 22]) K.box(-17.2, 8, z, 1.4, 16, 6.4, 0x2a2040);   // (the wall segments around the door opening)
  K.box(-16.5, 8, 14, 1.4, 16, 14, 0x2a2040, { collide: false }).visible = false;
  K.box(-27, 8, 33, 18, 16, 1.2, 0x2a2040); K.box(-27, 8, -37, 18, 16, 1.2, 0x2a2040);
  K.box(-17, 4, -34, 1, 8, 8, 0x000000, { collide: false }).visible = false;   // exit gap back into the hall at z = -34
  K.glow(0x66ffd0, 9, -27, 6, -34, secret ? 0.5 : 0.0);

  // the guardians: huge stone sentries on patrol across the hall
  const defs = [[[-12, 40], [12, 40]], [[12, 14], [-12, 14]], [[-12, -12], [12, -12]], [[12, -38], [-12, -38]]].map(path => ({ path, speed: 2.6, range: 16, angle: 0.5, turn: 0.35, pause: 0.9 }));
  const S = K.stealth(defs, traits, () => { const g = buildGuardian(); K.fit(g, 10); const w = new THREE.Group(); w.add(g); return w; });
  S.guards.forEach((g, i) => { g.wait = i * 0.7; });

  // altar, orb, chamber
  K.cyl(0, 0.5, -78, 11, 1, 0x4a3f66, { outlined: true }); K.cyl(0, 2.4, -80, 2.6, 3.2, 0x5a4f7a, { outlined: true });
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 2), new THREE.MeshStandardMaterial({ color: 0xb070ff, emissive: 0xa050ff, emissiveIntensity: 2, roughness: 0.2 })); orb.position.set(0, 7, -80); K.root.add(orb);
  const orbGlow = K.glow(0xc080ff, 16, 0, 7, -80, 0.8); const orbLight = new THREE.PointLight(0xa070ff, 120, 60); orbLight.position.copy(orb.position); K.root.add(orbLight);
  K.updaters.push(t => { orb.rotation.y = t; orb.position.y += (orb.userData.hold ? 0 : (7 + Math.sin(t * 1.6) * 0.5) - orb.position.y) * 0.1; orbGlow.position.copy(orb.position); orbLight.position.copy(orb.position); orbLight.intensity = 110 + Math.sin(t * 5) * 20; });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(7, 22, 16), new THREE.MeshBasicMaterial({ color: 0xc080ff, transparent: true, opacity: 0, depthWrite: false })); K.root.add(aura);

  const stage = K.stage({ x: 78, y: 44, z: -20, top: 0x5a4f7a, rim: 0x2a2040, ring: 0xa070ff, pillar: { h: 44, color: 0x2a2040 } });
  const C = {}; for (const id of ["molandak", "moyaki", "salmonad", "mouch"]) C[id] = await K.cast(id);
  const mongrod = await K.cast("mongrod"), gA = await K.cast("guardian"), gB = await K.cast("guardian"); gA.visible = gB.visible = false;
  K.updaters.push(() => { aura.position.set(mongrod.position.x, 4.5, mongrod.position.z); });
  const team = (z = 60) => { K.put(C.molandak, 5, 0, z + 4, 0, -80); K.put(C.moyaki, -5, 0, z + 6, 0, -80); K.put(C.salmonad, 5, 0, z + 9, 0, -80); K.put(C.mouch, -3, 3.4, z + 11, 0, -80); };

  let spotted = 0, reached = false, passed = 0;
  const level = K.level({
    camYaw: 0, camDist: 17, camPitch: 0.45, spawnPoint: { x: 0, y: 0, z: 62 }, checkpoint: { x: 0, z: 62 },
    onUpdate(dt, player, feetY) {
      const ev = []; if (reached) return ev;
      const pz = player.pos.z, sp = Math.hypot(player.vel.x, player.vel.z), px = player.pos.x;
      const inTunnel = px < -18;   // the hidden passage: no guards see in there
      if (!inTunnel && S.update(dt, px, pz, feetY, { run: sp > 10.5, still: sp < 1.2 })) { spotted++; ev.push({ respawn: "A guardian saw you! Back to the cave mouth." }); }
      else if (inTunnel) S.update(dt, 999, 999, 99, {});
      if (pz < -62) { reached = true; ev.push({ signal: "reached" }); }
      return ev;
    },
    tick(t, dt) { C.mouch.userData.animate?.(t, 1); if (!this.active) S.update(dt, 999, 999, 99, {}); },
    autoSolve(api) { api.place(0, -64); },
    async script(api) {
      const put = (x, z, lx, lz) => { api.chog.root.position.set(x, 2.36, z); api.chog.root.rotation.y = Math.atan2(lx - x, lz - z); api.chog.root.visible = true; };
      team(); put(0, 62, 0, -80); K.put(mongrod, 0, 0, -72, 0, 60); await api.title("Guardians in the Cave", "Chapter 9");
      await api.cine([
        { dur: 4.6, cam: [0, 12, 78, 0, 6, 20], to: [0, 9, 70, 0, 6, 10], line: ["Salmonad", "The cave of the Monorb. My map shows one way in… and four stone guardians that never sleep."], start: () => { team(); put(0, 62, 0, -80); K.put(mongrod, 0, 0, -72, 0, 60); } },
        { dur: 4.2, cam: [6, 5, 66, 0, 5, 40], line: ["Moyaki", "Please tell me stone guardians move slowly. Please. I have stew to protect."] },
        { dur: 4.6, cam: [-8, 6, 70, 0, 5, 30], line: ["Molandak", "They're slow, but they see far. Walk — don't run — and keep behind them. Mongrod's already ahead of us."] },
      ]);
      api.roam({ at: [0, 62], face: [0, -80], obj: S.showCones ? "Sneak past the guardians — your eyes show their vision cones" : "Sneak past the stone guardians — don't run, watch the orange rings" });
      api.toast(secret ? "A hidden passage glows in the left wall…" : S.showCones ? "Your visor shows the guardians' vision cones" : "Orange rings warn when a guardian is close. Walking is quieter than running", 5200);
      await api.waitFor("reached"); api.stopRoam();
      team(-18); put(0, -58, 0, -80);
      await api.cine([
        { dur: 4.6, cam: [-16, 11, -52, 0, 7, -80], to: [-12, 10, -58, 0, 7, -80], line: ["Molandak", "The altar. The orb… it's gone from its stone. We're too late."], start: () => { team(-18); put(0, -58, 0, -80); K.put(mongrod, 0, 0, -72, 0, 60); orb.userData.hold = false; } },
        { dur: 4.6, cam: [10, 8, -60, 0, 7, -78], to: [7, 7.5, -64, 0, 7, -78], line: ["Young Mongrod", "At last. Ancient, indestructible — and mine."], start: () => { orb.userData.hold = true; } , tick: u => { orb.position.lerp(new THREE.Vector3(mongrod.position.x, 8.5, mongrod.position.z + 2), u * 0.12); } },
        { dur: 4.4, cam: [0, 8, -64, 0, 6, -74], line: ["Young Mongrod", "The wounds… they're closing. The guardians' scars. Everything the clan did to me. Gone. I feel… STRONG."], start: () => { aura.material.opacity = 0.35; api.shake(0.9); } },
        { dur: 4.2, cam: [-9, 5.4, -50, -3, 4.4, -58], line: ["Mouch", "Bzzz. That doesn't look like healing. That looks like the thing eating him."], start: () => { aura.material.opacity = 0.18; } },
        { dur: 4.6, cam: [6, 10, -66, 0, 9, -86], to: [3, 9, -70, 0, 9, -86], line: ["Young Mongrod", "Now. Nobody laughs at me again. Guardians — destroy them!"], start: () => { gA.visible = gB.visible = true; K.put(gA, -10, 0, -66, 0, -52); K.put(gB, 10, 0, -66, 0, -52); api.shake(1.0); api.sfx("roar"); } },
        { dur: 3.4, cam: [0, 14, -80, 0, 9, -70], line: null, start: () => { orb.userData.hold = true; }, tick: u => { mongrod.position.y = u * 5; mongrod.scale.setScalar(1 - u * 0.9); } },
      ]);
      mongrod.visible = false; aura.visible = false; orb.visible = false; orbGlow.visible = false; orbLight.intensity = 0;
      const res = await api.fight({ stage, dist: 30, opts: { winsToWin: 1, shrink: false }, actors: [
        K.actor("g1", gA, { name: "Guardian", perks: { power: 1.15, weight: 2.1, body: 2.8, slam: { every: 6, wind: 1.1, r: 6.5, k: 1.1, recover: 1.6 } }, ai: { react: 0.65, aggr: 0.9 } }),
        K.actor("g2", gB, { name: "Guardian", perks: { power: 1.15, weight: 2.1, body: 2.8, slam: { every: 6, wind: 1.1, r: 6.5, k: 1.1, recover: 1.6 } }, ai: { react: 0.65, aggr: 0.9 } }),
        K.actor("mouch", C.mouch, { name: "Mouch", team: "hero", baseY: 2.6, perks: { speed: 1.15, weight: 0.9 }, ai: { react: 0.2 } }),
        K.actor("moyaki", C.moyaki, { name: "Moyaki", team: "hero", perks: { reach: 1.15 }, ai: { react: 0.35 } }),
        K.actor("salmonad", C.salmonad, { name: "Salmonad", team: "hero", perks: { weight: 1.2 }, ai: { react: 0.4 } }),
      ] });
      gA.visible = gB.visible = false; team(-18); put(0, -58, 0, -80);
      await api.cine([
        { dur: 4.4, cam: [-14, 9, -52, 0, 5, -72], line: ["Salmonad", res.won ? "That's the last of them. They crumble like old pottery." : "They finally fell… somehow."], start: () => { for (const g of [gA, gB]) g.visible = false; } },
        { dur: 4.6, cam: [10, 8, -54, 0, 6, -78], line: ["Molandak", "Mongrod took the orb. And it's changing him — I've seen what that power does. This is no longer a chase."] },
        { dur: 4.4, cam: [-6, 6, -56, -3, 4.4, -62], line: ["Moyaki", "Then we stop him. Together. And then I'm making a very big stew."] },
      ]);
      api.finish({ badges: ["guardians-fell", ...(spotted === 0 ? ["unseen"] : [])], text: `Young Mongrod has the Monorb and its power. The guardians have fallen, and the final confrontation is next.${spotted === 0 ? " You were never spotted." : ""}` });
    },
  });
  K.finish();
  return level;
}
