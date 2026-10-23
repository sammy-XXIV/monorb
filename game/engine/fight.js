// Story fights: the Bonk Arena sim run locally against bots. You (the Chog), optional allies and enemies share a floating platform.
// createFight() returns { frame(dt, input, keys) -> { done, won } , dispose() }.
import * as THREE from "three";
import { createArena, addPlayer, startMatch, step, SPIN_T, R0 } from "../arena_sim.js";
import { makeBrain, botInput } from "./bots.js";
import { outline } from "./gfx.js";

const DT = 1 / 30, $ = id => document.getElementById(id);
const FOOT_Y = -2.36;   // the Chog model's feet (see chog.js FOOT_Y)

// A stone platform on a tall pillar (falling off really falls). opts: { x, y, z, top, rim, ring, pillar:{h,color} }
export function fightPlatform(root, parts, { x = 0, y = 40, z = 0, top = 0xb9a88f, rim = 0x7d6a58, ring = 0xffd36a, pillar = { h: 40, color: 0x6f6a7a } } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); root.add(g);
  const mk = (geo, color) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color })); m.castShadow = m.receiveShadow = true; g.add(m); outline(m); parts.push(m); return m; };
  const t = mk(new THREE.CylinderGeometry(1, 1, 1, 64), top), r = mk(new THREE.CylinderGeometry(1, 0.55, 1, 64), rim);
  const p = pillar ? mk(new THREE.CylinderGeometry(4, 6, pillar.h, 16), pillar.color) : null; if (p) p.position.y = -4 - pillar.h / 2;
  const rg = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.66, 64), new THREE.MeshBasicMaterial({ color: ring, transparent: true, opacity: 0.8 })); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.02; g.add(rg);
  const setRadius = R => { t.scale.set(R, 0.8, R); t.position.y = -0.4; r.scale.set(R, 6, R); r.position.y = -3.8; rg.scale.setScalar(R); };
  setRadius(R0);
  return { group: g, origin: { x, y, z }, setRadius };
}

// cfg: { origin, stage, rig, chog, player: { perks, team? }, actors: [{ id, model, name, perks, team, ai, scale?, baseY? }], opts: { winsToWin, shrink }, assist (0..), sfx, autoWin }
export function createFight(cfg) {
  const { rig, chog, stage, actors, sfx = () => {} } = cfg, O = stage.origin, assist = cfg.assist || 0;
  const s = createArena(1, { winsToWin: cfg.opts?.winsToWin ?? 2, shrink: cfg.opts?.shrink !== false, humanId: "me", maxPlayers: 8 });
  addPlayer(s, "me", { team: "hero", perks: cfg.player.perks });
  const brains = {}, names = { me: "You" }, list = [];
  for (const a of actors) {
    const weak = a.team === "foe" ? 1 - 0.12 * assist : 1;   // each lost attempt makes enemies a little gentler
    const perks = { ...(a.perks || {}) }; if (a.team === "foe") { perks.power = (perks.power ?? 1) * weak; perks.weight = Math.max(0.8, (perks.weight ?? 1) * weak); }
    if (!addPlayer(s, a.id, { team: a.team || "foe", perks })) continue;
    brains[a.id] = makeBrain({ ...(a.ai || {}), react: (a.ai?.react ?? 0.3) * (1 + 0.25 * assist), seed: a.id.length * 31 + 3 });
    names[a.id] = a.name || a.id; list.push(a);
  }
  startMatch(s);
  const prev = {}, rings = new Map(), ringGeo = new THREE.RingGeometry(1.1, 1.5, 32);
  const ringFor = (id, color) => { if (!rings.has(id)) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; stage.group.add(m); rings.set(id, m); } return rings.get(id); };
  const fxs = new Map(), mat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const fxFor = id => { if (!fxs.has(id)) { const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat(0xff3a2a)), wave = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), mat(0xffb04a)),
      beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1), mat(0xfff2a0)), guard = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 12), mat(0x7be8ff));
    disc.rotation.x = wave.rotation.x = -Math.PI / 2; for (const m of [disc, wave, beam, guard]) { m.visible = false; stage.group.add(m); } fxs.set(id, { disc, wave, beam, guard }); } return fxs.get(id); };
  let acc = 0, prevPhase = "", prevRound = 0, endT = 0, t = 0, result = null, banner = 0;
  chog.root.visible = true; rig.pinned = null; rig.yaw = Math.PI; rig.pitch = 0.5; rig.dist = cfg.dist || 24;
  $("arHud").classList.add("on"); const say = (text, secs = 1.4) => { const b = $("arBanner"); b.textContent = text; b.classList.add("on"); banner = secs; };
  const score = () => { $("arScore").textContent = s.order.map(id => `${names[id]} ${"★".repeat(s.players[id].wins)}`).join("   ·   "); };

  function phaseFx() {
    if (s.phase === "countdown") { const n = Math.ceil(3 - s.t); if (s.round !== prevRound || n !== +$("arBanner").textContent) say(String(Math.max(1, n)), 1); prevRound = s.round; }
    if (s.phase === "fight" && prevPhase === "countdown") { say("FIGHT!", 0.9); sfx("roar"); }
    if (s.phase === "roundover" && prevPhase === "fight") { const w = s.lastRoundWinner; say(w && s.players[w].meta.team === "hero" ? "Round won" : w ? "Round lost" : "Draw", 2.6); sfx(w && s.players[w].meta.team === "hero" ? "shard" : "hurt"); }
    if (s.phase === "over" && prevPhase !== "over") { const won = s.winner && s.players[s.winner].meta.team === "hero"; say(won ? "VICTORY!" : "DEFEATED", 3); sfx(won ? "shard" : "hurt"); result = { won: !!won }; }
    if (s.players.me.reviveT > 1.9) { say("Aura revive!", 1.6); sfx("shard"); }
    prevPhase = s.phase; score();
  }
  const place = (obj, p, id, isChog) => {
    const vis = p.y > -14, a = acc / DT, pv = prev[id] || p, L = k => pv[k] + (p[k] - pv[k]) * Math.min(1, a);
    obj.visible = vis; obj.position.set(O.x + L("x"), O.y + L("y") + (isChog ? -FOOT_Y : 0), O.z + L("z"));
    obj.rotation.y = p.heading + (p.spinT > 0 ? (SPIN_T - p.spinT) / SPIN_T * Math.PI * 4 : 0);
  };

  return {
    sim: s,
    frame(dt, input, keys) {
      if (cfg.autoWin) dt *= 8;   // tests run the fight clock fast
      t += dt; acc += dt;
      const yaw = rig.moveYaw(), sn = Math.sin(yaw), cs = Math.cos(yaw);
      const wx = input.mz * sn - input.mx * cs, wz = input.mz * cs + input.mx * sn;
      let press = { jump: input.jumpPressed, spin: input.spinPressed, skill: input.skillPressed };
      while (acc >= DT && s.phase !== "over") {
        const ins = { me: { mx: wx, mz: wz, run: input.run, jump: press.jump, spin: press.spin, skill: press.skill } };
        press = {};   // a press only counts on the first sub-step
        for (const id in brains) ins[id] = botInput(s, id, brains[id], DT);
        for (const id of s.order) prev[id] = { x: s.players[id].x, y: s.players[id].y, z: s.players[id].z, heading: s.players[id].heading };
        step(s, ins, DT); acc -= DT; phaseFx();
        if (cfg.autoWin && s.phase === "fight" && s.t > 0.5) for (const a of list) if (a.team === "foe" && s.players[a.id].alive) { s.players[a.id].x = R0 + 5; s.players[a.id].z = 0; }   // tests: the enemy walks off
      }
      if (s.phase === "over") { acc = 0; endT += dt; }
      // draw
      const me = s.players.me; place(chog.root, me, "me", true);
      chog.update(dt, Math.hypot(me.vx, me.vz), me.y > 0.2 || !me.alive);
      for (const a of list) { const p = s.players[a.id]; place(a.model, p, a.id, false); a.model.position.y += (a.baseY || 0) + (Math.hypot(p.vx, p.vz) > 1.5 && p.y <= 0.05 ? Math.abs(Math.sin(t * 11 + a.id.length)) * 0.25 : 0); a.model.userData.animate?.(t, p.y > 0.2 ? 1 : 0.3); }
      for (const id of s.order) { const p = s.players[id], m = ringFor(id, id === "me" ? 0xffd36a : (p.meta.team === "hero" ? 0x7be8ff : 0xff5a4a));
        if (p.spinT > 0) { const u = 1 - p.spinT / SPIN_T; m.visible = true; m.scale.setScalar(0.6 + u * 2.4 * p.perks.reach); m.material.opacity = 0.85 * (1 - u); m.position.set(p.x, p.y + 0.3, p.z); } else m.visible = false; }
      for (const id of s.order) { const p = s.players[id], f = fxFor(id), K = p.perks;
        const on = (m, v) => { m.visible = v; return v; };
        if (on(f.disc, p.slamT > 0)) { const u = 1 - p.slamT / K.slam.wind; f.disc.scale.setScalar(K.slam.r); f.disc.position.set(p.x, p.y + 0.06, p.z); f.disc.material.opacity = (0.2 + 0.45 * u) * (0.75 + 0.25 * Math.sin(t * 30)); }
        if (on(f.wave, p.slamHit > 0)) { const u = 1 - p.slamHit / 0.35; f.wave.scale.setScalar(K.slam.r * (0.3 + 0.7 * u)); f.wave.position.set(p.x, p.y + 0.1, p.z); f.wave.material.opacity = 0.9 * (1 - u); }
        if (on(f.beam, p.beamT > 0)) { f.beam.scale.set(1, 1, 13); f.beam.position.set(p.x + Math.sin(p.heading) * 6.8, p.y + 1.1, p.z + Math.cos(p.heading) * 6.8); f.beam.rotation.y = p.heading; f.beam.material.opacity = Math.min(1, p.beamT / 0.3) * 0.9; }
        if (on(f.guard, p.guardT > 0)) { f.guard.position.set(p.x, p.y + 1.1, p.z); f.guard.material.opacity = 0.25 + 0.1 * Math.sin(t * 14); } }
      stage.setRadius(s.radius);
      if (banner > 0 && (banner -= dt) <= 0) $("arBanner").classList.remove("on");
      rig.update(dt, new THREE.Vector3(O.x + me.x, O.y + Math.max(me.y, -2), O.z + me.z), keys);
      return { done: result && endT > 3.2, won: result ? result.won : null, phase: s.phase };
    },
    dispose() { $("arHud").classList.remove("on"); $("arBanner").classList.remove("on"); $("arScore").textContent = ""; for (const m of rings.values()) stage.group.remove(m); for (const f of fxs.values()) for (const m of Object.values(f)) stage.group.remove(m); },
    names,
  };
}
