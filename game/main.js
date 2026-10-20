import * as THREE from "three";
import { createGfx } from "./engine/gfx.js";
import { createPhysics } from "./engine/physics.js";
import { createPlayer, CAP_HH, CAP_R } from "./engine/player.js";
import { createCameraRig } from "./engine/camera.js";
import { startAudio, sfx } from "./engine/audio.js";
import { burst, updateBursts, drift } from "./engine/fx.js";
import { KIT, spawn } from "./engine/assets.js";
import { loadChog, FOOT_Y } from "./chog.js";
import { rulesFor } from "./rules.js";
import { saveKey, loadSave, writeSave } from "./save.js";
import { TITLE, CONTRACT, CREDITS, GUEST_TOKEN } from "./config.js";
import { createFlow } from "./chapters/ch1flow.js";
import { hasWallet, connect as walletConnect, ownedChogs } from "./wallet.js";
import { buildCh1 } from "./chapters/ch1level.js";
import { buildCh2 } from "./chapters/ch2level.js";
import { createFlow2 } from "./chapters/ch2flow.js";
import { createCutscene } from "./engine/cutscene.js";
import { createArenaMode } from "./arena_mode.js";
import { arenaPerks } from "./arena_sim.js";
import { getChronicle, chronicleHtml, writeChapter, getJSON, dailyHtml, worldHtml, boardHtml } from "./chronicle.js";

const $ = id => document.getElementById(id);
const screen = name => document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === name));
const show = (id, on) => $(id).classList.toggle("on", on);
const Q = new URLSearchParams(location.search);

const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
const gfx = createGfx($("view"), scene, camera);
window.DBG = { gfx, scene, camera, THREE, get: () => ({ chap, cine, phys, player, mode, dialogue, keys: [...keys], level, flow, hits, rig }), sim: (i, s) => sim(i, s), talk: () => { if (talkTarget()) talk(); while (dialogue) advance(); }, go: n => goChapter(n), begin: () => begin(), fail: (t) => fail(t) };   // probing from devtools
const titleLight = new THREE.HemisphereLight(0xffffff, 0x8877aa, 2.2); scene.add(titleLight);
const titleSun = new THREE.DirectionalLight(0xffffff, 1.2); titleSun.position.set(4, 10, 8); scene.add(titleSun);

let TRAITS = {}, chog, token = +(Q.get("token") || GUEST_TOKEN), rules = rulesFor({}), mode = "title", bg = 0x5b6cf7;
let holder = null, chap = 1, cine = null, phys, level, player, rig, flow, hits = 0, reviveUsed = false, wispsGot = 0, dialogue = null;
const keys = new Set(), pressed = new Set();
addEventListener("keydown", e => { if (!keys.has(e.code)) pressed.add(e.code); keys.add(e.code); if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault(); });
addEventListener("keyup", e => keys.delete(e.code));
// touch: buttons press the same keys as the keyboard; the stick gives analog move (push to the rim = run)
const TOUCH = matchMedia("(pointer: coarse)").matches, stick = { id: null, mx: 0, mz: 0 };
if (TOUCH) {
  $("prompt").style.visibility = "hidden"; $("help").textContent = "Stick move (push far to run) · Jump twice to double-jump · Spin attack · drag to look";
  document.querySelectorAll("#touch .tb").forEach(b => {
    const k = b.dataset.key, up = () => keys.delete(k);
    b.addEventListener("pointerdown", e => { e.preventDefault(); if (!keys.has(k)) pressed.add(k); keys.add(k); });
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("pointerleave", up);
  });
  const el = $("stick"), knob = $("knob"), R = 52;
  const move = e => {
    if (e.pointerId !== stick.id) return; const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    stick.mx = dx / R; stick.mz = -dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  const release = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.mx = stick.mz = 0; knob.style.transform = ""; };
  el.addEventListener("pointerdown", e => { stick.id = e.pointerId; el.setPointerCapture(e.pointerId); move(e); });
  el.addEventListener("pointermove", move); el.addEventListener("pointerup", release); el.addEventListener("pointercancel", release);
}
let clickSpin = false;
$("view").addEventListener("pointerup", () => setTimeout(() => { if (rig && rig.lastDragMoved < 6) clickSpin = true; }, 0));

// ---------- title ----------
const floor = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);

// the Great Elder Tree behind the title: everyone's play restores it (burnt at 0%, golden at 100%)
const elder = { root: new THREE.Group(), leaves: [], bark: [], embers: null, glow: null, pct: 0 };
elder.root.position.set(24, 0, -34); scene.add(elder.root);
spawn(`${KIT.nature}tree_oak.glb`).then(t => {
  const b = new THREE.Box3().setFromObject(t); t.scale.multiplyScalar(22 / (b.max.y - b.min.y)); elder.root.add(t);
  t.traverse(m => { if (!m.isMesh) return; const leaf = m.material.color.g > m.material.color.r; m.material = m.material.clone(); (leaf ? elder.leaves : elder.bark).push(m); m.castShadow = false; });
  elder.embers = drift(elder.root, { count: 60, box: [14, 20, 14], center: [0, 14, 0], color: 0xff7a3a, size: 0.5, speed: 1.2 });
  elder.glow = drift(elder.root, { count: 90, box: [20, 18, 20], center: [0, 18, 0], color: 0xffe066, size: 0.7, speed: 0.6 });
  growElder(elder.pct);
});
const C_ = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
function growElder(pct) {
  elder.pct = pct; const k = Math.max(0, Math.min(1, pct / 100)), green = Math.min(1, k * 2), gold = Math.max(0, k * 2 - 1);
  for (const m of elder.leaves) { m.material.color.copy(C_(0x2a2230, 0x5fae4a, green).lerp(new THREE.Color(0xffc93a), gold)); m.scale.setScalar(0.45 + 0.55 * Math.min(1, k * 1.5)); }
  for (const m of elder.bark) m.material.color.copy(C_(0x2a1f24, 0x8a5a3a, Math.min(1, k * 3)));
  if (elder.embers) { elder.embers.pts.material.opacity = 1 - k; elder.glow.pts.material.opacity = k; }
}
function showInfo() {
  const t = TRAITS[token] || {}; rules = rulesFor(t);
  $("traits").innerHTML = ["Skin", "Body", "Head", "Eyes", "Accessory", "Aura", "Tier"].filter(k => t[k]).map(k => `<b>${k}</b> ${t[k]}`).join(" · ");
  const ap = arenaPerks(t).tags;
  $("perks").innerHTML = `<b>Story:</b> ${rules.maxHits} hearts${rules.revive ? " · Aura revive" : ""}${rules.secret ? " · secret paths" : ""}<br><b>Arena:</b> ${ap.length ? ap.join(" · ") : "no special moves (base stats)"}`;
  const s = loadSave(localStorage, saveKey(CONTRACT, token));
  $("prog").textContent = `#${token}: ${s.done.length}/10 chapters` + (s.badges.length ? ` · badges: ${s.badges.join(", ")}` : "");
  const tok = token; $("chron").innerHTML = "📜 Reading this Chog's Chronicle…";
  Promise.all([getChronicle(tok), getJSON("/daily"), getJSON("/world")]).then(([r, q, w]) => { if (tok !== token) return;
    $("chron").innerHTML = chronicleHtml(r) + (holder ? "" : `<div class="muted" style="font-size:12px">Connect the holder's wallet to write your games into it.</div>`);
    $("daily").innerHTML = dailyHtml(q, r); $("world").innerHTML = worldHtml(w); growElder(Q.has("tree") ? +Q.get("tree") : w.percent); })
    .catch(() => { $("chron").textContent = "📜 Chronicle unavailable right now."; });
}
// a finished chapter goes into the Chog's Chronicle (holder signs once); guests are told how to make it count
async function chronicleChapter(n) {
  if (!holder) { $("resText").insertAdjacentHTML("beforeend", `<br><span class="muted">Played as a guest — connect the holder's wallet to write this into Chog #${token}'s Chronicle.</span>`); return; }
  $("resText").insertAdjacentHTML("beforeend", `<br><span class="muted" id="chronNote">Sign in your wallet to write chapter ${n} into Chog #${token}'s Chronicle…</span>`);
  try { await writeChapter(token, n, holder); $("chronNote").textContent = `📜 Written into Chog #${token}'s Chronicle.`; }
  catch (e) { $("chronNote").textContent = `Chronicle not updated: ${e.message || e}`; }
}

// ---------- the transformation: plain Chog -> charge -> flash -> traits pop on one by one ----------
const TF = { phase: "idle", t: 0, spin: 0, ready: null, bgFrom: new THREE.Color(), bgTo: new THREE.Color(), parts: [] };
const swirlN = 260, swirlPos = new Float32Array(swirlN * 3), swirlSeed = Array.from({ length: swirlN }, () => [Math.random() * 6.28, 1.5 + Math.random() * 3, Math.random() * 4.5]);
const swirlGeo = new THREE.BufferGeometry(); swirlGeo.setAttribute("position", new THREE.BufferAttribute(swirlPos, 3));
const swirl = new THREE.Points(swirlGeo, new THREE.PointsMaterial({ color: 0xc8a6ff, size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
swirl.frustumCulled = false; scene.add(swirl);
const wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
wave.rotation.x = -Math.PI / 2; scene.add(wave);
const elastic = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -9 * x) * Math.sin((x * 10 - 0.75) * 2.094) + 1;
function plainChog() { token = null; bg = chog.applyTraits({}); scene.background = new THREE.Color(0x2a2140); chog.root.userData.traitParts = []; }
function startCharge() { if (TF.phase === "charge") return; TF.phase = "charge"; TF.t = 0; TF.ready = null; startAudio(); }
function transformTo(id) { if (TF.phase !== "charge") startCharge(); TF.ready = id; }   // the charge keeps going until the token is known
function burstNow() {
  token = TF.ready; const t = TRAITS[token] || {};
  TF.bgFrom.copy(scene.background); bg = chog.applyTraits(t); TF.bgTo.setHex(bg);
  TF.parts = (chog.root.userData.traitParts || []).map(p => ({ p, s: p.scale.clone(), done: false }));
  TF.parts.forEach(o => o.p.scale.setScalar(0.0001));
  $("flash").style.background = "#fff"; $("flash").style.opacity = 0.9;
  setTimeout(() => { $("flash").style.opacity = 0; setTimeout(() => $("flash").style.background = "#ff2a4a", 300); }, 90);
  wave.material.opacity = 0.9; wave.scale.setScalar(1); sfx("shard"); TF.phase = "burst"; TF.t = 0;
  showInfo();
}
function tickTransform(dt, sx) {
  const r = chog.root; TF.t += dt;
  if (TF.phase === "charge") {                              // spin up, lift off, energy spirals in
    TF.spin = Math.min(TF.spin + dt * 9, 22); r.rotation.y += TF.spin * dt;
    r.position.y = -FOOT_Y + Math.min(1, TF.t * 0.8) * 1.2 + Math.sin(TF.t * 30) * 0.03;
    swirl.material.opacity = Math.min(1, TF.t * 2);
    for (let i = 0; i < swirlN; i++) {
      const [a0, rad, h] = swirlSeed[i], k = (TF.t * 0.9 + i / swirlN) % 1, rr = rad * (1 - k), a = a0 + TF.t * 6 + k * 8;
      swirlPos.set([sx + Math.cos(a) * rr, h * (1 - k) + 1.6 * k + 0.2, Math.sin(a) * rr], i * 3);
    }
    swirlGeo.attributes.position.needsUpdate = true;
    if (TF.ready !== null && TF.t > 1.4) burstNow();
  } else if (TF.phase === "burst") {
    TF.spin *= Math.pow(0.04, dt); r.rotation.y += TF.spin * dt;
    swirl.material.opacity = Math.max(0, swirl.material.opacity - dt * 3);
    wave.scale.setScalar(1 + TF.t * 14); wave.material.opacity = Math.max(0, 0.9 - TF.t * 1.4); wave.position.set(sx, 0.05, 0);
    scene.background.copy(TF.bgFrom).lerp(TF.bgTo, Math.min(1, TF.t / 0.7));
    TF.parts.forEach((o, i) => {
      const k = elastic((TF.t - 0.15 - i * 0.14) / 0.55); o.p.scale.copy(o.s).multiplyScalar(Math.max(0.0001, k));
      if (!o.done && k > 0.6) { o.done = true; sfx("wisp", 0.5, 1 + i * 0.08); const w = new THREE.Vector3(); o.p.getWorldPosition(w); burst(scene, w, { color: 0xfff1a8, count: 18, speed: 7, life: 0.5, size: 0.5 }); }
    });
    const land = Math.min(1, TF.t / 0.9); r.position.y = -FOOT_Y + 1.2 * (1 - land) + Math.abs(Math.sin(land * Math.PI * 2)) * 0.35 * (1 - land);
    if (TF.t > 0.15 + TF.parts.length * 0.14 + 0.7) {
      TF.phase = "done"; TF.spin = 0; r.position.y = -FOOT_Y;
      const t = TRAITS[token] || {}; $("nameCard").textContent = `CHOG #${token}` + (t.Tier ? ` · ${t.Tier}` : ""); $("nameCard").style.transform = "translateX(-50%) translateY(0)";
      $("playRow").style.display = ""; $("arenaSub").textContent = Q.get("room") ? `Join room ${Q.get("room")} ›` : "PvP · stake your Chog"; $("storySub").textContent = loadSave(localStorage, saveKey(CONTRACT, token)).chapter >= 2 ? "Continue · Chapter 2" : "Chapter 1 · The Genesis"; $("connectRow").style.display = "none"; $("pick").style.display = "none"; $("who").textContent = "This Chog is ready.";
    }
  }
}

// ---------- dialogue ----------
const DOC = "The Doctor";
const LINES = {
  intro: [[DOC, "You… you're a Chog. Still standing, after everything."],
          [DOC, "Mongrod burned the Elder Tree. This wasteland — all of it — is his doing."],
          [DOC, "This is the time device. It was meant for Molandak… but his creatures shattered it when they came for me."],
          [DOC, "Three Time Shards. The toxic swamp to the WEST, the graveyard to the EAST, the old ruins to the NORTH."],
          [DOC, "Bring them back. Then you go to the past — and stop Mongrod before any of this begins."]],
  waiting: [[DOC, "The shards — west, east and north. Hurry. They're getting bolder."]],
  ret: [[DOC, "All three! Hold still — let me set them…"], [DOC, "It's working. The portal is open on the south road—"],
        ["???", "R O A A A R"], [DOC, "Mongrod's war beast! RUN! South, through the road — to the portal! GO!"]],
};
const MOL = "Molandak", MOY = "Moyaki", SAL = "Salmonad", MOU = "Mouch";
Object.assign(LINES, {
  molandak: [[MOL, "Moyaki at the camp, Mouch in the glade to the west, Salmonad by the falls up north."], [MOL, "They don't know what's coming. Win them over — we'll need every one of them."]],
  molandak_gather: [[MOL, "That's all of them. Go on — the campfire. I'll tell them what I told you."]],
  moyaki_ask: [[MOY, "A new face at my fire! Sit, sit. You look like you fell out of the sky."], [MOY, "I'm brewing my famous jungle stew, but I'm out of spice."],
               [MOY, "Three fire peppers grow in the bamboo grove — EAST. Fetch them and you're family."]],
  moyaki_wait: [[MOY, "Three fire peppers, east in the bamboo. One hides up on a rock — hop for it!"]],
  moyaki_done: [[MOY, "Ha! Smell that? Now THAT is a stew. You're one of us now, little Chog."]],
  moyaki_done_early: [[MOY, "Wait — are those fire peppers? You read my mind! Sit down, you're family."]],
  moyaki_after: [[MOY, "Stew's nearly ready. Bring the others!"]],
  mouch_ask: [[MOU, "Bzzz — you're slow. Everyone's slow."], [MOU, "See the five glowing rings in my glade? Fly through all of them in 30 seconds."],
              [MOU, "Beat that and maybe I'll listen to whatever your hairy friend wants."]],
  mouch_wait: [[MOU, "Five rings, 30 seconds. The clock starts at the first one. The high one needs a jump — or two!"]],
  mouch_done: [[MOU, "…Not bad. NOT bad! Fine. I'm in. Whatever 'in' means."]],
  mouch_done_early: [[MOU, "You ran my rings before I even dared you? Okay, you're fast. I'm in."]],
  mouch_after: [[MOU, "Bzz. Meet you at the fire, speedy."]],
  salmonad_ask: [[SAL, "Ah! A visitor! Mind the gadgets."], [SAL, "My map — the wind snatched it right up the falls. It's on the high ledge."],
                 [SAL, "Climb the stone steps by the water. I'd go myself, but… fins."]],
  salmonad_wait: [[SAL, "The stone steps by the falls go all the way up to the ledge. Jump step to step!"]],
  salmonad_done: [[SAL, "My map! Every trail in this jungle is on it. If your friend's story is true, we'll need it."]],
  salmonad_done_early: [[SAL, "Is that… my map? You climbed the falls for a stranger? Count me in."]],
  salmonad_after: [[SAL, "I'll bring the map to the fire."]],
  race_reset: [[MOU, "Too slow! Bzzz. The rings are back — try again."]],
});
function say(key, done) { dialogue = { lines: LINES[key], i: 0, done }; show("dlg", true); renderLine(); sfx("talk"); }
function renderLine() { const [who, text] = dialogue.lines[dialogue.i]; $("dlgWho").textContent = who; $("dlgText").textContent = text; }
function advance() { if (!dialogue) return; dialogue.i++; sfx("talk", 0.6);
  if (dialogue.i >= dialogue.lines.length) { const d = dialogue.done; dialogue = null; show("dlg", false); d && d(); } else renderLine(); }
$("dlg").addEventListener("click", advance);

// ---------- HUD ----------
function hud() {
  const left = Math.max(0, rules.maxHits - hits);
  $("hearts").textContent = "♥".repeat(left) + "♡".repeat(rules.maxHits - left) + (rules.revive && !reviveUsed ? " ✦" : "");
  $("wispC").textContent = `✧ ${wispsGot}/${level.wispTotal()}`;
  const got = chap === 1 ? flow.shards.size : flow.doneCount();
  $("shardC").textContent = "◆".repeat(got) + "◇".repeat(3 - got);
  $("obj").textContent = flow.objective() + (level.raceLeft && level.raceLeft() > 0 ? ` · ⏱ ${Math.ceil(level.raceLeft())}s` : "");
}
const flash = () => { $("flash").style.opacity = 0.35; setTimeout(() => $("flash").style.opacity = 0, 120); };
let shake = 0;

// ---------- play ----------
const CHAPTERS = {
  1: { title: "Chapter 1 · The Genesis", card: "cards/ch1.jpg", text: "The future is a wasteland. Mongrod burned the Elder Tree and his creatures rule the dead forest. Find the Doctor — he has a way back." },
  2: { title: "Chapter 2 · Back to the Past", card: "cards/ch2.jpg", text: "The jungle is alive and the Great Elder Tree still stands. Somewhere here are the monanimals who will become heroes — they just don't know it yet." },
};
async function startGame(n = 1) {
  mode = "loading"; screen(""); show("loading", true); startAudio(); chap = n;
  scene.remove(floor, titleLight, titleSun, elder.root);
  if (level) { scene.remove(level.root); phys.world.free(); }   // leaving the previous chapter
  phys = await createPhysics(); level = n === 1 ? await buildCh1(scene, phys, rules) : await buildCh2(scene, phys);
  player = createPlayer(phys, level.spawnPoint); rig ??= createCameraRig(camera, $("view")); rig.pinned = null; rig.lockPin = false; flow = n === 1 ? createFlow() : createFlow2();
  hits = 0; reviveUsed = false; wispsGot = 0;
  const C = CHAPTERS[n]; $("introImg").src = C.card; $("introTitle").textContent = C.title; $("introText").textContent = C.text;
  rig.yaw = 0;                                     // start looking at the Doctor and the burned Elder Tree
  if (Q.get("at")) { const [x, z] = Q.get("at").split(",").map(Number); player.teleport(x, 2, z); }   // debug: ?at=x,z
  if (Q.get("yaw")) rig.yaw = +Q.get("yaw");                                                         // debug: ?yaw=radians
  show("loading", false); placeChog(); rig.snap(chog.root.position);
  if (n === 2 && !Q.has("selftest") && !Q.has("nocine")) return playCine(arrivalShots(), () => { player.teleport(0, 0, 13); rig.yaw = 0; rig.snap(chog.root.position); mode = "intro"; screen("intro"); });
  mode = "intro"; screen("intro");
}
async function goChapter(n) { show("dlg", false); dialogue = null; ["hud", "obj"].forEach(i => show(i, false)); await startGame(n); }
function begin() { screen(""); mode = "play"; ["hud", "obj", "help"].forEach(i => show(i, true)); hud(); setTimeout(() => show("help", false), 9000); }
function placeChog() {
  chog.root.position.set(player.pos.x, player.pos.y - (CAP_HH + CAP_R) - FOOT_Y, player.pos.z);
  chog.root.rotation.y = player.heading;
}
function damage(src) {
  if (!player.hurt(src.x, src.z, src.power)) return;
  hits++; sfx("hurt"); flash(); shake = 0.35;
  if (hits >= rules.maxHits) {
    if (rules.revive && !reviveUsed) { reviveUsed = true; hits = 0; burst(scene, player.pos, { color: 0xffe08a, count: 40, speed: 12 }); }
    else return fail("Mongrod's forces got you.");
  }
  hud();
}
function respawn() { const c = level.checkpoint; player.teleport(c.x, 2, c.z); }
function fail(text) { mode = "result"; $("resTitle").textContent = "Caught!"; $("resText").textContent = text; $("resMain").textContent = "Retry from checkpoint"; screen("result"); ["hud", "obj"].forEach(i => show(i, false)); }
function win() {
  mode = "result"; ["hud", "obj"].forEach(i => show(i, false));
  if (chap === 2) return win2();
  const key = saveKey(CONTRACT, token), s = loadSave(localStorage, key);
  if (!s.done.includes(1)) s.done.push(1); s.chapter = Math.max(s.chapter, 2);
  for (const b of ["escaped", wispsGot === level.wispTotal() ? "all-wisps" : null]) if (b && !s.badges.includes(b)) s.badges.push(b);
  writeSave(localStorage, key, s);
  $("resTitle").textContent = "Chapter 1 complete"; $("resText").textContent = `You leapt through the portal into the past. Wisps: ${wispsGot}/${level.wispTotal()}.`;
  $("resMain").textContent = "Continue to Chapter 2 ▸"; screen("result"); chronicleChapter(1);
}
function win2() {
  const key = saveKey(CONTRACT, token), s = loadSave(localStorage, key);
  if (!s.done.includes(2)) s.done.push(2); s.chapter = Math.max(s.chapter, 3);
  for (const b of ["allies", wispsGot === level.wispTotal() ? "all-wisps-2" : null]) if (b && !s.badges.includes(b)) s.badges.push(b);
  writeSave(localStorage, key, s);
  $("resTitle").textContent = "Chapter 2 complete"; $("resText").textContent = `The heroes are together. Next: Whispers in Moyaki's Pub — coming soon. Wisps: ${wispsGot}/${level.wispTotal()}.`;
  $("resMain").textContent = "Play again"; screen("result"); chronicleChapter(2);
}
$("resMain").onclick = () => {
  if ($("resMain").textContent.startsWith("Play again")) return location.reload();
  if ($("resMain").textContent.startsWith("Continue")) return goChapter(2);
  hits = 0; reviveUsed = false; screen(""); mode = "play"; ["hud", "obj"].forEach(i => show(i, true));
  if (level.chasing()) level.restartChase(player); else respawn(); hud();
};
$("resBack").onclick = () => location.reload();

// ---------- input (keyboard + touch), shared by the story and the arena ----------
function readInput(forceRun = false) {
  const input = {
    mx: (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
    mz: (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0),
    run: keys.has("ShiftLeft") || keys.has("ShiftRight") || forceRun, jumpPressed: pressed.has("Space"), spinPressed: pressed.has("KeyK") || clickSpin,
  };
  if (stick.id !== null) { input.mx += stick.mx; input.mz += stick.mz; if (Math.hypot(stick.mx, stick.mz) > 0.85) input.run = true; }
  return input;
}

// ---------- Bonk Arena (PvP): the server runs the fight, this just shows it ----------
let arenaMode = null;
async function enterArena(code) {
  mode = "arena"; screen(""); startAudio(); scene.remove(floor, titleLight, titleSun, elder.root); $("nameCard").style.display = "none";
  rig ??= createCameraRig(camera, $("view"));
  arenaMode ??= createArenaMode({ scene, camera, gfx, chog, traitsOf: t => TRAITS[t] || {}, token, holder, rig, sfx, onLeave: () => { location.href = location.pathname; } });
  await arenaMode.open(code);
}
$("arenaBtn").onclick = () => enterArena(Q.get("room"));

// ---------- loop ----------
const clock = new THREE.Clock(); let stepT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;   // real time (sub-stepped below), not slowed down at low FPS
  if (!chog) return;
  if (mode === "title" || mode === "credits") {
    const sx = innerWidth > 700 ? 2.6 : 0; chog.root.position.x = sx; chog.root.position.z = 0; floor.position.x = sx;
    elder.root.position.x = sx + 21; if (elder.embers) { elder.embers.update(t); elder.glow.update(t); } elder.root.rotation.y = Math.sin(t * 0.15) * 0.15;
    if (TF.freeze) {} else if (TF.phase === "idle" || TF.phase === "done") { chog.root.position.y = -FOOT_Y; chog.root.rotation.y = Math.sin(t * 0.4) * 0.6; } else tickTransform(dt, sx);
    chog.update(dt, 0); updateBursts(dt);
    camera.position.set(0, 2.8, 14); camera.lookAt(0, 2.3, 0); gfx.render(chog.parts); return;
  }
  if (mode === "arena") { arenaMode.frame(dt, readInput(), keys); clickSpin = false; pressed.clear(); if (TOUCH) { show("touch", !$("arenaLobby").classList.contains("on")); $("tbTalk").style.display = "none"; } return; }
  if (!level) { gfx.render(chog.parts); return; }
  if (mode === "cine") {
    cine.update(dt); level.update(dt, player, player.feet(), false); chog.update(dt, cineGait.speed, cineGait.air); updateBursts(dt);
    gfx.render(chog.parts.concat(level.parts)); if (cine.done) endCine(); return;
  }
  if (mode === "play" && level.raceLeft && level.raceLeft() > 0) hud();
  const playing = mode === "play" && !dialogue;
  if (pressed.has("KeyF") || (dialogue && pressed.has("Space"))) { if (dialogue) advance(); else if (talkTarget()) talk(); }
  const input = playing ? readInput(level.chasing()) : { mx: 0, mz: 0 };
  if (Q.has("auto") && playing) input.mz = 1;
  clickSpin = false; pressed.clear();
  // fixed sub-steps: same game speed at 15 FPS as at 60 (one-shot presses only on the first sub-step)
  const steps = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / steps, ev = [], lev = [];
  for (let k = 0; k < steps; k++) {
    if (mode === "play") ev.push(...player.update(h, k === 0 ? input : { ...input, jumpPressed: false, spinPressed: false }, rig.moveYaw()));
    phys.step(h);
    lev.push(...level.update(h, player, player.feet(), player.spin > 0));
  }
  for (const e of ev) { if (e === "jump" || e === "djump") sfx(e); if (e === "land") sfx("land", 0.6); if (e === "spin") sfx("spin"); }
  if (playing && player.grounded && player.speed > 2) { stepT -= dt * player.speed / 9; if (stepT <= 0) { sfx("step", 0.35); stepT = 0.42; } }
  handle(lev);
  // chog follows the physics body; gait from speed; blink while invulnerable; spin
  placeChog(); chog.update(dt, player.speed, !player.grounded);
  if (player.spin > 0) chog.root.rotation.y += (0.4 - player.spin) / 0.4 * Math.PI * 4;
  chog.root.visible = !(player.invuln > 0 && Math.floor(t * 14) % 2 === 0);
  if (player.feet() < -20) respawn();
  show("prompt", playing && !!talkTarget());
  if (TOUCH) { show("touch", playing); $("tbTalk").style.display = playing && talkTarget() ? "block" : "none"; }
  // camera: free orbit normally; during the chase it rides in front, looking back at you and the beast
  if (level.chasing() && !rig.lockPin) rig.pinned = { pos: new THREE.Vector3(player.pos.x * 0.5, player.pos.y + 7, player.pos.z - 17), look: new THREE.Vector3(player.pos.x * 0.6, player.pos.y + 2, player.pos.z + 6) };
  rig.update(dt, chog.root.position.clone().setY(player.pos.y - 1), keys);
  if (shake > 0) { shake = Math.max(0, shake - dt); camera.position.x += (Math.random() - 0.5) * shake * 2; camera.position.y += (Math.random() - 0.5) * shake * 2; }
  updateBursts(dt);
  gfx.render(chog.parts.concat(level.parts));
  fpsN++; fpsT += dt; if (fpsT >= 1 || (Q.has("fps") && fpsN % 5 === 0)) { const i = gfx.renderer.info.render; if (Q.has("fps")) console.log("fps", fpsN, "draw calls", i.calls, "tris", i.triangles, "pos", player ? player.pos.toArray().map(v => v.toFixed(1)).join(",") : "-", "grounded", player && player.grounded, "mode", mode); fpsN = 0; fpsT = 0; }
}
let fpsN = 0, fpsT = 0;
function handle(lev) {
  if (mode === "play") for (const e of lev) {
    if (e.wisp) { wispsGot++; sfx("wisp", 0.6); burst(scene, e.at, { color: 0x6fe3ff, count: 16, speed: 6 }); hud(); }
    if (e.shard) { flow.shard(e.shard); sfx("shard"); burst(scene, e.at, { color: 0x8ff0ff, count: 60, speed: 16, life: 1 }); shake = 0.2; hud(); }
    if (e.stomp) { sfx("stomp"); if (!e.spin) player.bounce(); burst(scene, e.at, { color: 0xd9d4e4, count: 30, speed: 12 }); shake = 0.15; }
    if (e.hurt) damage(e.hurt);
    if (e.splash) { sfx("splash"); damage({ x: player.pos.x, z: player.pos.z }); if (mode === "play") respawn(); }
    if (e.caught) { sfx("roar"); shake = 0.6; hits = rules.maxHits; fail("The beast caught you. Keep running — jump the logs, dodge the stones!"); }
    if (e.portal) { flow.portal(); win(); }
    if (e.item) { flow.item(e.item); sfx(e.item === "ring" ? "wisp" : "shard"); burst(scene, e.at, { color: e.item === "spice" ? 0xff6a3a : 0x9ffcff, count: 36, speed: 10 }); hud(); }
    if (e.ringsReset) { flow.reset("ring"); if (flow.got.ring === 0) say("race_reset"); hud(); }
    if (e.fire && flow.phase === "gather") { flow.fire(); ["hud", "obj"].forEach(i => show(i, false)); return playCine(campfireShots(), win); }
  }
}
// headless simulation for the self-test (?selftest): same update path as frame(), synchronous, no rendering
function sim(input, seconds) {
  const h = 1 / 60, n = Math.round(seconds * 60), full = { mx: 0, mz: 0, run: false, jumpPressed: false, spinPressed: false, ...input };
  for (let k = 0; k < n; k++) {
    if (mode !== "play") break;
    player.update(h, k === 0 ? full : { ...full, jumpPressed: false, spinPressed: false }, rig.moveYaw());
    phys.step(h); handle(level.update(h, player, player.feet(), player.spin > 0));
  }
}
function talkTarget() {
  if (chap === 1) return nearDoctor() ? "doctor" : null;
  let best = null, bd = 6.5;
  for (const [id, o] of level.npcs()) { const d = Math.hypot(player.pos.x - o.position.x, player.pos.z - o.position.z); if (d < bd) { bd = d; best = id; } }
  return best;
}
function nearDoctor() { return Math.hypot(player.pos.x - level.doctor.position.x, player.pos.z - level.doctor.position.z) < 7 && ["intro", "explore", "return"].includes(flow.phase); }
function talk() {
  if (chap === 2) {
    const id = talkTarget(); if (!id) return;
    if (id === "molandak") return say(flow.phase === "gather" ? "molandak_gather" : "molandak");
    const key = flow.talk(id);
    return say(key, () => { if (/_done/.test(key)) { level.toCamp(id); sfx("shard"); burst(scene, player.pos, { color: 0xffe27a, count: 40, speed: 10 }); } hud(); });
  }
  if (flow.phase === "intro") say("intro", () => { flow.talked(); hud(); });
  else if (flow.phase === "explore") say("waiting");
  else if (flow.phase === "return") say("ret", () => { flow.talked(); level.startChase(); sfx("roar"); shake = 0.8; hud(); });
}

// ---------- cutscenes (in-engine, skippable) ----------
const cineGait = { speed: 0, air: false };
let cineDone = null;
function playCine(shots, done) {
  mode = "cine"; cineDone = done; screen(""); ["hud", "obj", "help", "prompt"].forEach(i => show(i, false)); if (TOUCH) show("touch", false);
  show("cine", true); cine = createCutscene(camera, shots, { line: l => { show("cineSub", !!l); if (l) { $("cineWho").textContent = l[0]; $("cineText").textContent = l[1]; } } });
}
function endCine() { show("cine", false); cineGait.speed = 0; cineGait.air = false; const d = cineDone; cine = null; cineDone = null; mode = "intro"; d && d(); }
$("cine").addEventListener("click", e => { if (!cine) return; if (e.target.id === "cineSkip") cine.skip(); else cine.next(); });
const chogAt = (x, feet, z, lookX, lookZ) => { chog.root.position.set(x, feet - FOOT_Y, z); if (lookX !== undefined) chog.root.rotation.y = Math.atan2(lookX - x, lookZ - z); };
const ME = () => `Chog #${token}`;
function arrivalShots() {
  const { portal, heroes: { molandak } } = level, M = molandak, drop = (o, x, z, u, y0 = 9) => { const k = Math.min(1, u * 1.15); return y0 * (1 - k * k); };
  return [
    { dur: 2.4, cam: [0, 5, 38, 0, 8, 14], to: [0, 4.5, 33, 0, 8, 14], start: () => { chog.root.visible = false; M.visible = false; sfx("shard"); },
      tick: u => portal.scale.setScalar(Math.max(0.001, u)) },
    { dur: 1.5, cam: [12, 4, 30, 0, 4, 14], start: () => { chog.root.visible = true; M.visible = true; cineGait.air = true; burst(scene, portal.position, { color: 0xb59aff, count: 60, speed: 14 }); },
      tick: (u, dt) => { chogAt(0, drop(chog, 0, 14, u), 14, 0, 30); chog.root.rotation.y += (1 - u) * 6; M.position.set(4, drop(M, 4, 12, u), 12);
        if (u >= 1 && cineGait.air) { cineGait.air = false; sfx("land"); burst(scene, new THREE.Vector3(2, 0.5, 13), { color: 0xd9f0a0, count: 40, speed: 9 }); } } },
    { dur: 3.0, cam: [-3, 3.2, 24, 0, 2.6, 14], to: [-1, 3, 22, 0, 2.6, 14], line: [ME(), "Ow… where — where are we?"], start: () => { chogAt(0, 0, 14, 0, 30); M.position.set(4, 0, 12); M.lookAt(0, 0, 14); } },
    { dur: 3.8, cam: [1, 4, 22, 2, 3, 12], to: [6, 6, 20, 26, 20, -26], line: [MOL, "The past. Before the fire. Look up — the Great Elder Tree is still standing."],
      tick: u => portal.scale.setScalar(Math.max(0.001, 1 - u)) },
    { dur: 3.2, cam: [8, 4, 6, 26, 24, -26], to: [10, 5, 2, 26, 26, -26], line: [ME(), "(It's alive… and it's golden. Everything here is so green.)"] },
    { dur: 3.8, cam: [1.6, 2.6, 19, 4, 1.7, 12], to: [2, 2.4, 17.8, 4, 1.7, 12], line: [MOL, "Mongrod hasn't found the Monorb yet. But he will — unless we stop him first."], start: () => level.heroes.molandak.lookAt(2, 0, 18) },   // three-quarter view of Molandak's face, clear of the Chog
    { dur: 4.2, cam: [2.2, 2.6, 18.4, 4, 1.7, 12], to: [2.6, 2.5, 17.6, 4, 1.7, 12], line: [MOL, "I can't do it alone. There are monanimals here who don't know it yet… but they're going to be heroes."] },
    { dur: 4.2, cam: [0, 34, 42, 0, 0, -24], to: [0, 30, 34, 0, 0, -30], line: [MOL, "Moyaki keeps the camp. Mouch races in the glade, west. Salmonad tinkers by the falls, north."] },
    { dur: 3.0, cam: [0, 4, 24, 0, 2.6, 14], to: [0, 4.4, 22, 0, 2.6, 12], line: [ME(), "(Heroes, huh? Then let's go meet them.)"],
      start: () => { M.position.set(6, 0, 9); M.rotation.set(0, Math.atan2(0 - 6, 14 - 9), 0); } },
  ];
}
function campfireShots() {
  const H = level.heroes, F = level.FIRE;
  return [
    { dur: 3.6, cam: [0, 7, 18, 0, 2, 0], to: [12, 5, 11, 0, 2, 0], line: [MOY, "Well! A Chog, a fly, a fish and a… whatever you are. Some crew."],
      start: () => { chogAt(1.5, 0, 6.5, F.x, F.z); H.molandak.position.set(5.5, 0, 4); H.molandak.lookAt(F.x, 0, F.z); } },
    { dur: 3.4, cam: [-9, 5, 6, 4, 3, -4], line: [MOU, "Time traveler, he says. Prove it, fuzzball — what happens tomorrow?"] },
    { dur: 4.0, cam: [10, 3.4, 9, 5.5, 3, 4], to: [9, 3.2, 7.5, 5.5, 3, 4], line: [MOL, "Tomorrow? Mongrod finds the Monorb. And everything you see here burns."] },
    { dur: 3.6, cam: [-10, 4, -1, -6, 3, -5.5], line: [SAL, "The Monorb… my grandfather's stories called it a myth. An orb that corrupts whoever touches it."] },
    { dur: 3.0, cam: [2, 3, 12, 1.5, 2.6, 6.5], line: [ME(), "(Burns? The tree… this camp… all of it?)"] },
    { dur: 4.2, cam: [-12, 4, 5, -7, 2, 1.5], to: [-10, 3.6, 4, -7, 2, 1.5], line: [MOY, "Not around my fire it doesn't. Come to my pub tonight — all of you. You'll tell us everything, Molandak."] },
    { dur: 3.6, cam: [0, 5, 14, 0, 3, 0], to: [6, 30, 20, 26, 26, -26], line: [MOL, "Everything. From the beginning."] },
  ];
}

// ---------- boot ----------
$("ttl").textContent = TITLE; document.title = TITLE;
$("credText").innerHTML = CREDITS.map(l => `<p>${l}</p>`).join("") + "<p>3D props, characters and sound effects: Kenney (kenney.nl), CC0.</p>";
$("boardBtn").onclick = async () => { mode = "credits"; screen("board"); $("boardList").innerHTML = "Loading…";
  try { $("boardList").innerHTML = boardHtml((await getJSON("/board")).board, token); } catch { $("boardList").textContent = "Leaderboard unavailable right now."; } };
$("boardBack").onclick = () => { mode = "title"; screen("title"); };
$("credBtn").onclick = () => { mode = "credits"; screen("credits"); };
$("credBack").onclick = () => { mode = "title"; screen("title"); };
$("tok").value = GUEST_TOKEN;
const guestGo = id => { holder = null; $("connectRow").style.display = "none"; $("who").textContent = "Summoning a Chog…"; transformTo(id); };
$("rnd").onclick = () => guestGo(Math.min(1969, Math.max(1, +$("tok").value || GUEST_TOKEN)));
$("guest").onclick = () => guestGo(1 + Math.floor(Math.random() * 1969));
$("again").onclick = () => {
  plainChog(); TF.phase = "idle"; $("playRow").style.display = "none"; $("connectRow").style.display = ""; ["traits", "perks", "prog"].forEach(i => $(i).textContent = "");
  $("nameCard").style.transform = "translateX(-50%) translateY(-120px)"; $("who").innerHTML = "A plain Chog. Connect your wallet to become <b>yours</b>.";
};
$("connect").onclick = async () => {
  const say = s => $("who").textContent = s, stop = () => { TF.phase = "idle"; swirl.material.opacity = 0; };
  try {
    if (!hasWallet()) return say("No wallet found. Install MetaMask or Rabby, or play as guest.");
    say("Connecting…"); const addr = await walletConnect(); holder = addr;
    say(`Scanning Monad for ${addr.slice(0, 6)}…${addr.slice(-4)}’s Chogs…`); startCharge();
    const ids = await ownedChogs(addr);
    if (!ids.length) { stop(); return say("No Chog Genesis in this wallet. Play as guest, or connect another wallet."); }
    $("connectRow").style.display = "none";
    if (ids.length === 1) { say(`Found Chog #${ids[0]}!`); return transformTo(ids[0]); }
    stop(); say(`You hold ${ids.length} Chogs. Pick one:`); $("pick").style.display = "";
    $("pickList").innerHTML = ids.map(id => `<button data-id="${id}">#${id}</button>`).join("");
    $("pickList").querySelectorAll("button").forEach(b => b.onclick = () => { $("pick").style.display = "none"; transformTo(+b.dataset.id); });
  } catch (e) { stop(); say(e.message || String(e)); }
};
// ---------- home menu: story chapter map, Chronicle ----------
const STORY = ["The Genesis", "Back to the Past", "Whispers in Moyaki's Pub", "Echo of a Shattered Future", "The Heroes Assemble", "The First Encounter", "The Trap", "The Ambush", "Guardians in the Cave", "End Game"];
function renderChapters() {
  const reached = loadSave(localStorage, saveKey(CONTRACT, token)).chapter || 1;
  $("chapters").innerHTML = STORY.map((name, i) => { const n = i + 1, built = n <= 2, open = built && n <= reached;
    const state = !built ? "Coming soon" : open ? "▶ Play" : "🔒 Finish chapter " + (n - 1);
    return `<button class="chap${open ? "" : " locked"}" data-ch="${n}">${n <= 9 ? `<img src="cards/ch${n}.jpg" alt="">` : `<span class="ph"></span>`}<div><b>${n}. ${name}</b><br>${state}</div></button>`; }).join("");
  $("chapters").querySelectorAll(".chap:not(.locked)").forEach(b => b.onclick = () => startGame(+b.dataset.ch));
}
$("menuStory").onclick = () => { mode = "credits"; screen("story"); renderChapters(); };
$("storyBack").onclick = () => { mode = "title"; screen("title"); };
$("menuChron").onclick = () => { mode = "credits"; screen("chronScreen"); $("chronTitle").textContent = `📜 Chog #${token}'s Chronicle`; showInfo(); };
$("chronBack").onclick = () => { mode = "title"; screen("title"); };
if (matchMedia("(pointer: coarse)").matches) addEventListener("click", () => document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.("landscape")).catch(() => {}), { once: true });   // touch: fullscreen + landscape lock on first tap
$("start").onclick = () => { begin(); };

Promise.all([fetch("../body/traits.json").then(r => r.json()), loadChog("..")]).then(async ([tr, c]) => {
  TRAITS = tr; chog = c; scene.add(chog.root); frame();
  getJSON("/world").then(w => growElder(Q.has("tree") ? +Q.get("tree") : w.percent)).catch(() => {});   // ?tree=N previews the tree at N%
  if (Q.has("play") || Q.has("selftest")) { bg = chog.applyTraits(TRAITS[token] || {}); rules = rulesFor(TRAITS[token] || {}); }   // debug links skip the title
  else { plainChog(); if (Q.get("token")) guestGo(+Q.get("token"));
    if (Q.get("holder") && ["localhost", "127.0.0.1"].includes(location.hostname)) holder = Q.get("holder").toLowerCase();   // debug (local only): act as this wallet (anvil test Chogs)
    if (Q.get("tft")) { const sx = innerWidth > 700 ? 2.6 : 0; let total = 0; while (total < +Q.get("tft")) { tickTransform(1 / 60, sx); total += 1 / 60; if (TF.phase === "done") break; } TF.freeze = true; } }   // debug: jump the transform to t seconds                               // ?token=N: auto-transform
  const CH = +(Q.get("ch") || 1);
  if (Q.has("selftest")) { await startGame(CH); begin(); (await import(CH === 2 ? "./selftest2.js" : "./selftest.js")).run(window.DBG); return; }
  if (Q.has("play")) { await startGame(CH); if (Q.has("go")) { if (mode === "cine") { cine.skip(); endCine(); } begin(); } if (Q.has("chase")) { flow.phase = "chase"; level.startChase(); if (Q.get("cz")) { player.teleport(0, 2, +Q.get("cz")); rig.pinned = Q.has("ahead") ? { pos: new THREE.Vector3(0, 7, +Q.get("cz") + 12), look: new THREE.Vector3(0, 2, +Q.get("cz") - 20) } : { pos: new THREE.Vector3(0, 9, +Q.get("cz") - 17), look: new THREE.Vector3(0, 2, +Q.get("cz") + 6) }; rig.lockPin = Q.has("ahead"); camera.position.copy(rig.pinned.pos); rig.look.copy(rig.pinned.look); } } }   // debug: ?chase&cz=z
}).catch(e => { document.body.insertAdjacentHTML("beforeend", `<div class="pill" style="position:fixed;bottom:12px;left:12px">Load failed: ${e.message}</div>`); console.error(e); });
