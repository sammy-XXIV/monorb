// End-to-end staked match on a local anvil chain (needs: anvil :8545 with MockChog + ChogArena deployed, `npm run dev` :8787).
// Alice and Bob escrow a Chog each, bind their wallets to their seats, fight (Alice walks off 3 times), the room signs Bob as winner,
// anyone settles on-chain, Bob owns both Chogs. Also checks a stranger's wallet can't bind and the result can't be redirected.
import assert from "node:assert/strict";
import { createPublicClient, createWalletClient, http, parseAbi, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const BASE = "http://localhost:8787", RPC = "http://127.0.0.1:8545";
const CHOG = "0x5FbDB2315678afecb367f032d93F642f64180aa3", ARENA = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const KEYS = { alice: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", bob: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", eve: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" };
const abi = parseAbi(["function mint(address,uint256)", "function setApprovalForAll(address,bool)", "function ownerOf(uint256) view returns (address)",
  "function open(uint256) returns (uint256)", "function join(uint256,uint256)", "function settle(uint256,address,bytes)", "function matchCount() view returns (uint256)"]);
const pub = createPublicClient({ chain: foundry, transport: http(RPC) });
const wallet = k => createWalletClient({ account: privateKeyToAccount(KEYS[k]), chain: foundry, transport: http(RPC) });
const tx = async (k, address, functionName, args) => pub.waitForTransactionReceipt({ hash: await wallet(k).writeContract({ address, abi, functionName, args }) });
const bindMessage = (code, matchId, seat, address) => `Monorb Bonk Arena\nroom ${code}\nmatch ${matchId}\nseat ${seat}\nwallet ${address.toLowerCase()}`;
const join = (code, name) => new Promise(ok => { const ws = new WebSocket(BASE.replace("http", "ws") + "/room/" + code), c = { ws, msgs: [], errs: [] };
  ws.onmessage = e => { const m = JSON.parse(e.data); c.msgs.push(m); if (m.t === "s") c.last = m.s; if (m.t === "lobby") c.lobby = m; if (m.t === "err") c.errs.push(m.why); if (m.t === "result") c.result = m; if (m.t === "welcome") { c.id = m.id; ok(c); } };
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", name, token: 1 })); });
const until = (f, ms = 20000) => new Promise((ok, bad) => { const t0 = Date.now(), i = setInterval(() => { if (f()) { clearInterval(i); ok(); } else if (Date.now() - t0 > ms) { clearInterval(i); bad(new Error("timeout")); } }, 50); });
const bind = async (c, k, code, matchId) => { const a = privateKeyToAccount(KEYS[k]); c.ws.send(JSON.stringify({ t: "stake", matchId: String(matchId), address: a.address, sig: await a.signMessage({ message: bindMessage(code, matchId, c.id, a.address) }) })); };

const A = privateKeyToAccount(KEYS.alice).address, B = privateKeyToAccount(KEYS.bob).address;
const base = Number(await pub.readContract({ address: ARENA, abi, functionName: "matchCount" })), tA = 1000 + base * 2, tB = tA + 1;
await tx("alice", CHOG, "mint", [A, BigInt(tA)]); await tx("bob", CHOG, "mint", [B, BigInt(tB)]);
await tx("alice", CHOG, "setApprovalForAll", [ARENA, true]); await tx("bob", CHOG, "setApprovalForAll", [ARENA, true]);
await tx("alice", ARENA, "open", [BigInt(tA)]); const matchId = base + 1;
await tx("bob", ARENA, "join", [BigInt(matchId), BigInt(tB)]);
console.log("escrowed: match", matchId, "owner of both =", await pub.readContract({ address: CHOG, abi, functionName: "ownerOf", args: [BigInt(tA)] }) === ARENA ? "arena" : "?");

const { code } = await (await fetch(BASE + "/new")).json();
const a = await join(code, "Alice"), b = await join(code, "Bob");
// a stranger can't take a seat in someone else's staked match
const e = await join(code, "Eve"); await bind(e, "eve", code, matchId); await until(() => e.errs.length);
assert.match(e.errs[0], /isn't in that match/); console.log("stranger rejected:", e.errs[0]);
e.ws.close(); await new Promise(r => setTimeout(r, 300));
await bind(a, "alice", code, matchId); await until(() => a.lobby && a.lobby.stake);
a.ws.send(JSON.stringify({ t: "start" })); await until(() => a.errs.length); console.log("start refused until both wallets bound:", a.errs[0]);
await bind(b, "bob", code, matchId);
await until(() => a.lobby && a.lobby.players.every(p => p.wallet));
console.log("bound:", a.lobby.players.map(p => `${p.name}=${p.wallet.slice(0, 8)}`).join(", "));
a.ws.send(JSON.stringify({ t: "start" }));
const walk = setInterval(() => a.ws.send(JSON.stringify({ t: "in", mx: 1, mz: 0, run: true })), 50);   // Alice keeps running off the edge
await until(() => b.result, 60000); clearInterval(walk);
assert.equal(b.result.winner, B); console.log("room signed winner:", b.result.winner);
// the signature only works for the winner it names
await assert.rejects(tx("eve", ARENA, "settle", [BigInt(matchId), A, b.result.sig])); console.log("redirecting the pot to Alice: rejected");
await tx("eve", ARENA, "settle", [BigInt(matchId), B, b.result.sig]);
const o1 = await pub.readContract({ address: CHOG, abi, functionName: "ownerOf", args: [BigInt(tA)] }), o2 = await pub.readContract({ address: CHOG, abi, functionName: "ownerOf", args: [BigInt(tB)] });
assert.equal(o1, B); assert.equal(o2, B); console.log("PASS: Bob owns both Chogs", tA, tB);
// the Chronicle: the room wrote the staked match into both Chogs' histories
await new Promise(r => setTimeout(r, 500));
const rec = async t => (await fetch(`${BASE}/chog/${t}`)).json();
const ra = await rec(tA), rb = await rec(tB);
assert.equal(rb.wins, 1); assert.equal(rb.captured, 1); assert.equal(ra.losses, 1); assert.equal(ra.lostInStake, 1);
console.log(`chronicle: #${tB} ${rb.wins}W captured ${rb.captured} | #${tA} ${ra.losses}L lost in stake ${ra.lostInStake}`);
// story chapters: only the current holder can write them (Bob now holds both)
const story = async (k, t, chapter) => { const acc = privateKeyToAccount(KEYS[k]); const message = `Monorb Chronicle
Chog #${t} finished chapter ${chapter}
wallet ${acc.address.toLowerCase()}`;
  return (await fetch(`${BASE}/chog/${t}/story`, { method: "POST", body: JSON.stringify({ chapter, wallet: acc.address, sig: await acc.signMessage({ message }) }) })).json(); };
const bad = await story("alice", tA, 1); assert.match(bad.error, /doesn't hold/); console.log("alice (no longer holder) can't write #" + tA + ":", bad.error);
const good = await story("bob", tA, 1); assert.deepEqual(good.chapters, [1]); console.log("bob (holder) wrote chapter 1 into #" + tA);
a.ws.close(); b.ws.close(); setTimeout(() => process.exit(0), 200);
