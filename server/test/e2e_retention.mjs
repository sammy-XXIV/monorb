// Needs anvil (:8545, MockChog with #167 and #88 held by anvil account 1) and `npm run dev` (:8787).
// Two verified holders play matches; the Chronicle gets the results, the daily quest/streak updates, the board and the Elder Tree meter move.
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";

const BASE = "http://localhost:8787", KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const acc = privateKeyToAccount(KEY), get = async p => (await fetch(BASE + p)).json();
const holderMessage = (token, code, seat, wallet) => `Monadverse Chronicle\nI hold Chog #${token}\nroom ${code}\nseat ${seat}\nwallet ${wallet.toLowerCase()}`;
const until = (f, ms = 60000) => new Promise((ok, bad) => { const t0 = Date.now(), i = setInterval(() => { if (f()) { clearInterval(i); ok(); } else if (Date.now() - t0 > ms) { clearInterval(i); bad(new Error("timeout")); } }, 50); });
const join = (code, token) => new Promise(ok => { const ws = new WebSocket(BASE.replace("http", "ws") + "/room/" + code), c = { ws, errs: [] };
  ws.onmessage = async e => { const m = JSON.parse(e.data); if (m.t === "lobby") c.lobby = m; if (m.t === "s") c.last = m.s; if (m.t === "err") c.errs.push(m.why);
    if (m.t === "welcome") { c.id = m.id; ws.send(JSON.stringify({ t: "verify", wallet: acc.address, sig: await acc.signMessage({ message: holderMessage(token, code, m.id, acc.address) }) })); ok(c); } };
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", name: "C" + token, token })); });

const daily = await get("/daily"), before = { a: await get("/chog/167"), w: await get("/world") };
console.log("today's quest:", daily.text, `(${daily.goal})`);
const { code } = await (await fetch(BASE + "/new")).json();
const a = await join(code, 167), b = await join(code, 88);
await until(() => a.lobby && a.lobby.players.length === 2 && a.lobby.players.every(p => p.verified));
console.log("both verified holders");
for (let m = 0; m < 3; m++) {   // 3 matches: #88 runs off every round
  a.ws.send(JSON.stringify({ t: "start" })); await until(() => a.last && a.last.ph !== "over");
  const walk = setInterval(() => b.ws.send(JSON.stringify({ t: "in", mx: 1, mz: 0, run: true })), 50);
  await until(() => a.last.ph === "over", 90000); clearInterval(walk); await new Promise(r => setTimeout(r, 400));
  console.log(`match ${m + 1}: ${a.last.w === a.id ? "#167" : "#88"} won`);
}
const r167 = await get("/chog/167"), r88 = await get("/chog/88"), board = await get("/board"), world = await get("/world");
assert.equal(r167.wins - before.a.wins, 3); assert.ok(r88.losses >= 3);
assert.ok(board.board.find(r => r.token === 167), "167 is on the board"); assert.equal(board.board[0].token, 167);
assert.ok(world.points > before.w.points, "the Elder Tree meter moved");
console.log(`#167: ${r167.wins}W, daily "${r167.daily.text}" ${r167.daily.progress}/${r167.daily.goal} done=${r167.daily.done}, streak ${r167.streak.count}`);
console.log(`board #1: Chog #${board.board[0].token} (${board.board[0].wins}W) · Elder Tree ${world.points} pts = ${world.percent}%`);
if (daily.id === "play3") { assert.equal(r167.daily.done, true); assert.equal(r167.streak.count, 1); assert.equal(r88.daily.done, true); }   // today's quest is checkable from 3 matches
console.log("PASS");
a.ws.close(); b.ws.close(); setTimeout(() => process.exit(0), 200);
