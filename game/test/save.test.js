import { test } from "node:test";
import assert from "node:assert/strict";
import { saveKey, loadSave, writeSave } from "../save.js";

const DEF = { chapter: 1, done: [], flags: {}, badges: [] };
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };

test("saveKey lowercases the contract", () => assert.equal(saveKey("0xC96D", 7), "monadverse:0xc96d:7"));
test("missing key -> default", () => assert.deepEqual(loadSave(mem(), "k"), DEF));
test("bad JSON -> default", () => { const s = mem(); s.setItem("k", "{bad"); assert.deepEqual(loadSave(s, "k"), DEF); });
test("getItem throws -> default", () => assert.deepEqual(loadSave({ getItem() { throw new Error("blocked"); } }, "k"), DEF));
test("write then load round-trips", () => {
  const s = mem(), d = { chapter: 2, done: [1], flags: { trust: 1 }, badges: ["escaped"] };
  writeSave(s, "k", d); assert.deepEqual(loadSave(s, "k"), d);
});
test("setItem throws -> no throw", () => assert.doesNotThrow(() => writeSave({ setItem() { throw new Error("full"); } }, "k", DEF)));
