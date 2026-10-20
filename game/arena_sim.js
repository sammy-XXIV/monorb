// Bonk Arena simulation: pure and deterministic, so the server can run the fight (clients only send inputs) and tests can drive it.
// Shared by server/ (Durable Object) and game/ (client, for rendering constants).
export const R0 = 16, R_MIN = 7, SHRINK_FROM = 15, SHRINK_TIME = 45, WINS_TO_WIN = 3, COUNTDOWN = 3, ROUND_GAP = 4;
const WALK = 9, RUN = 13, ACCEL = 60, AIR_ACCEL = 25, JUMP_V = 13, GRAVITY = -30, FRICTION = 6;
const SPIN_T = 0.4, SPIN_CD = 0.8, SPIN_R = 3.4, KNOCK = 24, BODY_R = 1.0, OUT_Y = -12;
const BASE_PERKS = { reach: 1, power: 1, weight: 1, speed: 1, cd: 1, gravity: 1, shield: false, airJump: false };

// a Chog's traits shape its fighting style; small edges (<=20%), and at most the 2 rarest perks so stacking can't decide a match
const PERKS = [   // rarest first: a Chog keeps its first 2 matches
  ["Air Jump", t => ["Rare", "Epic", "Legendary"].includes(t.Tier), p => { p.airJump = true; }],
  ["Royal Power", (t, head) => /crown|wizard/.test(head), p => { p.power = 1.12; }],
  ["Heavy", (t, head) => /spartan|russian|plumber/.test(head), p => { p.weight = 1.25; p.speed = 0.95; }],
  ["Laser Bonk", (t, head, eyes) => /laser/.test(eyes), p => { p.reach = 1.2; }],
  ["Target Lock", (t, head, eyes) => !/laser/.test(eyes) && /visor|vr|glass/.test(eyes), p => { p.cd = 0.85; }],
  ["Aura Shield", t => !!t.Aura && t.Aura !== "Clean", p => { p.shield = true; }],
  ["Quick", (t, head) => !/crown|wizard|spartan|russian|plumber/.test(head) && /cap|beanie|bucket/.test(head), p => { p.speed = 1.08; }],
  ["Floaty", t => t.Body === "Duck Float", p => { p.gravity = 0.8; }],
];
export const MAX_PERKS = 2;
export function arenaPerks(t = {}) {
  const p = { ...BASE_PERKS, tags: [] }, eyes = (t.Eyes || "").toLowerCase(), head = (t.Head || "").toLowerCase();
  for (const [tag, has, apply] of PERKS) if (p.tags.length < MAX_PERKS && has(t, head, eyes)) { apply(p); p.tags.push(tag); }
  return p;
}
const clamp1 = v => (Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);

export function createArena(seed = 1) {
  return { phase: "lobby", t: 0, round: 0, radius: R0, players: {}, order: [], winner: null, lastRoundWinner: null, seed };
}
export function addPlayer(s, id, meta = {}) {
  if (s.players[id] || s.order.length >= 4) return false;
  s.players[id] = { id, meta, perks: { ...BASE_PERKS, ...(meta.perks || {}) }, shield: false, airUsed: false, kos: 0, falls: 0, roundsWon: 0, lastHit: null, lastHitT: 0, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, kx: 0, kz: 0, heading: 0, alive: false, spinT: 0, spinCd: 0, hit: [], wins: 0, jumpHeld: false };
  s.order.push(id); return true;
}
export function removePlayer(s, id) {
  if (!s.players[id]) return; delete s.players[id]; s.order = s.order.filter(o => o !== id);
  if (s.phase === "fight" || s.phase === "countdown") checkRoundEnd(s, true);
}
export function startMatch(s) {
  for (const id of s.order) Object.assign(s.players[id], { wins: 0, kos: 0, falls: 0, roundsWon: 0 });
  s.winner = null; s.round = 0; newRound(s);
}
function newRound(s) {
  s.round++; s.phase = "countdown"; s.t = 0; s.radius = R0; s.lastRoundWinner = null;
  s.order.forEach((id, i) => { const p = s.players[id], a = i / s.order.length * Math.PI * 2 + 0.4;
    Object.assign(p, { x: Math.cos(a) * R0 * 0.55, z: Math.sin(a) * R0 * 0.55, y: 0, vx: 0, vz: 0, vy: 0, kx: 0, kz: 0, alive: true, spinT: 0, spinCd: 0, hit: [], shield: p.perks.shield, airUsed: false, lastHit: null, heading: Math.atan2(-Math.cos(a), -Math.sin(a)) }); });
}
function checkRoundEnd(s, forfeit = false) {
  const alive = s.order.filter(id => s.players[id].alive);
  if (s.phase !== "fight" && !forfeit) return;
  if (alive.length > 1 || (s.order.length > 1 && alive.length === s.order.length && !forfeit)) return;
  const w = alive.length === 1 ? alive[0] : null;
  s.lastRoundWinner = w; if (w) { s.players[w].wins++; s.players[w].roundsWon++; }
  if (w && s.players[w].wins >= WINS_TO_WIN || s.order.length < 2) { s.phase = "over"; s.winner = w; }
  else { s.phase = "roundover"; s.t = 0; }
}

// inputs: { [id]: { mx, mz (world-space move, -1..1), run, jump, spin } } — anything else is ignored
export function step(s, inputs, dt) {
  s.t += dt;
  if (s.phase === "countdown") { if (s.t >= COUNTDOWN) { s.phase = "fight"; s.t = 0; } return s; }
  if (s.phase === "roundover") { if (s.t >= ROUND_GAP) newRound(s); return s; }
  if (s.phase !== "fight") return s;
  s.radius = s.t < SHRINK_FROM ? R0 : Math.max(R_MIN, R0 - (R0 - R_MIN) * (s.t - SHRINK_FROM) / SHRINK_TIME);
  const ids = s.order;
  for (const id of ids) {
    const p = s.players[id], inp = inputs[id] || {};
    p.spinCd = Math.max(0, p.spinCd - dt); p.spinT = Math.max(0, p.spinT - dt);
    if (!p.alive) continue;
    let mx = clamp1(inp.mx), mz = clamp1(inp.mz); const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
    const onFloor = p.y <= 0 && Math.hypot(p.x, p.z) <= s.radius + BODY_R * 0.5;
    const K = p.perks, sp = (inp.run ? RUN : WALK) * K.speed, a = (onFloor ? ACCEL : AIR_ACCEL) * dt;
    p.vx += Math.max(-a, Math.min(a, mx * sp - p.vx)); p.vz += Math.max(-a, Math.min(a, mz * sp - p.vz));
    if (Math.hypot(mx, mz) > 0.05) p.heading = Math.atan2(mx, mz);
    if (onFloor) p.airUsed = false;
    if (inp.jump && !p.jumpHeld && (onFloor || (K.airJump && !p.airUsed && p.y > 0.3))) { if (!onFloor) p.airUsed = true; p.vy = JUMP_V; } p.jumpHeld = !!inp.jump;
    if (inp.spin && p.spinCd === 0) { p.spinT = SPIN_T; p.spinCd = SPIN_CD * K.cd; p.hit = []; }
    if (onFloor && p.vy <= 0) { p.vy = 0; p.y = 0; } else p.vy += GRAVITY * K.gravity * dt;
    const f = Math.max(0, 1 - dt * (onFloor ? FRICTION : 1)); p.kx *= f; p.kz *= f;
    p.x += (p.vx + p.kx) * dt; p.z += (p.vz + p.kz) * dt; p.y += p.vy * dt;
    if (p.y < 0 && Math.hypot(p.x, p.z) <= s.radius + BODY_R * 0.5 && p.y > -1) { p.y = 0; p.vy = 0; }   // landed back on the platform
    if (p.y < OUT_Y) { p.alive = false; p.falls++;   // knocked off within 4 s of a hit: the hitter gets the knockout
      const by = p.lastHit && s.players[p.lastHit]; if (by && s.t - p.lastHitT < 4) by.kos++; }
  }
  // spin hits: the server decides who got bonked
  for (const id of ids) { const p = s.players[id]; if (!p.alive || p.spinT <= 0) continue;
    for (const oid of ids) { if (oid === id || p.hit.includes(oid)) continue; const o = s.players[oid]; if (!o.alive) continue;
      const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
      if (d < SPIN_R * p.perks.reach && Math.abs(o.y - p.y) < 2.5) { const n = d || 1, k = KNOCK * p.perks.power / o.perks.weight * (o.shield ? 0.5 : 1); o.shield = false;
        o.kx = dx / n * k; o.kz = dz / n * k; o.vy = Math.max(o.vy, 8); p.hit.push(oid); o.lastHit = id; o.lastHitT = s.t; } } }
  // bodies don't overlap
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const a = s.players[ids[i]], b = s.players[ids[j]]; if (!a.alive || !b.alive) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = BODY_R * 2; if (d > 0 && d < m && Math.abs(a.y - b.y) < 2) { const k = (m - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; } }
  checkRoundEnd(s);
  return s;
}

// what clients need each tick (small, rounded)
export function snapshot(s) {
  const r = v => Math.round(v * 100) / 100;
  return { ph: s.phase, t: r(s.t), rd: s.round, R: r(s.radius), w: s.winner, lw: s.lastRoundWinner,
    p: s.order.map(id => { const p = s.players[id]; return [id, r(p.x), r(p.y), r(p.z), r(p.heading), p.alive ? 1 : 0, p.spinT > 0 ? 1 : 0, p.wins, r(Math.hypot(p.vx, p.vz))]; }) };
}
