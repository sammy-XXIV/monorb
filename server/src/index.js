// Bonk Arena rooms. One Durable Object per room code; the room runs the fight itself (arena_sim) and clients only send inputs.
import { createArena, addPlayer, removePlayer, startMatch, step, snapshot, arenaPerks } from "../../game/arena_sim.js";
import TRAITS from "../../body/traits.json";
import { emptyRecord, applyEvent, verifyMessage as holderMessage, storyMessage, updateBoard, WORLD_POINTS, worldPercent } from "./chronicle.js";
import { applyDaily, matchStats, questFor, dayKey } from "./daily.js";
import { createPublicClient, http, verifyMessage, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const MATCHES_ABI = [{ type: "function", name: "matches", stateMutability: "view", inputs: [{ type: "uint256" }],
  outputs: [{ name: "p1", type: "address" }, { name: "p2", type: "address" }, { name: "t1", type: "uint16" }, { name: "t2", type: "uint16" }, { name: "openedAt", type: "uint64" }, { name: "lockedAt", type: "uint64" }, { name: "state", type: "uint8" }, { name: "pot", type: "uint128" }] }];
const OPEN = 1, LOCKED = 2;
const OWNER_ABI = [{ type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] }];
// is `wallet` the current holder of Chog #token? (the Chog Genesis contract on Monad; locally the test Chog on anvil)
async function holds(env, token, wallet) {
  const owner = await createPublicClient({ transport: http(env.CHOG_RPC) }).readContract({ address: env.CHOG, abi: OWNER_ABI, functionName: "ownerOf", args: [BigInt(token)] });
  return owner.toLowerCase() === wallet.toLowerCase();
}
const chronicle = env => env.CHRONICLE.get(env.CHRONICLE.idFromName("all"));
// the exact text a player signs to bind their wallet to their seat in this room (room + match + seat: no replay elsewhere)
export const bindMessage = (code, matchId, seat, address) => `Monorb Bonk Arena
room ${code}
match ${matchId}
seat ${seat}
wallet ${address.toLowerCase()}`;

const CORS = { "Access-Control-Allow-Origin": "*" };
const CODE = /^[A-Z0-9]{4,8}$/;
const TICK = 1 / 30;

export default {
  async fetch(req, env) {
    const url = new URL(req.url), m = url.pathname.match(/^\/room\/([A-Za-z0-9]+)$/);
    if (url.pathname === "/new") {                                  // a fresh room code for an invite link
      const code = Array.from(crypto.getRandomValues(new Uint8Array(5)), b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
      return Response.json({ code }, { headers: CORS });
    }
    if (url.pathname === "/config") return Response.json({ staking: !!(env.ARENA && env.SIGNER_KEY && env.RPC), chainId: Number(env.CHAIN_ID || 0), arena: env.ARENA || null,
      signer: env.SIGNER_KEY ? privateKeyToAccount(env.SIGNER_KEY).address : null }, { headers: CORS });   // signer = public address only (must equal ChogArena.signer())   // can this server run staked matches?
    if (["/board", "/world", "/daily"].includes(url.pathname))   // leaderboard, Elder Tree meter, today's quest
      return chronicle(env).fetch(new Request("https://x" + url.pathname)).then(r => new Response(r.body, { headers: { ...CORS, "content-type": "application/json" } }));
    const c = url.pathname.match(/^\/chog\/(\d{1,4})(\/story)?$/);
    if (c) {   // read a Chog's Chronicle, or (holder-signed) add a finished chapter to it
      const token = +c[1]; if (token < 1 || token > 1969) return new Response("no such Chog", { status: 404, headers: CORS });
      if (req.method === "OPTIONS") return new Response(null, { headers: { ...CORS, "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "GET,POST" } });
      if (!c[2]) return chronicle(env).fetch(new Request(`https://x/get?token=${token}`)).then(r => new Response(r.body, { headers: { ...CORS, "content-type": "application/json" } }));
      try {
        const { chapter, wallet, sig } = await req.json();
        if (!(await verifyMessage({ address: wallet, message: storyMessage(token, chapter, wallet), signature: sig }))) throw new Error("bad signature");
        if (!(await holds(env, token, wallet))) throw new Error(`that wallet doesn't hold Chog #${token}`);
        const r = await chronicle(env).fetch(new Request("https://x/add", { method: "POST", body: JSON.stringify({ token, ev: { kind: "story", chapter } }) }));
        return new Response(r.body, { headers: { ...CORS, "content-type": "application/json" } });
      } catch (e) { return Response.json({ error: e.shortMessage || e.message }, { status: 400, headers: CORS }); }
    }
    if (m && CODE.test(m[1].toUpperCase())) { const code = m[1].toUpperCase(); const r = new Request(req); r.headers.set("X-Room", code); return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(r); }
    return new Response("Monorb arena", { headers: CORS });
  },
};

export class Room {
  constructor(state, env) { this.env = env; this.stake = null; this.result = null; this.sockets = new Map(); this.inputs = {}; this.sim = createArena(); this.host = null; this.timer = null; this.n = 0; this.tick = 0; }

  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    this.code ??= req.headers.get("X-Room");
    const [client, server] = Object.values(new WebSocketPair()); server.accept();
    let id = null;
    server.addEventListener("message", ev => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === "hello" && !id) {
        if (this.sim.phase !== "lobby" && this.sim.phase !== "over") return this.send(server, { t: "full", why: "match in progress" });
        id = "p" + (++this.n);
        const token = Math.max(1, Math.min(1969, msg.token | 0)), meta = { name: String(msg.name || "Chog").slice(0, 24), token, perks: arenaPerks(TRAITS[token]) };   // perks from the token's own traits, never from the client
        if (!addPlayer(this.sim, id, meta)) { id = null; return this.send(server, { t: "full", why: "room is full (4)" }); }
        this.sockets.set(id, server); this.host ??= id;
        this.send(server, { t: "welcome", id, host: this.host }); this.lobby();
      } else if (!id) return;
      else if (msg.t === "in") {                                   // inputs only: the room decides what they do
        const prev = this.inputs[id] || {};
        this.inputs[id] = { mx: +msg.mx || 0, mz: +msg.mz || 0, run: !!msg.run, jump: !!msg.jump || prev.jump, spin: !!msg.spin || prev.spin };   // a tap between ticks is not lost
      } else if (msg.t === "start" && id === this.host && this.sim.order.length >= 2 && (this.sim.phase === "lobby" || this.sim.phase === "over")) {
        this.tryStart(server);
      } else if (msg.t === "stake") this.bind(server, id, msg);
      else if (msg.t === "verify") this.verifyHolder(server, id, msg);
      else if (msg.t === "getResult" && this.result) this.send(server, this.result);
    });
    const bye = () => { if (!id) return; this.sockets.delete(id); delete this.inputs[id]; removePlayer(this.sim, id);
      if (this.host === id) this.host = this.sim.order[0] || null; id = null; this.lobby(); };
    server.addEventListener("close", bye); server.addEventListener("error", bye);
    return new Response(null, { status: 101, webSocket: client });
  }

  async chainMatch(matchId) {
    const client = createPublicClient({ transport: http(this.env.RPC) });
    return client.readContract({ address: this.env.ARENA, abi: MATCHES_ABI, functionName: "matches", args: [BigInt(matchId)] });
  }

  // a player proves which wallet they are; the wallet must be a side of the on-chain match
  async bind(ws, id, msg) {
    try {
      if (!this.env.ARENA) throw new Error("staking is not configured on this server");
      if (this.sim.phase !== "lobby" && this.sim.phase !== "over") throw new Error("can't change stakes mid-match");
      const matchId = String(BigInt(msg.matchId)), address = getAddress(msg.address);
      if (this.stake && this.stake.matchId !== matchId && !this.result) throw new Error(`this room is already staking match ${this.stake.matchId}`);
      if (!(await verifyMessage({ address, message: bindMessage(this.code, matchId, id, address), signature: msg.sig }))) throw new Error("bad wallet signature");
      const [p1, p2, t1, t2, , , state, pot] = await this.chainMatch(matchId);
      if (state !== OPEN && state !== LOCKED) throw new Error("that match isn't open or locked on-chain");
      if (address !== p1 && address !== p2) throw new Error("your wallet isn't in that match");
      const me = this.sim.players[id];   // a $CHOG pot still needs a Chog: the wallet must hold the Chog it fights as
      if (pot > 0n && !(me && await holds(this.env, me.meta.token, address))) throw new Error(`a $CHOG pot is for holders: this wallet doesn't hold Chog #${me && me.meta.token}`);
      if (!this.stake || this.stake.matchId !== matchId) { this.stake = { matchId, seats: {} }; this.result = null; }
      for (const k in this.stake.seats) if (this.stake.seats[k] === address) delete this.stake.seats[k];   // re-binding after a reconnect
      this.stake.seats[id] = address; Object.assign(this.stake, { p1, p2, t1, t2, state, pot: pot.toString() });
      const fighter = Number(address === p1 ? t1 : t2), pl = this.sim.players[id];   // in a Chog-for-Chog match you fight as the Chog you escrowed
      if (pl && pot > 0n) pl.meta.verified = address;
      else if (pl) { pl.meta.token = fighter; pl.meta.name = `Chog #${fighter}`; pl.meta.perks = arenaPerks(TRAITS[fighter]); pl.perks = { ...pl.perks, ...pl.meta.perks }; }
      this.lobby();
    } catch (e) { this.send(ws, { t: "err", why: e.shortMessage || e.message }); }
  }

  // a player proves they hold the Chog they play as: only holders' results go into Chronicles
  async verifyHolder(ws, id, msg) {
    try {
      const pl = this.sim.players[id]; if (!pl) return;
      const wallet = getAddress(msg.wallet);
      if (!(await verifyMessage({ address: wallet, message: holderMessage(pl.meta.token, this.code, id, wallet), signature: msg.sig }))) throw new Error("bad signature");
      if (!(await holds(this.env, pl.meta.token, wallet))) throw new Error(`that wallet doesn't hold Chog #${pl.meta.token}`);
      pl.meta.verified = wallet; this.lobby();
    } catch (e) { this.send(ws, { t: "err", why: e.shortMessage || e.message }); }
  }

  // after a match: write it into each holder's Chronicle (staked seats count as verified: their Chog was escrowed)
  async record() {
    const w = this.sim.winner, staked = !!(this.stake && w && this.stake.seats[w]);
    const ids = this.sim.order.filter(id => this.sim.players[id].meta.verified || (staked && this.stake.seats[id]));
    for (const id of ids) {
      const p = this.sim.players[id], vs = this.sim.order.filter(o => o !== id).map(o => this.sim.players[o].meta.token);
      await chronicle(this.env).fetch(new Request("https://x/add", { method: "POST", body: JSON.stringify({ token: p.meta.token, ev: { kind: "arena", won: id === w, vs, staked, matchId: staked ? this.stake.matchId : undefined, pot: staked && this.stake.pot !== "0" ? this.stake.pot : undefined },
        stats: matchStats({ won: id === w, kos: p.kos, falls: p.falls, roundsWon: p.roundsWon }) }) }));
    }
  }

  async tryStart(ws) {
    if (this.stake && !this.result) {   // staked: exactly the two escrowed wallets, and the match locked on-chain
      try {
        const [p1, p2, , , , , state] = await this.chainMatch(this.stake.matchId);   // (pot matches also lock here)
        const seats = Object.entries(this.stake.seats).filter(([sid]) => this.sim.players[sid]), addrs = seats.map(([, a]) => a);
        if (state !== LOCKED) throw new Error("waiting for the second Chog to be escrowed on-chain");
        if (this.sim.order.length !== 2 || seats.length !== 2 || !addrs.includes(p1) || !addrs.includes(p2)) throw new Error("both staked wallets must be in the room (and nobody else)");
      } catch (e) { return this.send(ws, { t: "err", why: e.shortMessage || e.message }); }
    }
    startMatch(this.sim); this.lobby(); this.run();
  }

  // the room ran the fight, so the room signs the winner (EIP-712, checked by the ChogArena contract)
  async signResult() {
    const w = this.sim.winner, winner = w && this.stake && this.stake.seats[w];
    if (!winner) return;
    const account = privateKeyToAccount(this.env.SIGNER_KEY);
    const sig = await account.signTypedData({ domain: { name: "ChogArena", version: "1", chainId: Number(this.env.CHAIN_ID), verifyingContract: this.env.ARENA },
      types: { Result: [{ name: "matchId", type: "uint256" }, { name: "winner", type: "address" }] }, primaryType: "Result", message: { matchId: BigInt(this.stake.matchId), winner } });
    this.result = { t: "result", matchId: this.stake.matchId, winner, sig };
    this.broadcast(this.result);
  }

  run() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      step(this.sim, this.inputs, TICK); this.tick++;
      for (const k in this.inputs) { this.inputs[k].spin = false; this.inputs[k].jump = false; }   // presses are consumed by one step
      if (this.tick % 2 === 0 || this.sim.phase === "over") this.broadcast({ t: "s", s: snapshot(this.sim) });
      if (this.sim.phase === "over" || this.sim.order.length === 0) { clearInterval(this.timer); this.timer = null; this.lobby(); if (this.sim.phase === "over") { this.signResult(); this.record(); } }
    }, TICK * 1000);
  }

  lobby() { this.broadcast({ t: "lobby", host: this.host, phase: this.sim.phase, winner: this.sim.winner, players: this.sim.order.map(id => ({ id, ...this.sim.players[id].meta, verified: !!this.sim.players[id].meta.verified, wins: this.sim.players[id].wins, wallet: this.stake?.seats[id] || null })),
    stake: this.stake && { matchId: this.stake.matchId, p1: this.stake.p1, p2: this.stake.p2, t1: this.stake.t1, t2: this.stake.t2, state: this.stake.state, pot: this.stake.pot, settled: !!this.result } }); }
  send(ws, m) { try { ws.send(JSON.stringify(m)); } catch {} }
  broadcast(m) { const s = JSON.stringify(m); for (const ws of this.sockets.values()) try { ws.send(s); } catch {} }
}

// one store for every Chog's Chronicle (keyed by token), plus the leaderboard and the Elder Tree meter
export class Chronicle {
  constructor(state) { this.storage = state.storage; }
  async fetch(req) {
    const url = new URL(req.url), st = this.storage;
    if (url.pathname === "/get") { const token = +url.searchParams.get("token"); return Response.json((await st.get("c" + token)) || emptyRecord(token)); }
    if (url.pathname === "/board") return Response.json({ board: (await st.get("board")) || [] });
    if (url.pathname === "/world") { const points = (await st.get("world")) || 0; return Response.json({ points, percent: worldPercent(points) }); }
    if (url.pathname === "/daily") { const day = dayKey(Date.now()); return Response.json({ day, ...questFor(day) }); }
    if (url.pathname === "/add" && req.method === "POST") {
      const { token, ev, stats } = await req.json(), key = "c" + token, before = (await st.get(key)) || emptyRecord(token);
      let rec = applyEvent(before, ev), points = 0;
      if (ev.kind === "arena") points += WORLD_POINTS.arena;
      if (ev.kind === "story" && rec.chapters.length > before.chapters.length) points += WORLD_POINTS.story;
      if (stats) { const d = applyDaily(rec, stats); rec = d.rec;
        if (d.completed) { points += WORLD_POINTS.daily; rec.history.unshift({ at: Date.now(), kind: "daily", text: rec.daily.text, streak: rec.streak.count }); rec.history.length = Math.min(rec.history.length, 30); } }
      await st.put(key, rec); await st.put("board", updateBoard((await st.get("board")) || [], rec));
      if (points) await st.put("world", ((await st.get("world")) || 0) + points);
      return Response.json(rec);
    }
    return new Response("not found", { status: 404 });
  }
}
