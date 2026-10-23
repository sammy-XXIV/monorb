// Chapter 3 "Whispers in Moyaki's Pub": Molandak tells the group about the future, Mongrod's origin and the Monorb.
// Free-roam to the table, then a told story with Mongrod's failed inventions, two choices (trust / rage flags) and a Side-trait option.
import { THREE, createKit, preload, spawn, drift, N, G, P } from "./kit.js";

export const meta = { n: 3, title: "Chapter 3 · Whispers in Moyaki's Pub", card: "cards/ch3.jpg",
  text: "Night falls on the jungle. At Moyaki's pub, Molandak finally tells the others what he has seen: a wasteland, a tyrant, and an orb that corrupts everyone who touches it." };

const TABLE = { x: 0, z: -5 };
const planks = () => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#7a5230"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#6a4528" : "#845a36"; g.fillRect(i * 32, 0, 30, 256); g.fillStyle = "#4a2f1a"; g.fillRect(i * 32 + 30, 0, 2, 256); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 4); return t; };

export async function build({ scene, phys, traits }) {
  await preload([`${N}pot_large.glb`, `${P}barrel.glb`, `${G}lantern-candle.glb`, `${G}candle-multiple.glb`, `${N}log.glb`]);
  const K = await createKit(scene, phys);
  K.sky(0x160f22, 0x1d1428, 0.012);
  K.lights({ hemi: [0xffd9a8, 0x2a1c14, 1.25], sun: { color: 0xffc890, i: 0.9, pos: [8, 40, 20], range: 36 } });

  // room: x -22..22, z -18..14. Walls are inward-facing planes (see-through from outside, so the camera never gets blocked) + invisible colliders.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x6a5a58, side: THREE.FrontSide });
  const wall = (x, y, z, w, h, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; K.root.add(m); };
  K.box(0, -0.5, -2, 44, 1, 32, 0xffffff, { tex: planks() });
  wall(0, 7, -18, 44, 14, 0); wall(-22, 7, -2, 32, 14, Math.PI / 2); wall(22, 7, -2, 32, 14, -Math.PI / 2); wall(-12, 7, 14, 20, 14, Math.PI); wall(12, 7, 14, 20, 14, Math.PI); wall(0, 11.5, 14, 4, 5, Math.PI);
  phys.box(0, 7, -18.6, 23, 8, 0.6); phys.box(-22.6, 7, -2, 0.6, 8, 17); phys.box(22.6, 7, -2, 0.6, 8, 17); phys.box(-12.5, 7, 14.6, 10.5, 8, 0.6); phys.box(12.5, 7, 14.6, 10.5, 8, 0.6);
  for (const x of [-14, 14]) K.box(x, 13.4, -2, 1.2, 1.2, 32, 0x4a2f1a, { collide: false });   // ceiling beams
  for (let i = 0; i < 5; i++) K.box(-20 + i * 10, 13.4, -2, 32.5, 0.5, 0.8, 0x4a2f1a, { collide: false }).rotation.y = Math.PI / 2;

  // fireplace on the back wall
  for (const x of [-4.2, 4.2]) K.box(x, 4, -17.2, 2.4, 8, 1.6, 0x6b6470, { outlined: true });
  K.box(0, 8.6, -17.2, 10.8, 1.8, 1.6, 0x77707e, { outlined: true }); K.box(0, 3.8, -17.7, 6.2, 7.6, 0.8, 0x1a0e0e, { collide: false });
  K.box(0, 1.6, -16.5, 4, 0.7, 1.4, 0x4a3a30, { collide: false });                                          // hearth logs
  K.glow(0xff7a2a, 9, 0, 3.6, -16, 0.45); K.glow(0xffb35a, 4, 0, 2.6, -15.8, 0.4);
  const fireLight = new THREE.PointLight(0xff8a3a, 90, 34); fireLight.position.set(0, 4, -14); K.root.add(fireLight);
  const flames = drift(K.root, { count: 70, box: [3.4, 3.2, 1.2], center: [0, 3, -16.2], color: 0xff7a2a, size: 1.4, speed: 9 });
  K.updaters.push(t => { fireLight.intensity = 80 + Math.sin(t * 13) * 14 + Math.sin(t * 5.3) * 6; flames.update(t); });

  // table, stew, mugs, plates
  K.cyl(TABLE.x, 1.5, TABLE.z, 5.2, 3, 0x7a5230, { outlined: true });
  K.cyl(TABLE.x, 3.1, TABLE.z, 5.6, 0.4, 0x8a6038, { collide: false, outlined: true });
  const pot = await spawn(`${N}pot_large.glb`, { pos: [TABLE.x, 3.3, TABLE.z], tint: 0x6a4a3a }); K.fit(pot, 1.9); K.add(pot, { outlined: true });
  const steam = drift(K.root, { count: 40, box: [1.6, 5, 1.6], center: [TABLE.x, 6, TABLE.z], color: 0xfff1d8, size: 1.1, speed: 3 }); K.updaters.push(t => steam.update(t));
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = 3.7; K.cyl(TABLE.x + Math.cos(a) * r, 3.6, TABLE.z + Math.sin(a) * r, 0.32, 0.55, i % 2 ? 0xc79a4a : 0xe8d9b0, { collide: false, outlined: true, seg: 12 }); }
  K.glow(0xffd9a0, 6, TABLE.x, 5, TABLE.z, 0.3);
  // barrels, bar, lanterns
  K.box(-16, 2.1, -13.5, 9, 4.2, 2.4, 0x5a3a22, { outlined: true }); K.box(-16, 4.3, -13.5, 9.6, 0.4, 2.8, 0x7a5230, { collide: false, outlined: true });
  for (const [x, z] of [[18, -14], [20, -10], [-19, 4], [19, 6], [-19, 8]]) { const b = await spawn(`${P}barrel.glb`, { pos: [x, 0, z] }); K.fit(b, 3.6); K.add(b, { collide: "cyl", shrink: 0.9, outlined: true }); }
  const winTex = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 192; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, "#27406e"); gr.addColorStop(1, "#6a8cc8");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 192); g.fillStyle = "#e8e0c8"; for (const [x, y] of [[30, 40], [90, 28], [70, 90]]) g.fillRect(x, y, 3, 3); g.fillStyle = "#2a1a10"; g.fillRect(60, 0, 8, 192); g.fillRect(0, 92, 128, 8); g.lineWidth = 10; g.strokeStyle = "#2a1a10"; g.strokeRect(0, 0, 128, 192);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const [x, z, ry] of [[-21.9, -8, Math.PI / 2], [21.9, -8, -Math.PI / 2], [-21.9, 4, Math.PI / 2], [21.9, 4, -Math.PI / 2]]) {   // night windows, flush on the side walls
    const w = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), new THREE.MeshBasicMaterial({ map: winTex })); w.position.set(x, 7.5, z); w.rotation.y = ry; K.root.add(w); K.glow(0x6a9aff, 7, x * 0.93, 7.5, z, 0.25); }
  for (const [x, z] of [[-18.5, -13.5], [-13.5, -13.5]]) { const l = await spawn(`${G}lantern-candle.glb`, { pos: [x, 4.5, z], scale: 3 }); K.add(l, { outlined: true }); K.glow(0xffc070, 4.5, x, 6.5, z, 0.45); }
  for (const [x, z] of [[-10, 2], [10, 6], [0, -12.5]]) K.glow(0xffc070, 5, x, 9.5, z, 0.3);   // hanging lamp light

  // the cast stands around the table
  const C = {}; for (const id of ["molandak", "moyaki", "salmonad", "mouch"]) C[id] = await K.cast(id);
  const at = (o, x, y, z) => { o.position.set(x, y, z); K.face(o, TABLE.x, TABLE.z); };
  at(C.moyaki, 0, 0, -11.2); at(C.salmonad, 8.6, 0, -5); at(C.mouch, -8, 3, -5); at(C.molandak, 5.2, 0, 0.6);
  K.face(C.salmonad, TABLE.x, TABLE.z);

  // memory vignettes above the stew: Mongrod's three failed machines
  const memory = new THREE.Group(); memory.position.set(TABLE.x, 9.2, TABLE.z); memory.scale.setScalar(0.55); K.root.add(memory);
  const mk = (geo, color, p, s = [1, 1, 1]) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color })); m.position.set(...p); m.scale.set(...s); return m; };
  const B = new THREE.BoxGeometry(1, 1, 1), Cy = new THREE.CylinderGeometry(1, 1, 1, 16), Co = new THREE.ConeGeometry(1, 1, 12);
  const glider = new THREE.Group(); glider.add(mk(B, 0xb23a3a, [0, 0, 0], [1.4, 0.5, 3.4]), mk(B, 0xe8d9b0, [0, 0.1, 0.2], [6.5, 0.15, 1.6]), mk(B, 0x4a2f1a, [0, 0.55, -1.2], [0.2, 1, 0.2]));
  const cleaner = new THREE.Group(); cleaner.add(mk(Cy, 0x4a8a5a, [0, 0, 0], [1.2, 2.4, 1.2]), mk(Cy, 0xe0c060, [0, -1.4, 0], [2.4, 0.3, 2.4]), mk(Cy, 0x2a2a30, [0, 1.5, 0], [0.5, 0.8, 0.5]));
  const robot = new THREE.Group(); robot.add(mk(B, 0x9aa0b0, [0, 0, 0], [2, 2.6, 1.6]), mk(B, 0xb8bece, [0, 2, 0], [1.5, 1.3, 1.3]), mk(Co, 0xffc93a, [0, 3.0, 0], [0.7, 0.8, 0.7]), mk(B, 0xff4a3a, [0, 2.05, 0.7], [1.0, 0.2, 0.1]));
  const shout = K.text("I AM YOUR KING!", "#ffd36a", 7, 1.2); shout.position.set(0, 5.4, 0); robot.add(shout);
  for (const g of [glider, cleaner, robot]) { g.visible = false; memory.add(g); g.traverse(m => { if (m.isMesh && m.material.map === null) m.castShadow = true; }); }
  let showing = null; const spark = K.glow(0xffe27a, 5, TABLE.x, 9.2, TABLE.z, 0); K.updaters.push((t) => {
    memory.rotation.y = Math.sin(t * 0.8) * 0.4; glider.rotation.set(Math.sin(t * 2.6) * 0.5, 0, Math.sin(t * 3.1) * 0.7); cleaner.rotation.z = Math.sin(t * 5) * 0.3; robot.position.y = Math.sin(t * 3) * 0.2;
    shout.lookAt(scene.userData.camPos || new THREE.Vector3(0, 8, 20)); spark.material.opacity = showing ? 0.5 + Math.sin(t * 9) * 0.25 : 0; });
  const show = which => { showing = which; glider.visible = which === "glider"; cleaner.visible = which === "cleaner"; robot.visible = which === "robot"; };

  const NPCS = { molandak: C.molandak, moyaki: C.moyaki, salmonad: C.salmonad, mouch: C.mouch };
  const side = traits.Side === "Left" ? "L" : "R";
  const L = {   // flavour lines when you talk before / after the story
    moyaki: [["Moyaki", "Pull up a spot, little Chog! My famous stew, fresh from the pot. That quiet one by the table has the saddest eyes I've ever seen."]],
    salmonad: [["Salmonad", "A wasteland, he says. Before the next full moon the whole jungle's mapped, I say. Both can't be true."]],
    mouch: [["Mouch", "Bzzz. Molandak keeps staring into the flames. Go on, sit with him — someone has to hear it."]],
  };

  const level = K.level({
    camYaw: 0, camDist: 14, camPitch: 0.5, spawnPoint: { x: 0, y: 0, z: 10 }, checkpoint: { x: 0, z: 10 },
    npcs: () => Object.entries(NPCS),
    talkTarget(pos) { let best = null, bd = 7; for (const [id, o] of Object.entries(NPCS)) { const d = Math.hypot(pos.x - o.position.x, pos.z - o.position.z); if (d < bd) { bd = d; best = id; } } return best; },
    talk(id, api) { if (id === "molandak") return api.signal("seated"); api.say(L[id]); },
    autoSolve(api) { api.signal("seated"); },
    tick(t) { C.mouch.position.y = 3 + Math.sin(t * 2.2) * 0.35; C.mouch.userData.animate?.(t, 1); C.salmonad.position.y = Math.sin(t * 1.6) * 0.06; },
    async script(api) {
      const put = (x, z, lx, lz) => { api.chog.root.position.set(x, 2.36, z); api.chog.root.rotation.y = Math.atan2(lx - x, lz - z); api.chog.root.visible = true; };
      const molandak = C.molandak, camPos = api.camera.position; scene.userData.camPos = camPos;
      await api.title("Whispers in Moyaki's Pub", "Chapter 3");
      put(0, 10, TABLE.x, TABLE.z);
      await api.cine([
        { dur: 3.6, cam: [0, 6.5, 14.5, 0, 3.4, -6], to: [0, 5.6, 11, 0, 3.4, -6], line: ["Moyaki", "Last call for stew! Sit, sit — nobody leaves my pub hungry."], start: () => put(0, 10, TABLE.x, TABLE.z) },
        { dur: 3.4, cam: [-4, 5.6, -7, 2, 4, -16.5], to: [-1, 5, -8.5, 0, 4.5, -16.5], line: ["Salmonad", "He's been staring at that fire for an hour. The newcomer. Molandak."] },
        { dur: 3.2, cam: [-3, 5, -1.5, 5.2, 3.2, 0.6], to: [-1, 4.4, -0.5, 5.2, 3.2, 0.6], line: ["Mouch", "Bzzz. Something's eating him. Somebody say something."] },
        { dur: 3.6, cam: [10, 4.6, 5, 5.2, 3.4, 0.6], to: [8.5, 4.2, 4, 5.2, 3.4, 0.6], line: ["Molandak", "I have to tell you all something. Come — sit. The stew can wait. The jungle can't."] },
      ]);
      api.roam({ obj: "Join the table: talk to Molandak (walk up, press F / Talk)", at: [0, 10], face: [TABLE.x, TABLE.z] });
      await api.waitFor("seated");
      api.stopRoam(); put(2.2, 2.4, TABLE.x, TABLE.z);
      const tell = (who, text) => [who, text];
      await api.cine([
        { dur: 4, cam: [-9, 6.2, 9.5, 0, 4.2, -5], to: [-7, 6, 8, 0, 4.2, -5], line: tell("Molandak", "Where I come from, the jungle is dead. A dark wasteland. Everything the Elder Tree protected… gone."),
          start: () => { put(2.4, 2.6, TABLE.x, TABLE.z); K.face(molandak, TABLE.x, TABLE.z); } },
        { dur: 3.6, cam: [-2.5, 5.2, -7.8, 0, 4.8, -11.2], line: tell("Moyaki", "Gone?! The Elder Tree? Who would do such a thing?") },
        { dur: 3.2, cam: [9, 5, 4, 5.2, 3.8, 0.6], to: [8, 4.6, 3.4, 5.2, 3.8, 0.6], line: tell("Molandak", "Mongrod.") },
        { dur: 3.6, cam: [4.5, 5.4, -1.5, 8.6, 4.6, -5], line: tell("Salmonad", "Mongrod? The inventor? Everyone knows him — his machines never work!") },
        { dur: 4.2, cam: [-2, 8.5, 7.5, 0, 8.6, -5], line: tell("Molandak", "That's where it began. A brilliant Monanimal of the Rilla Clan, cursed with machines that failed spectacularly."), start: () => show(null) },
        { dur: 3.8, cam: [5.5, 10.2, 7, 0, 9.4, -5], line: tell("Molandak", "His Sky Glider lost its wings in mid-flight."), start: () => show("glider") },
        { dur: 3.6, cam: [-5.5, 10.2, 7, 0, 9.4, -5], line: tell("Molandak", "His Jungle Cleaner swept up half the village… and then the cleaner."), start: () => show("cleaner") },
        { dur: 4.2, cam: [0, 10, 8.5, 0, 9.6, -5], line: tell("Molandak", "And his Monanimal Helper robot only ever shouted one thing…"), start: () => show("robot") },
        { dur: 3.2, cam: [-9, 5.2, -1, -8, 4.8, -5], line: tell("Mouch", "…Okay, that one's kind of funny. Bzzz."), start: () => show(null) },
        { dur: 4.6, cam: [7, 5.2, 7.5, 3, 3.8, 0.6], line: tell("Molandak", "The clan laughed. They mocked him until he vanished. When he came back, he was a cyborg with an army.") },
      ]);
      await api.cine([{ dur: 0.6, cam: [-9, 6.2, 12, 1, 3.2, -5], line: null }]);
      const a = await api.choose("Molandak: \"One failure can't be the whole story.\" What do you say?", ["\"He was dangerous from the start.\"", "\"They broke him. Rejection does that.\""]);
      if (a === 0) { api.bumpFlag("rage"); await api.say([["Molandak", "Maybe so. Either way, he wiped out most of the Rilla Clan."]]); }
      else { api.bumpFlag("trust"); await api.say([["Molandak", "…You see more than most. Even so, he wiped out most of the Rilla Clan."]]); }
      await api.cine([
        { dur: 4.2, cam: [-1, 5.4, 6.5, 2, 4, -4], to: [0, 5.2, 5.5, 2, 4, -4], line: tell("Molandak", "Then he found the Monorb. An ancient, indestructible orb of enormous energy. It corrupts whoever touches it.") },
        { dur: 3.8, cam: [4.5, 5.4, -1.5, 8.6, 4.6, -5], line: tell("Salmonad", "The Monorb? My grandfather called it a myth.") },
        { dur: 4.6, cam: [9, 5.6, 4.5, 4, 4, -2], line: tell("Molandak", "In my time, Mongrod used it to drain the Elder Tree dry and seize everything. That's why I came back.") },
        { dur: 3.4, cam: [-2.5, 5.2, -7.8, 0, 4.8, -11.2], line: tell("Moyaki", "Then we find it first. Before he does.") },
      ]);
      const opts = ["Find it and hide it far away.", "Find it and destroy it, if it can be destroyed.", side === "L" ? "Find it, and use it to heal the Elder Tree. (Left-sided)" : "Find Mongrod first and stop him before he reaches it. (Right-sided)"];
      await api.cine([{ dur: 0.6, cam: [9, 6.2, 12, -1, 3.2, -5], line: null }]);
      const b = await api.choose("What should we do about the Monorb?", opts);
      if (b === 0) { api.bumpFlag("trust"); await api.say([["Molandak", "Hidden where no one will ever look. Yes. That's the safest."]]); }
      else if (b === 1) { api.bumpFlag("rage"); await api.say([["Molandak", "They say nothing can break it. But if there's a way, we'll find it."]]); }
      else if (side === "L") { api.bumpFlag("trust", 2); api.setFlag("healer", true); await api.say([["Molandak", "Heal the tree with the very thing that wounded it… I hadn't dared hope for that."], ["Moyaki", "Now THAT is the kind of plan I'll cook for."]]); }
      else { api.bumpFlag("rage", 2); api.setFlag("hunter", true); await api.say([["Mouch", "Strike first? Finally, someone who talks my speed."], ["Molandak", "Bold. Dangerous. …But maybe right."]]); }
      await api.cine([
        { dur: 3.8, cam: [4.5, 5.4, -1.5, 8.6, 4.6, -5], line: tell("Salmonad", "Then it's settled. We find the Monorb before Mongrod does. I'll start on the map.") },
        { dur: 3.6, cam: [-9, 5.2, -1, -8, 4.8, -5], line: tell("Mouch", "I'm in. Somebody here has to be fast.") },
        { dur: 4.0, cam: [-2.5, 5.2, -7.8, 0, 4.8, -11.2], line: tell("Moyaki", "My pub is your base. Tomorrow we gather under the Elder Tree, and we get ready.") },
        { dur: 4.2, cam: [8, 5.4, 6, 5.2, 4, 0.6], to: [6.4, 5, 5, 5.2, 4, 0.6], line: tell("Molandak", "Thank you. All of you. I wasn't sure anyone would believe me.") },
      ]);
      api.finish({ badges: ["whispers"], text: "The heroes agree on a plan: find the Monorb before Mongrod does. Tomorrow they assemble under the Elder Tree." });
    },
  });
  K.finish();
  return level;
}
