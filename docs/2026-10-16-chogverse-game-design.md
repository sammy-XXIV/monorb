# Chogverse: Relive the Monadverse as your Chog (Chogathon 2026)

Deadline: 2026-10-23 15:00 UTC.

## Goal
A browser 3D game where the player walks through the ten Monadverse chapters (Molandak's mission to stop Mongrod) as their own Chog Genesis NFT. The NFT is load-bearing: no Chog means no character. Its traits shape the look, the abilities and the story branches, and the player's progress is saved to that Chog.

## Success criteria
- Chogathon gate: removing the NFT breaks the game (character, abilities, saved story).
- All 10 chapters are playable start to finish in about 15–25 minutes.
- At least 2 endings, plus trait-locked content, so a second run is worth playing.
- It runs from one public link with no install. There's a guest mode with a sample Chog so judges can play without a wallet.
- The submission has a demo video of 3 minutes or less, a repo, and the pitch and "why Chog matters" answer.

## Already built (in `chogverse/`)
- A 3D Chog with face, hair and body, skinned with walk and run gaits (`body/body_rig.glb`, `face/face.glb`, `hair/hair.glb`).
- Outline rendering and a trait system for all 1,969 tokens (`body/char.html`, `body/traits.json`).

## Architecture (one web app, three.js, no build step)
- `game/index.html` is the shell: title, Chog select, chapter map, settings and credits.
- `game/engine.js` holds the shared systems:
  - third-person controller (move, jump, run) and follow camera;
  - dialogue box with choices;
  - pickups, simple enemies (patrol and chase, contact means a knock-back), and trigger zones;
  - trait checks (`has(trait, value)`, `tier()`).
- `game/chog.js` loads the model, applies traits (from `char.html`) and drives the gait from the controller speed.
- `game/chapters/chN.js` builds one scene each: the card as the intro screen, an environment, the objective and the exit.
- `game/save.js` keeps progress, choices and badges in localStorage, keyed by `contract:tokenId`. On-chain saving is out of scope.
- `game/wallet.js` reads the Chog Genesis tokens a wallet holds on Monad (chain 143, `0xc96d…3763`) with a read-only RPC; no signing. Guest mode uses token #1462.

## Chapters
| Ch | Card scene | Play | Trait hook |
|---|---|---|---|
| 1 | Ruined dark forest | Run and dodge Mongrod's creatures to reach the time device | Tier sets max hits taken |
| 2 | Jungle and waterfall | Explore and find the 4 heroes (talk) | Accessory gives a hint item |
| 3 | Moyaki's Pub | Dialogue with choices, which set the `trust` and `rage` flags | Side (L/R) unlocks one line |
| 4 | Dark future ruin | Short stealth past patrols | Eyes with glass/visor/laser can see patrol cones |
| 5 | Mushroom forest | Training trial: learn 1 ability | Ability picked by trait: Head → dash, Eyes → beam, Body → shield |
| 6 | Rilla clan trial | Dodge-and-bonk arena | Ability from ch5 |
| 7 | Rope net trap | Timed-press escape | Skull form or base gets a secret cutscene |
| 8 | Ambush by Mongrod | Survive 3 attack waves | Aura grants one revive |
| 9 | Cave of the Monorb | Sneak to the Monorb | Radioactive or 1:1 base unlocks a hidden path |
| 10 | Final battle | Boss fight, then the ending | Ending = flags + Side: Stop / Redeem / (secret) Join Mongrod |

## Retention
- Endings and per-chapter badges are saved per Chog and shown on the chapter map.
- Hidden content is gated by rare traits (Skull, Radioactive, 1:1, Legendary).
- Replay to reach the other endings. The completion percentage is shown per Chog.

## Art and copyright
- The chapter cards, characters and lore belong to Monadverse and Chog. A credits screen names them and says the game is a fan-made hackathon entry.
- Environments are simple stylized 3D: primitives in each card's palette. NPCs (Molandak, Mongrod, Salmonad and the others) start as recolored versions of the Chog body with distinct shapes. Real models only come later if time allows.

## Out of scope for the deadline
On-chain saves, multiplayer, voice, a mobile-specific UI and full NPC models.

## Build order (each step playable and checked before the next)
1. Engine and Chapter 1, end to end, including the save.
2. Chapters 2–3 (exploration and dialogue).
3. Chapters 4–6 (stealth, ability, arena).
4. Chapters 7–10 and the endings.
5. Wallet, guest mode, chapter map, credits.
6. Deploy, demo video, submission text.
