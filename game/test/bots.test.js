import { test } from "node:test";
import assert from "node:assert/strict";
import { createArena, addPlayer, startMatch, step, R0 } from "../arena_sim.js";
import { makeBrain, botInput } from "../engine/bots.js";

const arena = (opts = {}) => { const s = createArena(1, { winsToWin: 1, ...opts }); return s; };
const go = s => { startMatch(s); for (let i = 0; i < 95; i++) step(s, {}, 1 / 30); };   // past the countdown
const sim = (s, brains, secs, extra = {}) => { for (let i = 0; i < secs * 30 && s.phase === "fight"; i++) { const inp = { ...extra }; for (const id in brains) inp[id] = botInput(s, id, brains[id], 1 / 30); step(s, inp, 1 / 30); } };

test("a bot walks toward its enemy and spins when in range", () => {
  const s = arena(); addPlayer(s, "b", { team: "foe" }); addPlayer(s, "p", { team: "hero" }); go(s);
  s.players.b.x = -8; s.players.b.z = 0; s.players.p.x = 8; s.players.p.z = 0;
  const brain = makeBrain({ react: 0.05, aggr: 1 }); let spun = false, closer = false; const d0 = 16;
  for (let i = 0; i < 90 && !spun; i++) { const inp = botInput(s, "b", brain, 1 / 30); spun = !!inp.spin; step(s, { b: inp }, 1 / 30); if (Math.hypot(s.players.b.x - s.players.p.x, s.players.b.z - s.players.p.z) < d0 - 3) closer = true; }
  assert.ok(closer, "approached"); assert.ok(spun, "spun once close enough");
});
test("a bot near the edge steers back toward the middle", () => {
  const s = arena(); addPlayer(s, "b", { team: "foe" }); addPlayer(s, "p", { team: "hero" }); go(s);
  s.players.b.x = R0 - 1; s.players.b.z = 0; s.players.p.x = R0 + 2; s.players.p.z = 0;   // enemy beyond the edge: chasing would be suicide
  const inp = botInput(s, "b", makeBrain({}), 1 / 30); assert.ok(inp.mx < -0.3, `moves inward (mx ${inp.mx})`);
});
test("bots ignore teammates", () => {
  const s = arena(); addPlayer(s, "a", { team: "foe" }); addPlayer(s, "m", { team: "foe" }); addPlayer(s, "p", { team: "hero" }); go(s);
  s.players.a.x = 0; s.players.a.z = 0; s.players.m.x = 1.5; s.players.m.z = 0; s.players.p.x = 12; s.players.p.z = 0;
  const inp = botInput(s, "a", makeBrain({ react: 0, aggr: 1 }), 1 / 30); assert.ok(inp.mx > 0.3, "heads for the hero, not the ally next to it");
});
test("a passive dummy never moves or attacks", () => {
  const s = arena(); addPlayer(s, "d", { team: "foe" }); addPlayer(s, "p", { team: "hero" }); go(s);
  const x = s.players.d.x; sim(s, { d: makeBrain({ passive: true }) }, 3); assert.equal(s.players.d.x, x);
});
test("an active bot beats a standing target within 30 s (it can actually win)", () => {
  const s = arena(); addPlayer(s, "b", { team: "foe", perks: { power: 1.1 } }); addPlayer(s, "p", { team: "hero" }); go(s);
  sim(s, { b: makeBrain({ react: 0.2, aggr: 1 }) }, 30); assert.equal(s.phase, "over"); assert.equal(s.winner, "b");
});
test("a bot with a longer reaction time is slower to strike (easier opponent)", () => {
  const firstSpin = react => { const s = arena(); addPlayer(s, "b", { team: "foe" }); addPlayer(s, "p", { team: "hero" }); go(s); s.players.b.x = 0; s.players.b.z = 0; s.players.p.x = 2.5; s.players.p.z = 0;
    const br = makeBrain({ react, aggr: 1 }); for (let i = 0; i < 150; i++) { const inp = botInput(s, "b", br, 1 / 30); if (inp.spin) return i; step(s, { b: inp }, 1 / 30); } return 999; };
  assert.ok(firstSpin(0.9) > firstSpin(0.1) + 10);
});
