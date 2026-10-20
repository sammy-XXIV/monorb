// Bonk Arena stakes: talk to the ChogArena escrow through the injected wallet. Hand-encoded calls, no libraries.
import { STAKE_CHAIN as C } from "./config.js";

const W = () => { if (!window.ethereum) throw new Error("No wallet found."); return window.ethereum; };
const h32 = v => BigInt(v).toString(16).padStart(64, "0"), addr = a => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const rpc = async (method, params) => { const r = await (await fetch(C.rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json(); if (r.error) throw new Error(r.error.message); return r.result; };
const call = (to, data) => rpc("eth_call", [{ to, data }, "latest"]);
const word = (hex, i) => hex.slice(2 + i * 64, 2 + i * 64 + 64);
export const bindMessage = (code, matchId, seat, address) => `Monadverse Bonk Arena\nroom ${code}\nmatch ${matchId}\nseat ${seat}\nwallet ${address.toLowerCase()}`;

export async function account() {
  const [a] = await W().request({ method: "eth_requestAccounts" });
  const id = "0x" + C.id.toString(16);
  try { await W().request({ method: "wallet_switchEthereumChain", params: [{ chainId: id }] }); }
  catch (e) { if (e.code !== 4902) throw e; await W().request({ method: "wallet_addEthereumChain", params: [{ chainId: id, chainName: C.name, rpcUrls: [C.rpc], nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 } }] }); }
  return a.toLowerCase();
}
async function send(from, to, data) {
  const hash = await W().request({ method: "eth_sendTransaction", params: [{ from, to, data }] });
  for (let i = 0; i < 120; i++) { const r = await rpc("eth_getTransactionReceipt", [hash]); if (r) { if (r.status !== "0x1") throw new Error("transaction reverted"); return r; } await new Promise(s => setTimeout(s, 1000)); }
  throw new Error("transaction not confirmed in 2 minutes");
}
export const ownerOf = async token => "0x" + word(await call(C.chog, "0x6352211e" + h32(token)), 0).slice(24);
export async function readMatch(id) {
  const r = await call(C.arena, "0x4768d4ef" + h32(id)), n = i => parseInt(word(r, i), 16);
  return { p1: "0x" + word(r, 0).slice(24), p2: "0x" + word(r, 1).slice(24), t1: n(2), t2: n(3), openedAt: n(4), lockedAt: n(5), state: n(6), pot: BigInt("0x" + word(r, 7)) };   // state: 1 open, 2 locked, 3 settled, 4 closed
}
async function approve(from) {
  if (parseInt(await call(C.chog, "0xe985e9c5" + addr(from) + addr(C.arena)), 16)) return;
  await send(from, C.chog, "0xa22cb465" + addr(C.arena) + h32(1));
}
const mine = async (from, token) => { if ((await ownerOf(token)) !== from) throw new Error(`This wallet doesn't own Chog #${token}.`); };
const OPENED = "0x845855e587a69a0b1a7f70b349fc0e31fe91892e001e45291e2efff250fc32e6";
export async function openMatch(from, token) {
  await mine(from, token); await approve(from);
  const r = await send(from, C.arena, "0x690e7c09" + h32(token));
  const log = r.logs.find(l => l.topics[0] === OPENED); return String(BigInt(log.topics[1]));
}
export async function joinMatch(from, matchId, token) { await mine(from, token); await approve(from); await send(from, C.arena, "0x79e66b46" + h32(matchId) + h32(token)); }
export const cancelMatch = (from, id) => send(from, C.arena, "0x40e58ee5" + h32(id));
export const refundMatch = (from, id) => send(from, C.arena, "0x278ecde1" + h32(id));
export async function settleMatch(from, id, winner, sig) {
  const s = sig.replace(/^0x/, ""), len = s.length / 2;
  return send(from, C.arena, "0x9abe08e6" + h32(id) + addr(winner) + h32(96) + h32(len) + s.padEnd(Math.ceil(len / 32) * 64, "0"));
}
export const signBind = (from, msg) => W().request({ method: "personal_sign", params: ["0x" + Array.from(new TextEncoder().encode(msg), b => b.toString(16).padStart(2, "0")).join(""), from] });

// ---- $CHOG pot matches: both stake the same amount, winner takes the pot ----
export const toWei = chog => { const [i, f = ""] = String(chog).split("."); return BigInt(i || 0) * 10n ** 18n + BigInt((f + "0".repeat(18)).slice(0, 18) || 0); };
export const fromWei = wei => { const w = BigInt(wei), i = w / 10n ** 18n, f = (w % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, ""); return f ? `${i}.${f.slice(0, 4)}` : String(i); };
export const chogBalance = async from => BigInt(await call(C.chogToken, "0x70a08231" + addr(from)));
async function approveChog(from, amount) {
  if (BigInt(await call(C.chogToken, "0xdd62ed3e" + addr(from) + addr(C.arena))) >= amount) return;
  await send(from, C.chogToken, "0x095ea7b3" + addr(C.arena) + h32(amount));
}
const POT_OPENED = "0x82fd1289b33b1a2d3eb8a7e0ee198360e712e2d589da09eaa0adce185d7b9eac";
export async function openPot(from, amount) {
  if (amount <= 0n) throw new Error("Stake more than 0 $CHOG.");
  if ((await chogBalance(from)) < amount) throw new Error("Not enough $CHOG in this wallet.");
  await approveChog(from, amount);
  const r = await send(from, C.arena, "0x1b36c64e" + h32(amount));
  return String(BigInt(r.logs.find(l => l.topics[0] === POT_OPENED).topics[1]));
}
export async function joinPot(from, matchId, amount) {
  if ((await chogBalance(from)) < amount) throw new Error("Not enough $CHOG in this wallet to match the pot.");
  await approveChog(from, amount); await send(from, C.arena, "0x831d49ef" + h32(matchId));
}
