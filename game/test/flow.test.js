import { test } from "node:test";
import assert from "node:assert/strict";
import { createFlow } from "../chapters/ch1flow.js";

test("starts at intro, talk starts explore", () => {
  const f = createFlow(); assert.equal(f.phase, "intro"); f.talked(); assert.equal(f.phase, "explore");
});
test("three different shards -> return to the Doctor", () => {
  const f = createFlow(); f.talked();
  f.shard("swamp"); f.shard("swamp"); assert.equal(f.shards.size, 1); assert.equal(f.phase, "explore");
  f.shard("graveyard"); f.shard("ruin"); assert.equal(f.phase, "return");
});
test("talking to the Doctor with 3 shards starts the chase; portal completes", () => {
  const f = createFlow(); f.talked(); ["swamp", "graveyard", "ruin"].forEach(s => f.shard(s));
  f.talked(); assert.equal(f.phase, "chase"); f.portal(); assert.equal(f.phase, "complete");
});
test("portal does nothing before the chase", () => {
  const f = createFlow(); f.talked(); f.portal(); assert.equal(f.phase, "explore");
});
test("objective text follows the phase", () => {
  const f = createFlow(); f.talked(); assert.match(f.objective(), /0\/3/); f.shard("ruin"); assert.match(f.objective(), /1\/3/);
});
test("shards picked up before talking to the Doctor still count", () => {
  const f = createFlow(); f.shard("swamp"); assert.equal(f.shards.size, 1); f.talked(); assert.equal(f.phase, "explore");
  f.shard("graveyard"); f.shard("ruin"); assert.equal(f.phase, "return");
});
test("all 3 shards before the first talk -> talking goes straight to return", () => {
  const f = createFlow(); ["swamp", "graveyard", "ruin"].forEach(s => f.shard(s)); f.talked(); assert.equal(f.phase, "return");
});
