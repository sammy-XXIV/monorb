// Chapter 7 "The Trap": the heroes follow Salmonad's map through the thick jungle (free-roam: find three trail markers), skylines appear in the
// distance, and a rigged net snaps shut. Cut the ropes with a button-mash. Skull / Radioactive / 1:1 Chogs get a secret scene.
import { THREE, createKit, preload, spawn, drift, N } from "./kit.js";

export const meta = { n: 7, title: "Chapter 7 · The Trap", card: "cards/ch7.jpg",
  text: "Salmonad's map leads through the thickest part of the jungle. There are signs of civilization ahead — and signs that someone has been here before you." };

const MARKS = [[6.7, 44], [4.9, 6], [-12.5, -34]];   // all on the winding trail: x = sin(z*0.06)*14

export async function build({ scene, phys, traits, rules }) {
  await preload(["tree_fat", "tree_detailed", "tree_oak", "tree_palmTall", "tree_palmBend", "plant_bushLarge", "plant_bushDetailed", "grass_large", "plant_flatTall", "mushroom_redGroup", "mushroom_tanTall", "rock_largeA", "log", "flower_purpleA"].map(k => `${N}${k}.glb`));
  const K = await createKit(scene, phys);
  K.sky(0x6fa08a, 0x88b49a, 0.0105);
  K.lights({ hemi: [0xd8f0d0, 0x2a4a30, 1.55], sun: { color: 0xfff0c0, i: 2.0, pos: [20, 70, 10], range: 55 } });
  K.ground(130, 0x356a2c, 0);

  // dense jungle with a winding clear trail (z from +75 to -75); tree positions avoid the trail
  const trail = z => Math.sin(z * 0.06) * 14;
  for (let i = 0; i < 190; i++) {
    const z = 90 - K.rnd() * 190, x = (K.rnd() - 0.5) * 220; if (Math.abs(x - trail(z)) < 12) continue;
    const k = ["tree_fat", "tree_detailed", "tree_oak", "tree_palmTall", "tree_palmBend"][i % 5], t = await spawn(`${N}${k}.glb`, { pos: [x, 0, z], rot: K.rnd() * 6.3 }); K.fit(t, 14 + K.rnd() * 14); K.add(t, { collide: "cyl", shrink: 0.22, merge: true });
  }
  for (let i = 0; i < 260; i++) { const z = 90 - K.rnd() * 190, x = (K.rnd() - 0.5) * 220; if (Math.abs(x - trail(z)) < 4) continue;
    const k = ["plant_bushLarge", "grass_large", "plant_flatTall", "mushroom_redGroup", "flower_purpleA", "plant_bushDetailed"][i % 6], o = await spawn(`${N}${k}.glb`, { pos: [x, 0, z], rot: K.rnd() * 6, scale: 4 + K.rnd() * 3, shadow: false }); K.root.add(o); K.decor.push(o); }
  K.updaters.push(drift(K.root, { count: 240, box: [60, 18, 160], center: [0, 8, 0], color: 0xd8ffb0, size: 0.4, speed: 0.5 }).update);
  K.box(0, 20, 100, 230, 40, 1, 0x000000, { collide: true }).visible = false; K.box(0, 20, -92, 230, 40, 1, 0x000000).visible = false; K.box(-112, 20, 0, 1, 40, 230, 0x000000).visible = false; K.box(112, 20, 0, 1, 40, 230, 0x000000).visible = false;
  // faint skyline far ahead: dark towers in the haze, lights blinking
  const sky = new THREE.Group(); K.root.add(sky); const bm = new THREE.MeshBasicMaterial({ color: 0x4a6a78, fog: true });
  for (let i = 0; i < 22; i++) { const h = 24 + K.rnd() * 60, m = new THREE.Mesh(new THREE.BoxGeometry(5 + K.rnd() * 6, h, 5 + K.rnd() * 6), bm); m.position.set(-70 + i * 6.5, h / 2, -150 - K.rnd() * 18); sky.add(m); }
  const blink = []; for (let i = 0; i < 6; i++) { const g = K.glow(0xff5a4a, 3, -60 + i * 22, 50 + K.rnd() * 20, -146, 0.8); blink.push(g); }
  K.updaters.push(t => blink.forEach((g, i) => g.material.opacity = 0.35 + 0.55 * Math.max(0, Math.sin(t * 1.6 + i * 1.9))));

  // trail markers: floating map scrolls (find all three to follow Salmonad's route)
  const got = [false, false, false], marks = MARKS.map(([x, z], i) => { const g = new THREE.Group(); g.position.set(x, 3, z);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.2, 12), new THREE.MeshLambertMaterial({ color: 0xf0dcae })); roll.rotation.z = Math.PI / 2; g.add(roll);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 16), new THREE.MeshLambertMaterial({ color: 0xc0392b })); band.rotation.y = Math.PI / 2; g.add(band);
    const gl = K.glow(0xfff2b0, 5, 0, 0, 0, 0.7); g.add(gl); K.root.add(g); return g; });

  // hazards on the trail: swinging logs (time them or jump), thorn patches (steer round or jump), Mongrod's tripwires (spin to cut them)
  const hz = { on: false, branch: false }, tc = z => Math.sin(z * 0.06) * 14, mat = c => new THREE.MeshLambertMaterial({ color: c }), glowMat = c => new THREE.MeshBasicMaterial({ color: c });
  const logs = [30, -8, -22].map((z, i) => { const g = new THREE.Group(), lg = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 12), mat(0x6a4a2a)); lg.rotation.x = Math.PI / 2; lg.position.y = 1.7; g.add(lg);
    for (const dz of [-1.2, 1.2]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 13, 6), mat(0x3a2a1a)); r.position.set(0, 8.2, dz); g.add(r); }
    g.position.set(tc(z), 0, z); g.userData = { z, cx: tc(z), ph: i * 1.7, x: 0 }; K.root.add(g); return g; });
  const thorns = [[36, 3.5], [14, -3.5], [-14, 3]].map(([z, off]) => { const g = new THREE.Group(); for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.4 + K.rnd() * 0.25, 1.3 + K.rnd() * 0.8, 6), mat(i % 3 ? 0xb03a8a : 0x7a2a6a)); c.position.set((K.rnd() - 0.5) * 6.4, 0.7, (K.rnd() - 0.5) * 3); g.add(c); }
    g.add(K.glow(0xff4aa0, 5, 0, 0.6, 0, 0.35)); g.position.set(tc(z) + off, 0, z); g.userData = { x: tc(z) + off, z }; K.root.add(g); return g; });
  const wires = [-12, -17, -28].map(z => { const g = new THREE.Group(), cx = tc(z), line = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.1, 0.1), glowMat(0x66e8ff)); line.position.set(cx, 0.9, z); g.add(line);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.2, 8), mat(0x4a5a64)); post.position.set(cx + s * 7.9, 1.1, z); g.add(post); }
    g.userData = { z, cx, line, live: true }; K.root.add(g); return g; });
  // falling branches (the escape): a red ring on the ground, then the branch drops
  const branches = Array.from({ length: 5 }, () => { const g = new THREE.Group(), ring = new THREE.Mesh(new THREE.CircleGeometry(3.2, 28), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })), lg = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 7, 10), mat(0x5a3a22));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; lg.rotation.z = Math.PI / 2; lg.position.y = 30; g.add(ring, lg); g.visible = false; g.userData = { t: -1, ring, lg, x: 0, z: 0 }; K.root.add(g); return g; });
  let nextBranch = 0, branchAt = 0;
  const exitBeacon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 40, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); exitBeacon.position.set(tc(-72), 20, -72); exitBeacon.visible = false; K.root.add(exitBeacon);

  // the trap: a rope net hanging from a branch above the last marker area
  const net = new THREE.Group(); net.position.set(-8, 50, -50); K.root.add(net);
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(8, 2)), new THREE.LineBasicMaterial({ color: 0x8a6a3a })); wire.scale.set(1, 0.8, 1); net.add(wire);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 40, 8), new THREE.MeshLambertMaterial({ color: 0x6a4a2a })); rope.position.y = 28; net.add(rope);
  const sparks = drift(K.root, { count: 60, box: [14, 12, 14], center: [-8, 4, -50], color: 0x7aeaff, size: 0.6, speed: 5 }); K.updaters.push(t => { sparks.pts.visible = net.userData.live; sparks.update(t); });
  const C = {}; for (const id of ["molandak", "moyaki", "salmonad", "mouch"]) C[id] = await K.cast(id);
  const follow = () => { const x = -4.6; K.put(C.molandak, x + 5, 0, 63, 0, -80); K.put(C.moyaki, x - 5, 0, 65, 0, -80); K.put(C.salmonad, x + 5, 0, 68, 0, -80); K.put(C.mouch, x - 3, 3.2, 70, 0, -80); };

  let count = 0, sprung = false;
  const level = K.level({
    camYaw: 0, camDist: 17, camPitch: 0.45, spawnPoint: { x: -4.6, y: 0, z: 58 }, checkpoint: { x: -4.6, z: 58 },
    onUpdate(dt, player) { const ev = [];
      marks.forEach((m, i) => { if (got[i]) return; if (Math.hypot(m.position.x - player.pos.x, m.position.z - player.pos.z) < 3.2) { got[i] = true; count++; K.root.remove(m); ev.push({ fx: { sfx: "shard", at: m.position, color: 0xfff2b0 } }, { signal: "mark" + i }); } });
      if (hz.on) { const f = player.feet(), px = player.pos.x, pz = player.pos.z;
        for (const g of logs) if (Math.abs(pz - g.userData.z) < 1.9 && Math.abs(px - g.position.x) < 1.6 && f < 2.2) ev.push({ hurt: { x: g.position.x, z: g.userData.z, power: 20 } });
        for (const g of thorns) if (Math.abs(px - g.userData.x) < 3.4 && Math.abs(pz - g.userData.z) < 1.8 && f < 1.2) ev.push({ hurt: { x: g.userData.x, z: g.userData.z + (pz > g.userData.z ? -1 : 1), power: 18 } });
        for (const g of wires) { const u = g.userData; if (!u.live) continue; if (Math.abs(pz - u.z) < 3.4 && Math.abs(px - u.cx) < 8 && f < 1.6 && player.spin > 0) { u.live = false; u.line.material = glowMat(0x556066); ev.push({ fx: { sfx: "shard", at: { x: px, y: 1, z: u.z }, color: 0x66e8ff } }); }
          else if (Math.abs(pz - u.z) < 0.7 && Math.abs(px - u.cx) < 8 && f < 1.4) ev.push({ hurt: { x: px, z: u.z + (pz > u.z ? -1 : 1), power: 18 } }); }
        if (pz < 36 && !hz.h1) { hz.h1 = 1; ev.push({ signal: "h_thorn" }); } if (pz < 31 && !hz.h2) { hz.h2 = 1; ev.push({ signal: "h_log" }); } if (pz < -8 && !hz.h3) { hz.h3 = 1; ev.push({ signal: "h_wire" }); } }
      if (hz.branch) { const f = player.feet(), px = player.pos.x, pz = player.pos.z;
        for (const g of branches) { const u = g.userData; if (u.t >= 0 && u.t < 0.95 && Math.hypot(px - u.x, pz - u.z) < 3.4 && f < 1.5 && u.t > 0.85) { u.t = 1; ev.push({ hurt: { x: u.x, z: u.z, power: 22 } }); } } }
      return ev; },
    tick(t) { const dtt = Math.min(0.1, t - (hz.lt ?? t)); hz.lt = t;
      for (const g of logs) { g.position.x = g.userData.cx + Math.sin(t * 1.7 + g.userData.ph) * 7.2; g.children[0].rotation.y = t * 2; g.children.slice(1).forEach(r => { r.position.x = 0; r.rotation.z = -(g.position.x - g.userData.cx) / 13 * 0.3; }); }
      for (const g of wires) if (g.userData.live) g.userData.line.material.color.setHex(Math.sin(t * 20) > 0 ? 0x66e8ff : 0xb8f4ff);
      if (hz.branch && this._follow) { const p = this._follow; if (t > branchAt) { branchAt = t + 1.5; const g = branches[nextBranch++ % branches.length], u = g.userData; u.x = p.x + (Math.random() - 0.5) * 3; u.z = p.z - 3 - Math.random() * 6; u.t = 0; g.position.set(u.x, 0, u.z); g.visible = true; } }
      for (const g of branches) { const u = g.userData; if (u.t < 0) continue; u.t += dtt / 1.1; if (u.t < 0.85) { u.ring.material.opacity = 0.2 + 0.4 * u.t + 0.15 * Math.sin(t * 30); u.lg.position.y = 30; } else if (u.t < 1.05) { u.lg.position.y = 30 * Math.max(0, 1 - (u.t - 0.85) / 0.1); u.ring.material.opacity = 0.5; } else { u.t = -1; g.visible = false; u.ring.material.opacity = 0; } } C.mouch.userData.animate?.(t, 1); marks.forEach((m, i) => { m.rotation.y = t * 1.6; m.position.y = 3 + Math.sin(t * 2 + i) * 0.3; });
      // the team trails the Chog along the path while exploring
      if (this._follow) { const p = this._follow; [[C.molandak, 5, 5], [C.moyaki, -5, 7], [C.salmonad, 5, 10], [C.mouch, -3, 12]].forEach(([o, dx, dz], i) => { const tx = p.x + dx, tz = p.z + dz; o.position.x += (tx - o.position.x) * 0.04; o.position.z += (tz - o.position.z) * 0.04; K.face(o, p.x, p.z - 10); }); } },
    async autoSolve(api) { for (let i = 0; i < MARKS.length; i++) { api.place(MARKS[i][0], MARKS[i][1]); while (!got[i]) await new Promise(r => setTimeout(r, 100)); } },
    async script(api) {
      const put = (x, z, lx, lz) => { api.chog.root.position.set(x, 2.36, z); api.chog.root.rotation.y = Math.atan2(lx - x, lz - z); api.chog.root.visible = true; };
      follow(); put(-4.6, 58, 0.0, 0); await api.title("The Trap", "Chapter 7");
      await api.cine([
        { dur: 4.4, cam: [-8, 24, 80, -8, 4, 30], to: [-8, 16, 72, -8, 6, 20], line: ["Salmonad", "Right. Thick jungle ahead. My map marks three trail posts — we follow them to Mongrod's trail."], start: () => { follow(); put(-4.6, 58, 0.0, 0); } },
        { dur: 4.2, cam: [-2, 6, 62, -10, 4, 50], line: ["Moyaki", "Anyone else feel like we're being watched? The trees are a little… too quiet."] },
        { dur: 3.6, cam: [-8, 9, 66, -8, 5, 40], line: ["Mouch", "Bzzz. I'll scout. Go on, Chog — lead the way!"] },
      ]);
      level._follow = api.player.pos; api.roam({ at: [-4.6, 58], face: [0.0, 0], obj: "Follow the trail: find the map posts", pips: [0, 3] });
      hz.on = !api.auto; level._hz = hz;
      api.waitFor("h_thorn").then(() => api.toast("Thorn patches ahead — steer round them or jump!", 3600));
      api.waitFor("h_log").then(() => api.toast("Swinging logs! Time it, or jump over", 3600));
      api.waitFor("h_wire").then(() => api.toast("Cyborg tripwires — SPIN to cut them", 4200));
      const wait = i => api.waitFor("mark" + i).then(() => { api.pips(i + 1, 3); level.checkpoint = { x: MARKS[i][0], z: MARKS[i][1] }; api.toast(`Trail post ${i + 1} of 3 (checkpoint)`, 1800); });
      await wait(0); await wait(1);
      api.toast("A skyline… glimmering through the haze. Mongrod's lair?", 4200); await wait(2);
      level._follow = null; hz.on = false; api.stopRoam();
      // the trap springs
      net.userData.live = true; net.position.set(-8, 11, -34); put(-8, -34, -8, -44); K.put(C.molandak, -4, 0, -34, 0, -40); K.put(C.moyaki, -12, 0, -36, 0, -40); K.put(C.salmonad, -6, 0, -40, 0, -36); K.put(C.mouch, -10, 3.2, -30, 0, -36);
      await api.cine([
        { dur: 3.4, cam: [-8, 8, -16, -8, 3.4, -36], to: [-8, 7, -20, -8, 3.4, -36], line: ["Salmonad", "Wait. That post wasn't on my map. Those wires — everyone, freeze!"], start: () => { net.userData.live = false; net.position.set(-8, 40, -34); } },
        { dur: 2.4, cam: [-8, 9, -22, -8, 8, -36], line: null, start: () => { api.shake(0.7); net.userData.live = true; }, tick: u => { net.position.y = 40 - u * 29; } },
        { dur: 3.4, cam: [-16, 6, -22, -8, 7, -36], line: ["Moyaki", "A TRAP! Of course it's a trap! Who leaves a map post in the middle of a trap?!"], start: () => { net.position.y = 11; } },
        { dur: 3.2, cam: [-8, 5, -28, -8, 8, -36], line: ["Mouch", "Bzzz! Can't — fly — the ropes are SHOCKING!"] },
      ]);
      // the secret: skulls and the irradiated slip through the ropes
      if (rules.secret) {
        await api.cine([{ dur: 5.2, cam: [-3, 5.4, -26, -8, 8, -36], line: ["Chog #" + api.token, "(The ropes won't hold what I'm made of. …Just a little wriggle, and — pop! — I'm out. Quick, cut the others free!)"] }]);
        api.toast("Secret: your Chog slips out of the net", 3000);
        await api.mash({ need: 10, secs: 12, text: "Cut the ropes! Tap fast!" }) || await api.mash({ need: 10, secs: 12, text: "Cut the ropes! Tap fast!" });
      } else {
        let ok = false; while (!ok) { ok = await api.mash({ need: 18, secs: 8, text: "Cut the ropes! Tap / press Space / K fast!" }); if (!ok) { api.toast("The ropes tighten — again!", 1800); api.shake(0.4); } }
      }
      net.userData.live = false; net.visible = false; sparks.pts.visible = false; api.shake(0.9);
      K.put(C.molandak, -4, 0, -34, 0, -50); K.put(C.moyaki, -12, 0, -36, 0, -50); K.put(C.salmonad, -6, 0, -40, 0, -50); K.put(C.mouch, -10, 3.2, -30, 0, -50); api.sfx("roar");
      await api.cine([
        { dur: 4, cam: [-8, 8, -18, -8, 4, -36], line: ["Moyaki", "Never. Again. Do I follow a map. No offence, Salmonad."], start: () => { net.visible = false; } },
        { dur: 4, cam: [-14, 5, -30, -10, 3, -36], line: ["Salmonad", "None taken. But look at this wire — it's Mongrod's work. Cyborg tech. He rigged this trap for us."] },
        { dur: 3.6, cam: [-8, 6, -24, -8, 12, -50], line: ["Mouch", "Bzzz! The trees — he's cutting the branches loose above us! RUN for the clearing!"], start: () => api.shake(0.6) },
      ]);
      // the run: dodge the falling branches (look for the red rings) to the beacon at the clearing
      put(-8, -38, tc(-72), -72); K.put(C.molandak, -4, 0, -34, 0, -50); K.put(C.moyaki, -12, 0, -36, 0, -50); K.put(C.salmonad, -6, 0, -40, 0, -36); K.put(C.mouch, -10, 3.2, -30, 0, -36);
      level.checkpoint = { x: -8, z: -38 }; exitBeacon.visible = true; level._follow = api.player.pos;
      api.roam({ at: [-8, -38], face: [tc(-72), -72], obj: "RUN to the beacon! Dodge the red rings", pips: null }); hz.branch = !api.auto; hz.lt = undefined;
      api.toast("Red rings = falling branches. Keep moving!", 3600);
      const ex = new Promise(res => { const iv = setInterval(() => { if (Math.hypot(api.player.pos.x - tc(-72), api.player.pos.z + 72) < 4.5 || api.auto) { clearInterval(iv); res(); } }, 100); }); await ex;
      hz.branch = false; branches.forEach(g => { g.visible = false; g.userData.t = -1; }); level._follow = null; api.stopRoam(); exitBeacon.visible = false; api.sfx("shard");
      K.put(C.molandak, tc(-70) - 4, 0, -66, 0, -140); K.put(C.moyaki, tc(-70) - 9, 0, -64, 0, -140); K.put(C.salmonad, tc(-70) + 2, 0, -62, 0, -140); K.put(C.mouch, tc(-70) - 6, 3.2, -60, 0, -140); put(tc(-72), -72, 0, -140);
      await api.cine([
        { dur: 4.6, cam: [tc(-72) - 4, 7, -52, -8, 24, -146], to: [tc(-72) - 4, 6, -58, -8, 28, -146], line: ["Molandak", "Then he's already close. That skyline isn't just any city — he's here. And he knows we're coming."] },
        { dur: 4, cam: [tc(-72) + 6, 5, -56, tc(-72) - 4, 3.4, -66], line: ["Mouch", "Good. Because I'm ready to hit something. Hard."] },
      ]);
      api.finish({ badges: ["untrapped"], text: "The heroes cut their way out of Mongrod's trap. A skyline waits in the haze — he's close, and he knows they're coming." });
    },
  });
  K.finish();
  return level;
}
