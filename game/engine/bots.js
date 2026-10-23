// Opponent / ally brains for story fights: they read the arena sim and return the same inputs a player sends. Pure (given an rng).
import { SPIN_R, R0 } from "../arena_sim.js";

// opts: react (s, delay before a strike once in range), aggr (0..1 chance to press on), passive (a training dummy), dodge (0..1)
export function makeBrain(opts = {}) {
  let seed = (opts.seed || 7) >>> 0;
  return { react: 0.25, aggr: 0.85, dodge: 0.25, passive: false, ...opts, wait: 0, think: 0, mood: 1, rng: () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 };
}

export function botInput(s, id, br, dt) {
  const me = s.players[id], idle = { mx: 0, mz: 0, run: false, jump: false, spin: false, slam: false };
  if (!me || !me.alive || br.passive || s.phase !== "fight") return idle;
  const myTeam = me.meta.team || id, edge = s.radius - 2.6, r = Math.hypot(me.x, me.z);
  const foes = s.order.map(o => s.players[o]).filter(o => o.alive && (o.meta.team || o.id) !== myTeam);
  // staying on the platform comes first
  if (r > edge) { const n = r || 1; return { ...idle, mx: -me.x / n, mz: -me.z / n, run: true }; }
  if (!foes.length) return { ...idle, mx: -me.x / (r || 1) * 0.4, mz: -me.z / (r || 1) * 0.4 };
  let t = foes[0], td = Infinity; for (const f of foes) { const d = Math.hypot(f.x - me.x, f.z - me.z); if (d < td) { td = d; t = f; } }
  br.think -= dt; if (br.think <= 0) { br.think = 0.6 + br.rng() * 0.8; br.mood = br.rng() < br.aggr ? 1 : 0; }   // now and then a bot hesitates
  const dx = t.x - me.x, dz = t.z - me.z, n = td || 1, reach = SPIN_R * me.perks.reach + me.perks.body + t.perks.body - 2, inRange = td < reach * 0.92;
  let spin = false, mx = dx / n, mz = dz / n, run = td > reach * 2;
  if (inRange) {
    if (br.wait <= 0 && me.spinCd === 0) { br.wait = br.react * (0.8 + br.rng() * 0.6); }   // see them, take a beat, then swing
    if (br.wait > 0) { br.wait -= dt; if (br.wait <= 0 && me.spinCd === 0) spin = true; }
    mx *= 0.15; mz *= 0.15;   // plant and swing
  } else if (!br.mood) { mx *= 0.3; mz *= 0.3; }
  if (t.spinT > 0.15 && td < reach * 1.05 && br.rng() < br.dodge * dt * 6) { mx = -dx / n; mz = -dz / n; run = true; }   // back off from a swing
  // don't walk off chasing an enemy near the rim
  if (r > edge - 1.4 && (me.x * dx + me.z * dz) > 0) { mx *= 0.2; mz *= 0.2; }
  // a boss with a slam winds it up whenever someone grounded is inside its radius
  if (me.perks.slam && me.slamCd === 0 && me.slamT === 0 && !me.stunT && foes.some(f => Math.hypot(f.x - me.x, f.z - me.z) < me.perks.slam.r * 0.9 && f.y < 1.2)) return { ...idle, slam: true };
  return { mx, mz, run, jump: false, spin };
}

export { R0 };
