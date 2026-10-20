# PvP: Bonk Arena with Chog stakes (plan, 2026-10-19)

## Goal
Live rooms reached through an invite link. Chogs knock each other off a shrinking floating platform with spin attacks. The last one standing wins the round, and the first to 3 round wins takes the match.

- **Free rooms:** 2–4 players.
- **Staked matches:** 1v1. Each player escrows one Chog Genesis NFT, and the winner takes both.

## Anti-cheat model
- **The server runs the fight.** A Cloudflare Durable Object runs the match from a pure, shared module, `game/arena_sim.js`. Clients send only inputs (move direction, run, jump, spin) and render the snapshots the server sends back.
- **The server decides the result.** It signs `(matchId, winner)` with EIP-712. The signing key lives only in a Worker secret.
- **The escrow contract pays out only on a valid signature.**
  - If nobody settles before the deadline, each player can reclaim their own Chog.
  - A match that nobody joins can be cancelled by its creator.

## Pieces (built in this order, each one tested)
1. `game/arena_sim.js`: pure, deterministic step function. Unit tests run with `node --test`.
2. `server/`: Worker plus a `Room` Durable Object. Its jobs:
   - Lobby, then countdown, fight, round over, and match over.
   - A 30 Hz sim tick and 15 Hz snapshots.
   - Invite links of the form `?room=CODE`.

   Local runs use `wrangler dev`. A test script drives two fake clients.
3. Client:
   - `game/net.js`: the WebSocket connection.
   - `game/chapters/arena.js`: the platform scene.
   - Remote Chogs, each with its own traits.
   - Interpolation, and a lobby UI for create, copy link, ready and start.
4. `contracts/ChogArena.sol`, with escrow and an EIP-712 settle. Foundry tests cover:
   - The happy path.
   - A bad signature.
   - Replay.
   - Refund after the deadline.
   - Cancel.
5. Stake flow:
   - In the client: approve, create or join, and stake the Chog. This needs a wallet signature, so it only runs when the user is playing.
   - On the server: once the match ends, it hands out the signed result, and either player can submit `settle`.

## Approval gates (stop and ask)
- Deploying the Worker to Cloudflare.
- Deploying the contract to Monad mainnet. Testnet comes first.
- Any transaction or wallet signature.
