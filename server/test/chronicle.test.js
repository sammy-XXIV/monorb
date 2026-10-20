import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyRecord, applyEvent, HISTORY } from "../src/chronicle.js";

test("arena wins and losses count up, newest first", () => {
  let r = emptyRecord(167); r = applyEvent(r, { kind: "arena", won: true, vs: [88] }, 1); r = applyEvent(r, { kind: "arena", won: false, vs: [5] }, 2);
  assert.equal(r.wins, 1); assert.equal(r.losses, 1); assert.equal(r.history[0].vs[0], 5); assert.equal(r.history[1].won, true);
});
test("staked matches record captures and losses", () => {
  let w = applyEvent(emptyRecord(167), { kind: "arena", won: true, vs: [88], staked: true, matchId: 3 }), l = applyEvent(emptyRecord(88), { kind: "arena", won: false, vs: [167], staked: true, matchId: 3 });
  assert.equal(w.captured, 1); assert.equal(l.lostInStake, 1); assert.equal(w.history[0].matchId, "3");
});
test("a chapter is recorded once, in order", () => {
  let r = emptyRecord(1); r = applyEvent(r, { kind: "story", chapter: 2 }); r = applyEvent(r, { kind: "story", chapter: 1 }); r = applyEvent(r, { kind: "story", chapter: 2 });
  assert.deepEqual(r.chapters, [1, 2]); assert.equal(r.history.length, 2);
});
test("bogus events and chapters are ignored", () => {
  const r0 = emptyRecord(1); assert.deepEqual(applyEvent(r0, { kind: "story", chapter: 99 }), r0); assert.deepEqual(applyEvent(r0, { kind: "hack", wins: 1e9 }), r0);
});
test("history is capped", () => {
  let r = emptyRecord(1); for (let i = 0; i < 50; i++) r = applyEvent(r, { kind: "arena", won: true, vs: [2] }, i);
  assert.equal(r.history.length, HISTORY); assert.equal(r.wins, 50);
});
test("applying an event does not mutate the stored record", () => {
  const r0 = emptyRecord(1); applyEvent(r0, { kind: "arena", won: true, vs: [2] }); assert.equal(r0.wins, 0);
});
import { updateBoard, BOARD_SIZE, worldPercent, WORLD_GOAL } from "../src/chronicle.js";
test("board ranks by wins, then captures; a Chog appears once; capped", () => {
  const rec = (token, wins, captured = 0) => ({ ...emptyRecord(token), wins, captured });
  let b = []; b = updateBoard(b, rec(1, 2)); b = updateBoard(b, rec(2, 5)); b = updateBoard(b, rec(3, 2, 1)); b = updateBoard(b, rec(1, 6));
  assert.deepEqual(b.map(r => r.token), [1, 2, 3]); assert.equal(b[0].wins, 6);
  for (let i = 10; i < 120; i++) b = updateBoard(b, rec(i, 1)); assert.equal(b.length, BOARD_SIZE);
});
test("Chogs with nothing yet stay off the board", () => { assert.deepEqual(updateBoard([], emptyRecord(9)), []); });
test("world meter is a capped percent", () => { assert.equal(worldPercent(0), 0); assert.equal(worldPercent(WORLD_GOAL / 2), 50); assert.equal(worldPercent(WORLD_GOAL * 3), 100); });
test("a $CHOG pot win adds the opponent's stake, not a captured Chog", () => {
  let r = applyEvent(emptyRecord(1), { kind: "arena", won: true, vs: [2], staked: true, pot: "100" });
  r = applyEvent(r, { kind: "arena", won: true, vs: [3], staked: true, pot: "50" });
  assert.equal(r.chogWon, "150"); assert.equal(r.captured, 0); assert.equal(r.history[0].pot, "50");
  const l = applyEvent(emptyRecord(2), { kind: "arena", won: false, vs: [1], staked: true, pot: "100" }); assert.equal(l.lostInStake, 0); assert.equal(l.losses, 1);
});
