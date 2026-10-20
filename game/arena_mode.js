// Bonk Arena client: lobby + rendering of the server's fight. Inputs go up, snapshots come down; nothing here decides who wins.
import * as THREE from "three";
import { joinRoom, newRoomCode } from "./net.js";
import { buildArena } from "./chapters/arena.js";
import { FOOT_Y } from "./chog.js";
import * as stakeApi from "./stake.js";
import { sign, holderMessage, getJSON } from "./chronicle.js";

const $ = id => document.getElementById(id);
const DELAY = 0.1;   // render 100 ms in the past, between two snapshots: smooth even with jittery packets

export function createArenaMode({ scene, camera, gfx, chog, traitsOf, token, holder, rig, sfx, onLeave }) {
  let arena = null, conn = null, me = null, host = null, code = null, lobby = [], snaps = [], clock = 0, lastSend = 0, banner = { text: "", t: 0 }, prevPhase = "", prevRound = 0;
  const chogs = new Map();   // id -> { c, tag }
  let stake = null, result = null, wallet = null, busy = false, paid = null, note = "";
  const allParts = () => [...chogs.values()].flatMap(v => v.c.parts).concat(arena ? arena.parts : []);
  const say = (text, secs = 1.6) => { banner = { text, t: secs }; $("arBanner").textContent = text; $("arBanner").classList.add("on"); };
  const names = {}, nameOf = id => (lobby.find(p => p.id === id) || {}).name || names[id] || "A Chog who left";   // remember names: a winner may have left since

  async function ensureChog(id, tok) {
    if (chogs.has(id)) return chogs.get(id);
    const tag = document.createElement("div"); tag.className = "pill arTag"; $("arTags").append(tag);
    const v = { c: null, tag, tok }; chogs.set(id, v);
    if (id === me) { v.c = chog; return v; }
    const m = await import(`./chog.js?p=${id}-${Date.now()}`);   // a fresh module instance per remote Chog (the loader keeps per-model state)
    v.c = await m.loadChog(".."); v.c.applyTraits(traitsOf(tok)); scene.add(v.c.root);
    return v;
  }
  function dropChog(id) { const v = chogs.get(id); if (!v) return; v.tag.remove(); if (v.c && v.c !== chog) scene.remove(v.c.root); chogs.delete(id); }

  function renderLobby(m) {
    host = m.host; lobby = m.players; for (const p of lobby) names[p.id] = p.name;
    for (const id of [...chogs.keys()]) if (!lobby.find(p => p.id === id)) dropChog(id);
    lobby.forEach(async p => { const v = await ensureChog(p.id, p.token); if (v.c && v.tok !== p.token) { v.tok = p.token; v.c.applyTraits(traitsOf(p.token)); } });
    stake = m.stake && m.stake.matchId !== paid ? m.stake : null; renderStake();
    $("arPlayers").innerHTML = lobby.map(p => `<div>${p.id === host ? "👑 " : ""}<b>${p.name}</b>${p.id === me ? " (you)" : ""} · ${p.wins} wins${p.wallet ? " · 🔒 staked" : ""}${p.verified ? " · 📜 holder" : " · guest"}`
      + `<div class="muted" style="font-size:12px">${(p.perks && p.perks.tags.length ? p.perks.tags : ["No special moves"]).join(" · ")}</div></div>`).join("");
    const idle = m.phase === "lobby" || m.phase === "over";
    $("arStart").style.display = idle && me === host ? "" : "none"; $("arStart").disabled = lobby.length < 2;
    $("arStart").textContent = lobby.length < 2 ? "Waiting for a challenger…" : m.phase === "over" ? "Rematch" : "Start the fight";
    $("arWait").style.display = idle && me !== host ? "" : "none";
    if (m.phase === "over" && m.winner) $("arResult").textContent = `${nameOf(m.winner)} wins the match!`;
    document.getElementById("arenaLobby").classList.toggle("on", idle);
  }

  function onMsg(m) {
    if (m.t === "welcome") { me = m.id;   // holders sign once so this match goes into their Chog's Chronicle
      if (holder) sign(holder, holderMessage(token, code, me, holder)).then(sig => conn.send({ t: "verify", wallet: holder, sig })).catch(() => stakeMsg("Not verified: this match won't be written into your Chog's Chronicle.")); }
    else if (m.t === "lobby") renderLobby(m);
    else if (m.t === "s") { snaps.push({ at: clock, s: m.s }); if (snaps.length > 6) snaps.shift(); phaseFx(m.s); }
    else if (m.t === "result") { result = m; renderStake(); }
    else if (m.t === "err") stakeMsg(m.why);
    else if (m.t === "full") { alert(`Can't join: ${m.why}`); leave(); }
    else if (m.t === "closed") $("arCodeLine").textContent = "Disconnected. Leave and rejoin the link.";
  }
  function phaseFx(s) {
    if (s.ph === "countdown") { const n = Math.ceil(3 - s.t); if (s.rd !== prevRound || n !== +banner.text) say(String(Math.max(1, n)), 1); if (s.rd !== prevRound) { prevRound = s.rd; $("arWin").textContent = ""; } }
    if (s.ph === "fight" && prevPhase === "countdown") { say("BONK!", 0.9); sfx("roar"); }
    if (s.ph === "roundover" && prevPhase === "fight") { say(s.lw ? `${s.lw === me ? "You win" : nameOf(s.lw) + " wins"} the round` : "Draw!", 3); sfx(s.lw === me ? "shard" : "hurt"); }
    if (s.ph === "over" && prevPhase !== "over") { say(s.w === me ? "YOU WIN THE MATCH!" : `${nameOf(s.w)} wins the match`, 4); sfx(s.w === me ? "shard" : "hurt"); }
    prevPhase = s.ph; if (s.ph !== "over") $("arenaLobby").classList.remove("on");
    $("arScore").textContent = s.p.map(p => `${nameOf(p[0])}: ${"★".repeat(p[7])}`).join("   ·   ");
  }

  async function open(joinCode) {
    if (!arena) arena = await buildArena(scene);
    code = joinCode || await newRoomCode();
    const link = `${location.origin}${location.pathname}?room=${code}`;
    $("arCodeLine").textContent = `Room ${code}`; $("arLink").value = link; { const q = new URLSearchParams(location.search); q.set("room", code); history.replaceState(null, "", "?" + q); }
    conn = joinRoom(code, { name: `Chog #${token}`, token }, onMsg);
    getJSON("/config").then(c => { if (!c.staking) { $("arStake").style.display = "none"; $("arDaily").insertAdjacentHTML("afterend", `<p class="muted" style="font-size:12px">💰 Chog and $CHOG stakes go live on Monad mainnet soon — fights here are just for glory (and your Chronicle).</p>`); } }).catch(() => {});
    getJSON("/daily").then(q => { $("arDaily").innerHTML = `🔥 Today's quest: <b>${q.text}</b>${holder ? "" : " — holders only (connect your wallet)"}`; }).catch(() => {});
    $("arenaLobby").classList.add("on"); $("arHud").classList.add("on");
    rig.pinned = null; rig.yaw = Math.PI; rig.pitch = 0.5; rig.dist = 22;
  }
  // ---- stakes: winner takes both Chogs (ChogArena escrow; the room signs the result) ----
  const short = a => a ? a.slice(0, 6) + "…" + a.slice(-4) : "";
  const stakeMsg = t => { $("arStakeInfo").textContent = t; };
  function renderStake() {
    const show = (id, on) => { $(id).style.display = on ? "" : "none"; };
    ["arOpen", "arPotRow", "arMatch", "arClaim", "arCancel", "arRefund"].forEach(id => show(id, false));
    if (busy) return;
    if (!stake) { show("arOpen", true); show("arPotRow", true); return stakeMsg((note ? note + " " : "") + `Optional stake, winner takes all: escrow Chog #${token} (winner gets both Chogs), or a $CHOG pot (holders only).`); }
    const S = stake.state, isPot = stake.pot && stake.pot !== "0", potTxt = isPot ? `${stakeApi.fromWei(stake.pot)} $CHOG each` : "";
    if (result || stake.settled) { show("arClaim", true); return stakeMsg(`${short(result ? result.winner : "")} won the pot (${isPot ? `${stakeApi.fromWei(BigInt(stake.pot) * 2n)} $CHOG` : `Chog #${stake.t1} + Chog #${stake.t2}`}). Claiming pays the winner.`); }
    if (S === 1) { const mineOpen = wallet && wallet === stake.p1.toLowerCase(); show(mineOpen ? "arCancel" : "arMatch", true);
      $("arMatch").textContent = isPot ? `Match the pot (${stakeApi.fromWei(stake.pot)} $CHOG)` : "Match the stake";
      return stakeMsg(isPot ? (mineOpen ? `You staked ${potTxt}. Waiting for a challenger…` : `A $CHOG pot is open: ${potTxt}. Match it — winner takes all.`)
        : mineOpen ? `You staked Chog #${stake.t1}. Waiting for a challenger to match it…` : `Chog #${stake.t1} is on the line. Match it with your Chog #${token} — winner takes both.`); }
    if (S === 2) { show("arRefund", true); return stakeMsg(`Pot locked: ${isPot ? `${stakeApi.fromWei(BigInt(stake.pot) * 2n)} $CHOG` : `Chog #${stake.t1} vs Chog #${stake.t2}`}. Winner takes all. (Refund opens 6 h after locking if no result.)`); }
    stakeMsg("This stake is finished.");
  }
  async function act(label, fn) {
    if (busy) return; busy = true; renderStake(); stakeMsg(label + " — confirm in your wallet…");
    try { wallet = await stakeApi.account(); await fn(); }
    catch (e) { stakeMsg((e && (e.message || e.reason)) || String(e)); busy = false; return; }
    busy = false; renderStake();
  }
  const bind = async matchId => { const sig = await stakeApi.signBind(wallet, stakeApi.bindMessage(code, matchId, me, wallet)); conn.send({ t: "stake", matchId, address: wallet, sig }); };
  $("arOpen").onclick = () => act("Escrowing your Chog", async () => { const id = await stakeApi.openMatch(wallet, token); await bind(id); });
  $("arMatch").onclick = () => act("Matching the stake", async () => {
    if (stake.pot && stake.pot !== "0") await stakeApi.joinPot(wallet, stake.matchId, BigInt(stake.pot)); else await stakeApi.joinMatch(wallet, stake.matchId, token);
    await bind(stake.matchId); });
  $("arPot").onclick = () => act("Staking $CHOG", async () => { const id = await stakeApi.openPot(wallet, stakeApi.toWei($("arPotAmt").value || "0")); await bind(id); });
  $("arCancel").onclick = () => act("Cancelling", async () => { await stakeApi.cancelMatch(wallet, stake.matchId); stake = null; });
  $("arRefund").onclick = () => act("Refunding", async () => { const m = await stakeApi.readMatch(stake.matchId); if (Date.now() / 1000 <= m.lockedAt + 6 * 3600) throw new Error("Refund opens 6 hours after the pot locked."); await stakeApi.refundMatch(wallet, stake.matchId); });
  $("arClaim").onclick = () => act("Sending the pot to the winner", async () => { const m = await stakeApi.readMatch(result.matchId); if (m.state !== 3) await stakeApi.settleMatch(wallet, result.matchId, result.winner, result.sig); paid = result.matchId; note = `Pot paid out to ${short(result.winner)}!`; stake = null; result = null; });

  function leave() { conn && conn.close(); onLeave(); }
  $("arStart").onclick = () => conn && conn.send({ t: "start" });
  $("arCopy").onclick = async () => { try { await navigator.clipboard.writeText($("arLink").value); $("arCopy").textContent = "Copied!"; } catch { $("arLink").select(); } };
  $("arLeave").onclick = leave;

  // interpolated player state at render time
  function sample() {
    const t = clock - DELAY; let a = snaps[0], b = snaps[snaps.length - 1];
    for (let i = 0; i < snaps.length - 1; i++) if (snaps[i].at <= t && snaps[i + 1].at >= t) { a = snaps[i]; b = snaps[i + 1]; break; }
    if (!a) return null; const k = b.at > a.at ? Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at))) : 1;
    const prev = new Map(a.s.p.map(p => [p[0], p]));
    return { s: b.s, p: b.s.p.map(q => { const o = prev.get(q[0]) || q; const L = i => o[i] + (q[i] - o[i]) * k;
      let dh = q[4] - o[4]; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      return { id: q[0], x: L(1), y: L(2), z: L(3), h: o[4] + dh * k, alive: q[5], spin: q[6], wins: q[7], speed: q[8] }; }) };
  }

  const tmp = new THREE.Vector3();
  function frame(dt, input, keys) {
    clock += dt; if (!arena) return;
    if (banner.t > 0 && (banner.t -= dt) <= 0) $("arBanner").classList.remove("on");
    // inputs: camera-relative stick -> world direction (the same mapping the solo game uses)
    const yaw = rig.moveYaw(), sn = Math.sin(yaw), cs = Math.cos(yaw);
    const wx = input.mz * sn - input.mx * cs, wz = input.mz * cs + input.mx * sn;
    if (conn && (clock - lastSend > 0.05 || input.jumpPressed || input.spinPressed)) { conn.send({ t: "in", mx: wx, mz: wz, run: input.run, jump: input.jumpPressed, spin: input.spinPressed }); lastSend = clock; }
    const st = sample(); let focus = tmp.set(0, 0, 0);
    if (st) {
      arena.setRadius(st.s.R);
      for (const p of st.p) {
        const v = chogs.get(p.id); if (!v || !v.c) continue;
        const r = v.c.root; r.visible = p.y > -14; r.position.set(p.x, p.y - FOOT_Y, p.z); r.rotation.y = p.h + (p.spin ? clock * 22 : 0);
        v.c.update(dt, p.speed, p.y > 0.2 || !p.alive);
        if (p.id === me) focus = tmp.set(p.x, Math.max(p.y, -2), p.z);
        const sp = new THREE.Vector3(p.x, p.y + 5.6, p.z).project(camera), on = sp.z < 1 && r.visible;
        v.tag.style.display = on && p.alive ? "" : "none"; v.tag.textContent = (p.id === me ? "You" : nameOf(p.id)) + (p.wins ? " " + "★".repeat(p.wins) : "");
        if (on) v.tag.style.transform = `translate(${(sp.x + 1) / 2 * innerWidth}px, ${(1 - sp.y) / 2 * innerHeight}px) translate(-50%, -100%)`;
      }
    } else if (chogs.get(me)) { const r = chog.root; r.position.set(0, -FOOT_Y, 0); chog.update(dt, 0); }
    arena.update(clock);
    rig.update(dt, focus, keys);
    gfx.render(allParts());
  }
  return { open, frame, leave };
}
