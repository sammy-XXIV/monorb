import { test } from "node:test";
import assert from "node:assert/strict";
import { createRaft, stepRaft, EAST, WEST } from "../chapters/raft.js";

const ride = (r, on, px, secs) => { for (let i = 0; i < secs * 60; i++) r = stepRaft(r, on, px, 1 / 60); return r; };

test("waits at the east dock until you board", () => {
  assert.equal(ride(createRaft(), false, -30, 5).x, EAST);
});
test("boarding at the east dock sails to the west rock and stops there", () => {
  const r = ride(createRaft(), true, EAST, 30); assert.equal(r.x, WEST); assert.equal(r.vx, 0);
});
test("a jump on board (briefly off) does not turn the raft around", () => {
  let r = ride(createRaft(), true, EAST, 3); const x = r.x; r = ride(r, false, x, 0.8); r = ride(r, true, r.x, 1);
  assert.ok(r.x < x - 5, `kept going west: ${r.x}`);
});
test("knocked off mid-swamp and respawned on the east bank: raft comes back to fetch you", () => {
  let r = ride(createRaft(), true, EAST, 5); r = ride(r, false, -34, 30); assert.equal(r.x, EAST);
});
test("boarding at the west rock sails back east", () => {
  let r = ride(createRaft(), true, EAST, 30); r = ride(r, false, -123, 3); r = ride(r, true, WEST, 30); assert.equal(r.x, EAST);
});
