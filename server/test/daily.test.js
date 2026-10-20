import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTS, dayKey, questFor, applyDaily, matchStats } from "../src/daily.js";
import { emptyRecord } from "../src/chronicle.js";

const D1 = Date.UTC(2026, 9, 19, 12), D2 = D1 + 864e5, D4 = D1 + 3 * 864e5;
const win = { won: true, kos: 2, falls: 0, roundsWon: 3 }, loss = { won: false, kos: 0, falls: 3, roundsWon: 0 };
const quest = id => QUESTS.find(q => q.id === id);

test("one quest per UTC day, the same for everyone, and it changes", () => {
  assert.equal(dayKey(D1), "2026-10-19"); assert.deepEqual(questFor("2026-10-19"), questFor("2026-10-19"));
  const days = new Set(Array.from({ length: 14 }, (_, i) => questFor(dayKey(D1 + i * 864e5)).id)); assert.ok(days.size >= 3);
});
test("match stats map to quest stats", () => {
  assert.deepEqual(matchStats(win), { matches: 1, matchWins: 1, kos: 2, flawless: 1, roundsWon: 3 });
  assert.deepEqual(matchStats(loss), { matches: 1, matchWins: 0, kos: 0, flawless: 0, roundsWon: 0 });
});
test("progress accumulates until the goal, completes once, starts a streak", () => {
  let r = emptyRecord(1), out;
  const q = { id: "play3", stat: "matches", goal: 3 };
  for (let i = 0; i < 2; i++) ({ rec: r, completed: out } = applyDaily(r, matchStats(loss), D1, q));
  assert.equal(out, false); assert.equal(r.daily.progress, 2);
  ({ rec: r, completed: out } = applyDaily(r, matchStats(loss), D1, q)); assert.equal(out, true); assert.equal(r.streak.count, 1);
  ({ rec: r, completed: out } = applyDaily(r, matchStats(loss), D1, q)); assert.equal(out, false, "only once a day"); assert.equal(r.streak.count, 1);
});
test("consecutive days grow the streak; a missed day resets it", () => {
  const q = { id: "win1", stat: "matchWins", goal: 1 }; let r = emptyRecord(1);
  r = applyDaily(r, matchStats(win), D1, q).rec; r = applyDaily(r, matchStats(win), D2, q).rec; assert.equal(r.streak.count, 2);
  r = applyDaily(r, matchStats(win), D4, q).rec; assert.equal(r.streak.count, 1);
});
test("a new day resets yesterday's unfinished progress", () => {
  const q = { id: "rounds5", stat: "roundsWon", goal: 5 }; let r = emptyRecord(1);
  r = applyDaily(r, matchStats(win), D1, q).rec; assert.equal(r.daily.progress, 3);
  r = applyDaily(r, matchStats(loss), D2, q).rec; assert.equal(r.daily.progress, 0); assert.equal(r.daily.day, "2026-10-20");
});
