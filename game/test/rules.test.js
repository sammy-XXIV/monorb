import { test } from "node:test";
import assert from "node:assert/strict";
import { rulesFor } from "../rules.js";

test("token 1462", () => assert.deepEqual(
  rulesFor({ Skin: "Pink", Side: "Left", Body: "Yellow 143 Jersey", Eyes: "BTC Glass", Head: "MCGA", Accessory: "Fwog", Tier: "Uncommon", Base: "Origin", Form: "Chog" }),
  { maxHits: 4, revive: false, ability: "beam", secret: false, side: "L" }));
test("empty traits -> defaults", () => assert.deepEqual(rulesFor({}), { maxHits: 3, revive: false, ability: "shield", secret: false, side: "R" }));
test("legendary crown 1:1 with aura", () => {
  const r = rulesFor({ Tier: "Legendary", Aura: "Fire", Head: "Crown", Base: "1:1" });
  assert.equal(r.maxHits, 7); assert.equal(r.revive, true); assert.equal(r.ability, "dash"); assert.equal(r.secret, true);
});
test("Clean aura is no revive", () => assert.equal(rulesFor({ Aura: "Clean" }).revive, false));
