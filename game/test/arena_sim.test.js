import { test } from "node:test";
import assert from "node:assert/strict";
import { createArena, addPlayer, removePlayer, startMatch, step, R0, WINS_TO_WIN } from "../arena_sim.js";

const run = (s, inputs, secs) => { for (let i = 0; i < Math.round(secs * 30); i++) step(s, inputs, 1 / 30); return s; };
const two = () => { const s = createArena(1); addPlayer(s, "a"); addPlayer(s, "b"); startMatch(s); run(s, {}, 3.1); return s; };   // past the countdown

test("players spawn on the platform, apart from each other", () => {
  const s = createArena(1); addPlayer(s, "a"); addPlayer(s, "b"); startMatch(s);
  const { a, b } = s.players; assert.ok(Math.hypot(a.x, a.z) < R0 && Math.hypot(b.x, b.z) < R0); assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 6);
});
test("nobody moves during the countdown", () => {
  const s = createArena(1); addPlayer(s, "a"); addPlayer(s, "b"); startMatch(s); const x = s.players.a.x;
  run(s, { a: { mx: 1, mz: 0 } }, 1); assert.equal(s.players.a.x, x); assert.equal(s.phase, "countdown");
});
test("input moves a player during the fight", () => {
  const s = two(), x = s.players.a.x; run(s, { a: { mx: 1, mz: 0 } }, 0.5); assert.ok(s.players.a.x > x + 2);
});
test("inputs are clamped: a cheater can't send a huge move vector", () => {
  const s = two(), x = s.players.a.x; run(s, { a: { mx: 1000, mz: 0, run: true } }, 0.5); assert.ok(s.players.a.x - x < 8, `moved ${s.players.a.x - x}`);
});
test("jump goes up and comes back down", () => {
  const s = two(); step(s, { a: { jump: true } }, 1 / 30); run(s, {}, 0.3); assert.ok(s.players.a.y > 1); run(s, {}, 2); assert.equal(s.players.a.y, 0);
});
test("a spin next to someone knocks them away; out of range does nothing", () => {
  const s = two(), { a, b } = s.players; a.x = 0; a.z = 0; b.x = 2.5; b.z = 0;
  step(s, { a: { spin: true } }, 1 / 30); run(s, {}, 0.3); assert.ok(b.x > 5, `b pushed to ${b.x}`);
  const s2 = two(); s2.players.a.x = 0; s2.players.a.z = 0; s2.players.b.x = 8; s2.players.b.z = 0;
  step(s2, { a: { spin: true } }, 1 / 30); run(s2, {}, 0.3); assert.ok(Math.abs(s2.players.b.x - 8) < 0.5);
});
test("spin has a cooldown: holding spin doesn't machine-gun", () => {
  const s = two(); let spins = 0; for (let i = 0; i < 30; i++) { const before = s.players.a.spinCd; step(s, { a: { spin: true } }, 1 / 30); if (s.players.a.spinCd > before) spins++; }
  assert.ok(spins <= 2, `spins in 1s: ${spins}`);
});
test("walking off the edge falls and is out; last one standing wins the round", () => {
  const s = two(); s.players.a.x = R0 + 3; s.players.a.z = 0; run(s, {}, 2.5);
  assert.equal(s.players.a.alive, false); assert.equal(s.players.b.wins, 1); assert.equal(s.lastRoundWinner, "b");
});
test("rounds restart until someone has WINS_TO_WIN, then the match is over with a winner", () => {
  const s = two();
  for (let r = 0; r < WINS_TO_WIN; r++) { if (s.phase !== "fight") run(s, {}, 6); s.players.a.x = R0 + 3; s.players.a.z = 0; run(s, {}, 2.5); }
  assert.equal(s.phase, "over"); assert.equal(s.winner, "b"); assert.equal(s.players.b.wins, WINS_TO_WIN);
});
test("the platform shrinks during a long round", () => {
  const s = two(), r = s.radius; run(s, {}, 40); assert.ok(s.radius < r - 3);
});
test("a player leaving mid-fight forfeits: the other wins", () => {
  const s = two(); removePlayer(s, "a"); run(s, {}, 0.1); assert.equal(s.lastRoundWinner, "b");
});
test("deterministic: same inputs, same result", () => {
  const go = () => { const s = two(); for (let i = 0; i < 120; i++) step(s, { a: { mx: Math.sin(i / 9), mz: 1, spin: i % 25 === 0 }, b: { mx: -1, mz: Math.cos(i / 7) } }, 1 / 30); return JSON.stringify(s.players); };
  assert.equal(go(), go());
});

// ---- traits shape the fighter ----
import { arenaPerks } from "../arena_sim.js";
const duel = (pa, pb, dist) => { const s = createArena(1); addPlayer(s, "a", { perks: arenaPerks(pa) }); addPlayer(s, "b", { perks: arenaPerks(pb) }); startMatch(s); run(s, {}, 3.1);
  const { a, b } = s.players; a.x = 0; a.z = 0; b.x = dist; b.z = 0; step(s, { a: { spin: true } }, 1 / 30); run(s, {}, 0.5); return { s, a, b }; };
test("perks come from traits", () => {
  assert.deepEqual(arenaPerks({ Eyes: "Purple laser" }).tags, ["Laser Bonk"]);
  assert.ok(arenaPerks({ Head: "Spartan Helmet" }).tags.includes("Heavy"));
  assert.ok(arenaPerks({ Head: "Crown" }).tags.includes("Royal Power"));
  assert.ok(arenaPerks({ Aura: "Fire" }).tags.includes("Aura Shield")); assert.ok(!arenaPerks({ Aura: "Clean" }).tags.includes("Aura Shield"));
  assert.ok(arenaPerks({ Tier: "Rare" }).tags.includes("Air Jump")); assert.ok(!arenaPerks({ Tier: "Common" }).tags.includes("Air Jump"));
  assert.deepEqual(arenaPerks({}).tags, []);
});
test("laser eyes reach further than plain eyes", () => {
  assert.ok(duel({ Eyes: "fire laser" }, {}, 3.9).b.x > 6, "laser hits at 3.9");
  assert.ok(Math.abs(duel({}, {}, 3.9).b.x - 3.9) < 0.6, "plain eyes miss at 3.9");
});
test("heavy helmet takes less knockback; royal crown hits harder", () => {
  const plain = duel({}, {}, 2.5).b.x, heavy = duel({}, { Head: "Spartan Helmet" }, 2.5).b.x, royal = duel({ Head: "Crown" }, {}, 2.5).b.x;
  assert.ok(heavy < plain - 0.5, `heavy ${heavy} vs ${plain}`); assert.ok(royal > plain + 0.3, `royal ${royal} vs ${plain}`);
});
test("aura shield halves the first hit of a round only", () => {
  const { s, a, b } = duel({}, { Aura: "Fire" }, 2.5), first = b.x, plain = duel({}, {}, 2.5).b.x;
  assert.ok(first < plain - 1, `shielded ${first} vs ${plain}`); assert.equal(b.shield, false);
});
test("rare+ Chogs get one air jump, commons don't", () => {
  const peak = traits => { const s = createArena(1); addPlayer(s, "a", { perks: arenaPerks(traits) }); addPlayer(s, "b"); startMatch(s); run(s, {}, 3.1);
    step(s, { a: { jump: true } }, 1 / 30); run(s, {}, 0.35); step(s, { a: { jump: true } }, 1 / 30); let top = 0; for (let i = 0; i < 40; i++) { step(s, {}, 1 / 30); top = Math.max(top, s.players.a.y); } return top; };
  assert.ok(peak({ Tier: "Epic" }) > peak({ Tier: "Common" }) + 1);
});
test("a Chog keeps at most its 2 rarest perks (no stacking 3+)", () => {
  const p = arenaPerks({ Eyes: "Green laser", Head: "Choggie Cap", Aura: "Royal Blue Aura" });   // #167: laser + quick + shield
  assert.deepEqual(p.tags, ["Laser Bonk", "Aura Shield"]); assert.equal(p.speed, 1, "dropped perk has no effect");
  const r = arenaPerks({ Tier: "Legendary", Head: "Crown", Eyes: "fire laser", Aura: "Fire" });
  assert.deepEqual(r.tags, ["Air Jump", "Royal Power"]); assert.equal(r.reach, 1); assert.equal(r.shield, false);
});

// ---- stats the server needs for quests ----
test("a spin that sends someone off the edge credits the spinner with a knockout", () => {
  const s = two(), { a, b } = s.players; a.x = 13; a.z = 0; b.x = 15.5; b.z = 0;   // b right at the edge
  step(s, { a: { spin: true } }, 1 / 30); run(s, {}, 3);
  assert.equal(b.alive, false); assert.equal(a.kos, 1); assert.equal(b.falls, 1);
});
test("walking off on your own is a fall but nobody's knockout", () => {
  const s = two(); s.players.a.x = R0 + 3; s.players.a.z = 0; run(s, {}, 2.5);
  assert.equal(s.players.a.falls, 1); assert.equal(s.players.b.kos, 0);
});
test("round wins and flawless matches are counted", () => {
  const s = two();
  for (let r = 0; r < WINS_TO_WIN; r++) { if (s.phase !== "fight") run(s, {}, 6); s.players.a.x = R0 + 3; s.players.a.z = 0; run(s, {}, 2.5); }
  assert.equal(s.players.b.roundsWon, 3); assert.equal(s.players.b.falls, 0); assert.equal(s.players.a.roundsWon, 0);
});
