// End-to-end $CHOG pot on local anvil (needs anvil :8545 with MockChog, test $CHOG and the pot-enabled ChogArena; `npm run dev` :8787).
// Alice (holds Chog #167) and Bob (holds Chog #89) stake 10 tCHOG each; Bob runs off; the room signs Alice; she ends +10, he ends -10.
// A wallet that doesn't hold the Chog it plays as can't bind to a pot.
import assert from "node:assert/strict";
import { createPublicClient, createWalletClient, http, parseAbi, parseEther, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const BASE = "http://localhost:8787", RPC = "http://127.0.0.1:8545";
const CHOG = "0x5FbDB2315678afecb367f032d93F642f64180aa3", TOKEN = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", ARENA = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const KEYS = { deployer: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", alice: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  bob: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", eve: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" };
const abi = parseAbi(["function mint(address,uint256)", "function ownerOf(uint256) view returns (address)", "function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)",
  "function openPot(uint128) returns (uint256)", "function joinPot(uint256)", "function settle(uint256,address,bytes)", "event PotOpened(uint256 indexed matchId, address indexed p1, uint256 amount)"]);
const pub = createPublicClient({ chain: foundry, transport: http(RPC) }), acc = k => privateKeyToAccount(KEYS[k]);
const tx = async (k, address, functionName, args) => pub.waitForTransactionReceipt({ hash: await createWalletClient({ account: acc(k), chain: foundry, transport: http(RPC) }).writeContract({ address, abi, functionName, args }) });
const bal = a => pub.readContract({ address: TOKEN, abi, functionName: "balanceOf", args: [a] });
const bindMessage = (code, matchId, seat, address) => `Monadverse Bonk Arena\nroom ${code}\nmatch ${matchId}\nseat ${seat}\nwallet ${address.toLowerCase()}`;
const until = (f, ms = 60000) => new Promise((ok, bad) => { const t0 = Date.now(), i = setInterval(() => { if (f()) { clearInterval(i); ok(); } else if (Date.now() - t0 > ms) { clearInterval(i); bad(new Error("timeout")); } }, 50); });
const join = (code, token) => new Promise(ok => { const ws = new WebSocket(BASE.replace("http", "ws") + "/room/" + code), c = { ws, errs: [] };
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.t === "lobby") c.lobby = m; if (m.t === "s") c.last = m.s; if (m.t === "err") c.errs.push(m.why); if (m.t === "result") c.result = m; if (m.t === "welcome") { c.id = m.id; ok(c); } };
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", name: "C" + token, token })); });
const bind = async (c, k, code, id) => c.ws.send(JSON.stringify({ t: "stake", matchId: id, address: acc(k).address, sig: await acc(k).signMessage({ message: bindMessage(code, id, c.id, acc(k).address) }) }));

const A = acc("alice").address, B = acc("bob").address, POT = parseEther("10");
try { await pub.readContract({ address: CHOG, abi, functionName: "ownerOf", args: [89n] }); } catch { await tx("deployer", CHOG, "mint", [B, 89n]); }
const a0 = await bal(A), b0 = await bal(B);
await tx("alice", TOKEN, "approve", [ARENA, POT]); await tx("bob", TOKEN, "approve", [ARENA, POT]);
const rc = await tx("alice", ARENA, "openPot", [POT]);
const matchId = String(decodeEventLog({ abi, ...rc.logs.find(l => l.address.toLowerCase() === ARENA.toLowerCase()) }).args.matchId);
await tx("bob", ARENA, "joinPot", [BigInt(matchId)]);
console.log(`pot match ${matchId}: 2 x 10 tCHOG escrowed, arena holds ${Number(await bal(ARENA)) / 1e18} tCHOG`);

const { code } = await (await fetch(BASE + "/new")).json();
const e = await join(code, 167); await bind(e, "eve", code, matchId); await until(() => e.errs.length);
console.log("eve (not in the match) rejected:", e.errs[0]); e.ws.close(); await new Promise(r => setTimeout(r, 300));
const a = await join(code, 167), b = await join(code, 89);
await bind(a, "alice", code, matchId); await bind(b, "bob", code, matchId);
await until(() => a.lobby && a.lobby.stake && a.lobby.players.every(p => p.wallet));
assert.equal(a.lobby.stake.pot, POT.toString()); console.log("both bound as holders; lobby shows pot", Number(a.lobby.stake.pot) / 1e18, "tCHOG each");
a.ws.send(JSON.stringify({ t: "start" }));
const walk = setInterval(() => b.ws.send(JSON.stringify({ t: "in", mx: 1, mz: 0, run: true })), 50);
await until(() => a.result, 90000); clearInterval(walk);
assert.equal(a.result.winner, A); console.log("room signed winner: alice");
await tx("bob", ARENA, "settle", [BigInt(matchId), A, a.result.sig]);   // even the loser can submit it
const a1 = await bal(A), b1 = await bal(B);
assert.equal(a1 - a0, POT); assert.equal(b0 - b1, POT);
console.log(`PASS: alice +${Number(a1 - a0) / 1e18} tCHOG, bob -${Number(b0 - b1) / 1e18} tCHOG`);
await new Promise(r => setTimeout(r, 500));
const rec = await (await fetch(`${BASE}/chog/167`)).json(); console.log(`Chronicle #167: $CHOG won ${Number(BigInt(rec.chogWon)) / 1e18}, captured ${rec.captured}`);
a.ws.close(); b.ws.close(); setTimeout(() => process.exit(0), 200);
