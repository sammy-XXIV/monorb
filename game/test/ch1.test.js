import { test } from "node:test";
import assert from "node:assert/strict";
import { createCh1, GOAL_Z } from "../chapters/ch1.js";

const R = (o = {}) => ({ maxHits: 4, revive: false, ...o });
const far = { x: 99, z: 0 };                                   // player far from every creature
const onCreature = c => ({ x: c.state.creatures[0].x, z: c.state.creatures[0].z });

test("reaching the goal completes", () => {
  const c = createCh1(R()); assert.deepEqual(c.step(0.016, { x: 0, z: GOAL_Z }), ["complete"]);
});
test("maxHits touches -> fail", () => {
  const c = createCh1(R()); let ev = [];
  for (let i = 0; i < 4; i++) { ev = c.step(0.016, onCreature(c)); c.step(1.1, far); }   // wait out invulnerability between hits
  assert.ok(ev.includes("fail")); assert.equal(c.state.hits, 4);
});
test("revive once, then fail", () => {
  const c = createCh1(R({ revive: true })); let all = [];
  for (let i = 0; i < 8; i++) { all = all.concat(c.step(0.016, onCreature(c))); c.step(1.1, far); }
  assert.equal(all.filter(e => e === "revive").length, 1); assert.ok(all.includes("fail"));
});
test("two touches inside the invulnerability window count once", () => {
  const c = createCh1(R()); c.step(0.016, onCreature(c)); c.step(0.016, onCreature(c)); assert.equal(c.state.hits, 1);
});
test("reset restores hits, revive and creature positions", () => {
  const c = createCh1(R({ revive: true })), start = JSON.stringify(c.state.creatures);
  for (let i = 0; i < 3; i++) { c.step(0.5, onCreature(c)); c.step(1.1, far); }
  c.reset();
  assert.equal(c.state.hits, 0); assert.equal(c.state.reviveUsed, false); assert.equal(JSON.stringify(c.state.creatures), start);
});
test("a hit knocks the player back 2 units", () => {
  const c = createCh1(R()), p = onCreature(c); const ev = c.step(0.016, p);
  assert.ok(ev.includes("hit")); assert.equal(c.state.knockback, -2);
});
