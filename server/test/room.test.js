// Needs `npm run dev` (wrangler on :8787). Two fake players join a room; only the host can start; walking off the edge loses the round.
import { test, after } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.ARENA || "http://localhost:8787";
const join = (code, name) => new Promise((ok, bad) => {
  const ws = new WebSocket(BASE.replace("http", "ws") + "/room/" + code), c = { ws, msgs: [], last: null };
  ws.onmessage = e => { const m = JSON.parse(e.data); c.msgs.push(m); if (m.t === "s") c.last = m.s; if (m.t === "welcome") { c.id = m.id; ok(c); } };
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", name, token: 7 })); ws.onerror = bad;
});
const until = (f, ms = 15000) => new Promise((ok, bad) => { const t0 = Date.now(), i = setInterval(() => { if (f()) { clearInterval(i); ok(); } else if (Date.now() - t0 > ms) { clearInterval(i); bad(new Error("timeout")); } }, 50); });

test("two players, host starts, the one who walks off loses the round", async () => {
  const { code } = await (await fetch(BASE + "/new")).json();
  const a = await join(code, "A"), b = await join(code, "B");
  assert.equal(a.msgs.find(m => m.t === "welcome").host, a.id);
  b.ws.send(JSON.stringify({ t: "start" })); await new Promise(r => setTimeout(r, 400)); assert.equal(a.last, null, "non-host can't start");
  a.ws.send(JSON.stringify({ t: "start" })); await until(() => a.last && a.last.ph === "fight", 6000);
  const send = setInterval(() => a.ws.send(JSON.stringify({ t: "in", mx: 1, mz: 0, run: true })), 50);
  await until(() => a.last.lw);
  clearInterval(send);
  assert.equal(a.last.lw, b.id); assert.equal(b.last.lw, b.id);
  a.ws.close(); b.ws.close();
});
test("a fifth player is turned away", async () => {
  const { code } = await (await fetch(BASE + "/new")).json(); const ps = [];
  for (let i = 0; i < 4; i++) ps.push(await join(code, "P" + i));
  const ws = new WebSocket(BASE.replace("http", "ws") + "/room/" + code); const m = await new Promise(ok => { ws.onopen = () => ws.send(JSON.stringify({ t: "hello", name: "X" })); ws.onmessage = e => ok(JSON.parse(e.data)); });
  assert.equal(m.t, "full"); ws.close(); ps.forEach(p => p.ws.close());
});
after(() => setTimeout(() => process.exit(0), 200));   // open websockets would keep node alive
