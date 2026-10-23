// Chapter 4 "Echo of a Shattered Future": the story cuts back to the future. Your Chog drifts through Mongrod's fortress as an echo,
// sneaks past his patrols (visor / glass / laser eyes see the vision cones) and witnesses Mongrod learn where Molandak went.
import { THREE, createKit, preload, spawn, drift, N, G } from "./kit.js";

export const meta = { n: 4, title: "Chapter 4 · Echo of a Shattered Future", card: "cards/ch4.jpg",
  text: "A cold echo of the future. In his fortress, Mongrod is learning what the Doctor did — and where Molandak went. Slip past his patrols and see it for yourself." };

const robot = g => {   // a cyborg sentry: dark plated body, one red eye
  const o = new THREE.Group(), lam = c => new THREE.MeshLambertMaterial({ color: c }), B = new THREE.BoxGeometry(1, 1, 1);
  const mk = (c, p, s) => { const m = new THREE.Mesh(B, lam(c)); m.position.set(...p); m.scale.set(...s); m.castShadow = true; o.add(m); return m; };
  mk(0x3a3f55, [0, 2.2, 0], [1.9, 2.8, 1.3]); mk(0x2a2e40, [0, 0.8, 0], [1.4, 1.6, 1.0]); mk(0x4a5070, [0, 4.2, 0.1], [1.5, 1.3, 1.3]);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.2), new THREE.MeshBasicMaterial({ color: 0xff3a2a })); eye.position.set(0, 4.25, 0.78); o.add(eye);
  for (const x of [-1.25, 1.25]) mk(0x3a3f55, [x, 2.6, 0], [0.6, 2.4, 0.7]);
  const half = new THREE.Group(); half.add(o); o.scale.setScalar(0.95); return half;
};

export async function build({ scene, phys, traits }) {
  await preload([`${G}character-keeper.glb`, `${G}pillar-large.glb`, `${G}iron-fence.glb`, `${G}lightpost-single.glb`]);
  const K = await createKit(scene, phys);
  K.sky(0x1a1230, 0x2a1c44, 0.009);
  K.lights({ hemi: [0xb8a8ff, 0x3a2a58, 2.1], sun: { color: 0xc8baff, i: 1.5, pos: [10, 50, 20], range: 55 } });

  // a long cold hall, z +46 .. -90, walls at x = +-20
  K.box(0, -0.5, -7, 42, 1, 170, 0x4a4466, { outlined: false });   // z +78 .. -92: the back wall sits well behind the spawn camera
  const lines = new THREE.GridHelper(140, 28, 0x3a3358, 0x2a2540); lines.rotation.x = 0; lines.position.set(0, 0.02, -7); lines.scale.set(0.3, 1, 1); K.root.add(lines);
  K.box(-20.8, 8, -7, 1.6, 16, 170, 0x2e2646, { outlined: false }); K.box(20.8, 8, -7, 1.6, 16, 170, 0x2e2646, { outlined: false });
  K.box(0, 8, 79, 42, 16, 1.6, 0x2e2646, { outlined: false });
  for (let z = 36; z > -70; z -= 17) { for (const x of [-17.5, 17.5]) { K.box(x, 6, z, 2.2, 12, 2.2, 0x3a3550, { outlined: true }); K.glow(0x6a5aff, 6, x * 0.9, 9.5, z, 0.35); } }
  // pillars you can stand beside; wall banners
  for (const [x, z] of [[-8, 28], [9, 22], [-9, 8], [8, 2], [-8, -22], [9, -30], [-7, -44], [7, -50]]) K.box(x, 5, z, 3, 10, 3, 0x4a4468, { outlined: true });
  for (let i = 0; i < 12; i++) { const z = 40 - i * 11, b = K.box(i % 2 ? 19.9 : -19.9, 9, z, 0.2, 7, 3.4, 0x6a1f3a, { collide: false }); b.userData.noOutline = true; }
  const dust = drift(K.root, { count: 220, box: [40, 14, 140], center: [0, 7, -22], color: 0x8a7aff, size: 0.35, speed: 0.4 }); K.updaters.push(t => dust.update(t));

  // interrogation chamber at the far end: round dais, chair, the Doctor, Mongrod, and the dark time machine
  K.cyl(0, 0.4, -74, 14, 0.8, 0x56507a, { outlined: true });
  K.box(0, 8, -92, 42, 16, 1.6, 0x2e2646, { outlined: false });
  const doctor = await K.cast("doctor"); doctor.position.set(0, 0.8, -72); doctor.rotation.y = 0;
  K.box(0, 1.6, -73.2, 3, 1.6, 2.4, 0x3a3550, { collide: false, outlined: true }); K.box(0, 3.4, -74.4, 3, 3.2, 0.5, 0x3a3550, { collide: false, outlined: true });
  const mongrod = await K.cast("cyborg"); mongrod.position.set(5.5, 0.8, -66); K.face(mongrod, 0, -72);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.8, 14, 48), new THREE.MeshStandardMaterial({ color: 0x241a3a, emissive: 0x6a2aff, emissiveIntensity: 1.5, roughness: 0.4 })); ring.position.set(-9, 8, -84); K.root.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(6.3, 40), new THREE.MeshBasicMaterial({ color: 0x7a3aff, transparent: true, opacity: 0.0, side: THREE.DoubleSide })); disc.position.copy(ring.position); K.root.add(disc);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x4a2aa0, emissive: 0x5a2aff, emissiveIntensity: 1.2 })); c.position.set(ring.position.x + Math.cos(a) * 6.5, ring.position.y + Math.sin(a) * 6.5, ring.position.z); c.rotation.z = a - Math.PI / 2; K.root.add(c); }
  K.glow(0x7a3aff, 20, ring.position.x, ring.position.y, ring.position.z, 0.3);
  K.updaters.push(t => { ring.rotation.z = t * 0.4; disc.material.opacity = Math.max(0, disc.material.opacity); mongrod.position.y = 0.8 + Math.sin(t * 1.4) * 0.05; });
  const chamberLight = new THREE.PointLight(0x9a6aff, 70, 40); chamberLight.position.set(0, 12, -72); K.root.add(chamberLight);

  // patrols: three sections
  const defs = [
    { path: [[-15, 22], [15, 22]], speed: 4.2, range: 13, angle: 0.55 },
    { path: [[15, 6], [-15, 6]], speed: 3.6, range: 13, angle: 0.55 },
    { path: [[-15, -16], [15, -16]], speed: 4.4, range: 13, angle: 0.55 },
    { path: [[15, -30], [-15, -30]], speed: 3.8, range: 13, angle: 0.55 },
    { path: [[-15, -46], [15, -46]], speed: 4.6, range: 14, angle: 0.5 },
    { path: [[15, -56], [-15, -56]], speed: 4.0, range: 14, angle: 0.5 },
  ];
  const S = K.stealth(defs, traits, robot);
  for (let i = 0; i < S.guards.length; i++) S.guards[i].x = defs[i].path[i % 2 ? 0 : 0][0] * (i % 2 ? 1 : 1), S.guards[i].wait = i * 0.5;

  let spotted = 0, reached = false; const checks = [{ z: 40, x: 0 }, { z: 2, x: 0 }, { z: -34, x: 0 }];
  const level = K.level({
    camYaw: 0, camDist: 16, camPitch: 0.5, spawnPoint: { x: 0, y: 0, z: 42 }, checkpoint: { x: 0, z: 42 },
    onUpdate(dt, player, feetY) {
      const ev = []; if (reached) return ev;
      const pz = player.pos.z; for (const c of checks) if (pz < c.z - 1.5 && this.checkpoint.z > c.z - 1.5) this.checkpoint = { x: c.x, z: c.z + 1 };   // sections you cleared become your restart
      const sp = Math.hypot(player.vel.x, player.vel.z), run = sp > 10.5, still = sp < 1.2;
      if (S.update(dt, player.pos.x, pz, feetY, { run, still })) { spotted++; ev.push({ respawn: "Spotted! The echo flickers back to the last safe spot." }); }
      if (pz < -58) { reached = true; ev.push({ signal: "reached" }); }
      return ev;
    },
    tick(t, dt) { if (!this.active) S.update(dt, 999, 999, 99, {}); },
    autoSolve(api) { api.place(0, -60); },
    get spotted() { return spotted; },
    async script(api) {
      await api.title("Echo of a Shattered Future", "Chapter 4");
      const put = (x, z, lx, lz) => { api.chog.root.position.set(x, 0.8 + 2.36, z); api.chog.root.rotation.y = Math.atan2(lx - x, lz - z); api.chog.root.visible = true; };
      await api.cine([
        { dur: 4.4, cam: [0, 14, 52, 0, 4, 20], to: [0, 11, 40, 0, 4, 10], line: ["???", "Dark, cold, and silent. This isn't the camp. This isn't the past."], start: () => put(0, 42, 0, -60) },
        { dur: 4.2, cam: [-12, 6, 30, 0, 5, 18], to: [-8, 5, 26, 4, 5, 22], line: ["Chog #" + api.token, "(An echo. The Monorb's power is showing me what's happening in the future… right now.)"] },
        { dur: 4.0, cam: [4, 7, 6, 12, 4, 6], line: ["???", "(Mongrod's sentries. They'll see me if I run. Walk — or stand still — and wait for the gaps.)"] },
      ]);
      api.roam({ at: [0, 42], face: [0, -60], obj: S.showCones ? "Sneak to the chamber at the end of the hall — your eyes show the patrol cones" : "Sneak to the chamber at the end of the hall — watch the orange rings: guards notice runners from far away" });
      api.toast(S.showCones ? "Your visor lets you see every patrol cone" : "Orange rings = how close is too close. Walking is quieter than running", 5200);
      await api.waitFor("reached");
      api.stopRoam(); api.place(0, -61); put(0, -62, 0, -72);
      await api.cine([
        { dur: 4.4, cam: [-14, 9, -50, 0, 4.5, -72], to: [-10, 7, -56, 0, 4.5, -72], line: ["Mongrod", "Doctor. I know about your little device. Where is it?"], start: () => put(0, -60, 0, -72) },
        { dur: 4.2, cam: [-4, 5.5, -60, 0, 4, -72], line: ["The Doctor", "It's… broken. Shattered. There's nothing left for you to take."] },
        { dur: 4.6, cam: [10, 7, -60, 0, 5, -72], to: [7, 6.5, -62, 0, 5, -72], line: ["Mongrod", "Then tell me about the traveler instead. The one with the fur. Molandak."] },
        { dur: 3.8, cam: [-7, 4.8, -68, 0, 3.8, -72], line: ["The Doctor", "Gone. He's gone, Mongrod. Out of your reach — in time itself."] },
        { dur: 4.6, cam: [12, 8, -56, 3, 6, -74], line: ["Mongrod", "In the PAST. Before the tree burned. Before the Monorb was mine. …Interesting."] },
        { dur: 4.2, cam: [-3, 10, -78, -9, 8, -84], to: [-1, 9, -76, -9, 8, -84], line: ["Mongrod", "I built a machine once. It failed. They all failed. But I never stopped… and now it's finished."], start: () => { disc.material.opacity = 0.25; } },
        { dur: 4.4, cam: [8, 6, -62, -9, 8, -84], to: [3, 6, -70, -9, 8, -84], line: ["The Doctor", "No — you can't! If you go back there, you'll tear everything apart!"], start: () => { disc.material.opacity = 0.55; } },
        { dur: 4.8, cam: [0, 7, -64, -9, 8, -84], to: [-3, 8, -72, -9, 8, -84], line: ["Mongrod", "Good. I'll start with him. Then the Monorb. Then everything that ever laughed at me."], start: () => { disc.material.opacity = 0.8; } },
        { dur: 3.6, cam: [-14, 9, -78, -9, 8, -84], line: null, start: () => { mongrod.position.set(-9, 0.8, -83); disc.material.opacity = 0.95; api.shake(0.8); },
          tick: u => { mongrod.position.x = 5.5 - u * 14.5; mongrod.position.y = 0.8 + u * 6; mongrod.scale.setScalar(Math.max(0.05, 1 - u * 0.95) * (10.5 / 10.5)); } },
      ]);
      mongrod.visible = false; disc.material.opacity = 0.4;
      await api.say([["The Doctor", "(quietly) Molandak. Whatever you're doing back there… hurry."]]);
      api.finish({ badges: ["echo"], text: `The echo fades. Mongrod has built his own time machine and gone after Molandak. It's a race now.${spotted === 0 ? " You were never spotted — a perfect echo." : ""}` });
    },
  });
  K.finish();
  return level;
}
