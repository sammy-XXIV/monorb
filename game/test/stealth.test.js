import { test } from "node:test";
import assert from "node:assert/strict";
import { createGuard, stepGuard, canSee, seesCones } from "../engine/stealth.js";

const G = () => createGuard({ path: [[0, 0], [10, 0]], speed: 3, range: 12, angle: 0.6, turn: 0.5 });

test("a guard walks its path back and forth and faces where it is going", () => {
  const g = G(); for (let i = 0; i < 30; i++) stepGuard(g, 0.1); assert.ok(g.x > 4 && g.x < 10.5, `x=${g.x}`); assert.ok(Math.abs(g.heading - Math.PI / 2) < 0.4, "faces +x");
  for (let i = 0; i < 80; i++) stepGuard(g, 0.1); assert.ok(g.x < 8, "turned back toward the start");
});
test("a guard pauses at each end of its path", () => {
  const g = createGuard({ path: [[0, 0], [3, 0]], speed: 3, range: 10, angle: 0.5, turn: 1 }); let at = 0;
  for (let i = 0; i < 30; i++) { stepGuard(g, 0.1); if (Math.abs(g.x - 3) < 0.05) at++; } assert.ok(at >= 4, `paused ${at} ticks at the end`);
});
test("seen inside the cone and range, not outside", () => {
  const g = G(); g.x = 0; g.z = 0; g.heading = Math.PI / 2;   // facing +x
  assert.equal(canSee(g, 6, 0, { run: true }), true);
  assert.equal(canSee(g, 6, 5, { run: true }), false, "outside the angle");
  assert.equal(canSee(g, 20, 0, { run: true }), false, "too far");
  assert.equal(canSee(g, -6, 0, { run: true }), false, "behind the guard");
});
test("walking or standing still shrinks what a guard notices (running is loud)", () => {
  const g = G(); g.x = 0; g.z = 0; g.heading = Math.PI / 2;
  assert.equal(canSee(g, 10, 0, { run: true }), true); assert.equal(canSee(g, 10, 0, { run: false }), false, "walking: range x0.65");
  assert.equal(canSee(g, 6, 0, { run: false }), true); assert.equal(canSee(g, 6, 0, { run: false, still: true }), false, "standing still: range x0.35");
});
test("only visor / glass / laser eyes see the cones", () => {
  assert.equal(seesCones({ Eyes: "Purple laser" }), true); assert.equal(seesCones({ Eyes: "Anime Glass" }), true); assert.equal(seesCones({ Eyes: "Gradient visor" }), true); assert.equal(seesCones({ Eyes: "Modern VR" }), true);
  assert.equal(seesCones({ Eyes: "Happy" }), false); assert.equal(seesCones({}), false);
});
