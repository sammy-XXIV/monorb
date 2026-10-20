import { test } from "node:test";
import assert from "node:assert/strict";
import { stepPlayer } from "../controller.js";

const P0 = () => ({ x: 0, z: 0, y: 0, vy: 0, heading: 0, speed: 0 });
const run = (input, steps, dt = 0.05) => { let p = P0(); for (let i = 0; i < steps; i++) p = stepPlayer(p, input, dt); return p; };

test("no input stays put", () => { const p = run({ fx: 0, fz: 0 }, 20); assert.equal(p.x, 0); assert.equal(p.z, 0); assert.equal(p.speed, 0); });
test("walk 1 s forward is 4 units", () => assert.ok(Math.abs(run({ fx: 0, fz: 1 }, 20).z - 4) < 0.01));
test("run doubles it", () => assert.ok(Math.abs(run({ fx: 0, fz: 1, run: true }, 20).z - 8) < 0.01));
test("jump rises and lands, never below ground", () => {
  let p = stepPlayer(P0(), { fx: 0, fz: 0, jump: true }, 0.05), peak = 0;
  for (let i = 0; i < 60; i++) { p = stepPlayer(p, { fx: 0, fz: 0 }, 0.05); peak = Math.max(peak, p.y); assert.ok(p.y >= 0); }
  assert.ok(peak > 1); assert.equal(p.y, 0);
});
test("dt is clamped to 0.05", () => assert.deepEqual(stepPlayer(P0(), { fx: 0, fz: 1 }, 2), stepPlayer(P0(), { fx: 0, fz: 1 }, 0.05)));
