import { test } from "node:test";
import assert from "node:assert/strict";
import { createFlow2, NEED } from "../chapters/ch2flow.js";

test("first talk with a hero gives the task; talking again before it's done just reminds", () => {
  const f = createFlow2();
  assert.equal(f.talk("moyaki"), "moyaki_ask"); assert.equal(f.heroes.moyaki, "task");
  assert.equal(f.talk("moyaki"), "moyaki_wait"); assert.equal(f.heroes.moyaki, "task");
});
test("bringing what the hero needs finishes them", () => {
  const f = createFlow2(); f.talk("moyaki");
  for (let i = 0; i < NEED.spice; i++) f.item("spice");
  assert.equal(f.talk("moyaki"), "moyaki_done"); assert.equal(f.heroes.moyaki, "done");
  assert.equal(f.talk("moyaki"), "moyaki_after");
});
test("items picked up before meeting the hero still count", () => {
  const f = createFlow2(); for (let i = 0; i < NEED.ring; i++) f.item("ring");
  assert.equal(f.talk("mouch"), "mouch_done_early"); assert.equal(f.heroes.mouch, "done");
});
test("extra items do not overflow the count", () => {
  const f = createFlow2(); for (let i = 0; i < 9; i++) f.item("spice"); assert.equal(f.got.spice, NEED.spice);
});
test("all three heroes done -> gather at the fire -> complete", () => {
  const f = createFlow2();
  for (const [h, k] of [["moyaki", "spice"], ["mouch", "ring"], ["salmonad", "map"]]) { f.talk(h); for (let i = 0; i < NEED[k]; i++) f.item(k); f.talk(h); }
  assert.equal(f.phase, "gather"); assert.match(f.objective(), /campfire/i);
  f.fire(); assert.equal(f.phase, "complete");
});
test("the campfire does nothing before everyone is won over", () => {
  const f = createFlow2(); f.fire(); assert.equal(f.phase, "explore");
});
test("objective names what is left", () => {
  const f = createFlow2(); assert.match(f.objective(), /0\/3/);
  f.talk("moyaki"); assert.match(f.objective(), /spices for moyaki 0\/3/i);
});
test("race timeout resets the rings, but never after the race is won", () => {
  const f = createFlow2(); f.talk("mouch"); f.item("ring"); f.item("ring"); f.reset("ring"); assert.equal(f.got.ring, 0);
  for (let i = 0; i < NEED.ring; i++) f.item("ring"); f.reset("ring"); assert.equal(f.got.ring, NEED.ring);
});
