import { test } from "node:test";
import assert from "node:assert/strict";
import { createEnemy, stepEnemy, SEE, STRIKE, WINDUP } from "../enemy.js";

const far = { x: 100, y: 0, z: 100 };
const at = (e, d) => ({ x: e.x + d, y: 0, z: e.z });       // player d units from the enemy along x

test("patrols between its two points when the player is far", () => {
  let e = createEnemy({ a: { x: 0, z: 0 }, b: { x: 10, z: 0 } });
  for (let i = 0; i < 100; i++) e = stepEnemy(e, far, 0.05).enemy;
  assert.equal(e.state, "patrol"); assert.ok(e.x > 0.5);
});
test("sees the player inside SEE and chases", () => {
  let e = createEnemy({ a: { x: 0, z: 0 }, b: { x: 10, z: 0 } });
  e = stepEnemy(e, at(e, SEE - 1), 0.05).enemy; assert.equal(e.state, "chase");
});
test("winds up inside STRIKE, then lunges after WINDUP", () => {
  let e = createEnemy({ a: { x: 0, z: 0 }, b: { x: 10, z: 0 } });
  e = stepEnemy(e, at(e, STRIKE - 0.5), 0.05).enemy; assert.equal(e.state, "windup");
  let r; for (let t = 0; t <= WINDUP + 0.05; t += 0.05) r = stepEnemy(r ? r.enemy : e, at(r ? r.enemy : e, STRIKE - 0.5), 0.05);
  assert.equal(r.enemy.state, "lunge");
});
test("a lunge that reaches the player reports a hit once", () => {
  let e = { ...createEnemy({ a: { x: 0, z: 0 }, b: { x: 10, z: 0 } }), state: "lunge", t: 0, dirX: 1, dirZ: 0 };
  const p = at(e, 1.5); let hits = 0;
  for (let i = 0; i < 10; i++) { const r = stepEnemy(e, p, 0.05); e = r.enemy; if (r.hitPlayer) hits++; }
  assert.equal(hits, 1);
});
test("dead enemies stay dead and never hit", () => {
  let e = { ...createEnemy({ a: { x: 0, z: 0 }, b: { x: 10, z: 0 } }), state: "dead" };
  const r = stepEnemy(e, at(e, 0.5), 0.05); assert.equal(r.enemy.state, "dead"); assert.equal(r.hitPlayer, false);
});
test("loses interest when the player gets far away", () => {
  let e = { ...createEnemy({ a: { x: 0, z: 0 }, b: { x: 10, z: 0 } }), state: "chase" };
  e = stepEnemy(e, far, 0.05).enemy; assert.equal(e.state, "return");
});
