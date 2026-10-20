// Read-only wallet: get the address from the injected wallet (no signing, no chain switch),
// then find which Chog Genesis tokens it owns with ONE Multicall3 call of ownerOf(1..1969) on Monad.
import { CONTRACT } from "./config.js";

const RPC = "https://rpc.monad.xyz", MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11", SUPPLY = 1969;
const hex32 = n => n.toString(16).padStart(64, "0");

export function hasWallet() { return typeof window !== "undefined" && !!window.ethereum; }

export async function connect() {
  if (!hasWallet()) throw new Error("No wallet found. Install MetaMask, Rabby or Phantom.");
  const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!addr) throw new Error("Wallet returned no account.");
  return addr.toLowerCase();
}

// aggregate3((address,bool,bytes)[]) with ownerOf(id) for every token
function encodeAggregate3(ids) {
  const target = CONTRACT.slice(2).toLowerCase().padStart(64, "0");
  const elems = ids.map(id => target + hex32(1) + hex32(96) + hex32(36) + "6352211e" + hex32(id) + "0".repeat(56));   // 36-byte calldata padded to 64
  const elemLen = elems[0].length / 2; let off = 32 * ids.length, offs = "";
  for (let i = 0; i < ids.length; i++) { offs += hex32(off); off += elemLen; }
  return "0x82ad56cb" + hex32(32) + hex32(ids.length) + offs + elems.join("");
}
// decode (bool success, bytes returnData)[] -> owner address (lowercase) or null per id
export function decodeOwners(result, count) {
  const h = result.slice(2), word = i => h.slice(i * 64, i * 64 + 64), owners = [];
  const arr = parseInt(word(0), 16) / 32, n = parseInt(word(arr), 16);
  for (let i = 0; i < Math.min(n, count); i++) {
    const at = arr + 1 + parseInt(word(arr + 1 + i), 16) / 32;            // tuple start (words)
    const ok = parseInt(word(at), 16) === 1, len = parseInt(word(at + 2), 16);
    owners.push(ok && len >= 32 ? "0x" + word(at + 3).slice(24) : null);
  }
  return owners;
}

export async function ownedChogs(address) {
  const ids = Array.from({ length: SUPPLY }, (_, i) => i + 1);
  const res = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: MULTICALL3, data: encodeAggregate3(ids) }, "latest"] }) }).then(r => r.json());
  if (res.error) throw new Error("Monad RPC: " + res.error.message);
  const owners = decodeOwners(res.result, SUPPLY), a = address.toLowerCase();
  return ids.filter((id, i) => owners[i] === a);
}
