# Phase 1: Engine + Chapter 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game playable from the title screen through Chapter 1 ("Escape the wasteland") as a chosen Chog, with traits applied and progress saved.

**Architecture:** A static web app in `chogverse/game/` using ES modules and three.js@0.160.0 from the CDN, with no build step. Pure logic (save, trait rules, controller math, chapter state) lives in DOM-free modules tested with `node --test`. Rendering and input are thin layers on top, checked in a headless browser with the existing screenshot method.

**Tech Stack:** three.js 0.160.0 (importmap from cdn.jsdelivr.net), plain ES modules, Node 24 `node:test`, Python `http.server` on port 8125, and headless Edge for screenshots.

**Spec:** `docs/2026-10-16-chogverse-game-design.md`

## Global Constraints
- Deadline 2026-10-23 15:00 UTC. Keep every task small enough to finish in one sitting.
- The title shown is "Monadverse" and lives in one constant, `TITLE` in `game/config.js`.
- The NFT is required: a run always has a Chog (`{contract, tokenId, traits}`). Guest mode uses token 1462.
- Chog Genesis: contract `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`, Monad chain id 143. Wallet reads are read-only, with no signing (the wallet itself is a phase 3 task).
- Save key format: `monadverse:<contract lowercase>:<tokenId>`.
- The credits text must name Monadverse and Chog as owners of the characters, lore and art, and call this a fan-made hackathon entry.
- Reuse the assets as they are: `face/face.glb`, `hair/hair.glb`, `body/body_rig.glb`, `body/traits.json`, and the trait/outline code in `body/char.html` and `body/traits_patch.js`.
- Commits: initialize git in `chogverse/` first. Use the user's identity only. Ask before committing, per CLAUDE.md.

## Review Focus
1. Missing or corrupted localStorage (private window, bad JSON): the game must still start fresh, not crash. Covered by a test in Task 1.
2. A token whose metadata lacks a trait (some 1:1 tokens have no Skin or Eyes): trait rules fall back to defaults. Covered by a test in Task 2.
3. Huge frame gaps (tab in the background, then back): the controller clamps `dt`, so the player can't tunnel through walls. Covered by a test in Task 3.
4. Dying in chapter 1 then retrying: the state resets fully, with no leftover hits or enemies. Covered by a test in Task 5.
5. A window resized mid-play, and a phone-width screen: the canvas and UI keep working. Checked by a screenshot at 390×844 in Task 6.

---

### Task 1: Save store

**Files:** create `game/save.js` and `game/test/save.test.js`.

**Interfaces:**
- Produces:
  - `saveKey(contract, tokenId) -> string`
  - `loadSave(storage, key) -> {chapter: number, done: number[], flags: object, badges: string[]}`, which returns the default `{chapter:1, done:[], flags:{}, badges:[]}` on a miss or on bad JSON
  - `writeSave(storage, key, data) -> void`, which swallows storage errors

`storage` is any `{getItem, setItem}`.

- [ ] Write tests:
  - `saveKey("0xC96D", 7) === "monadverse:0xc96d:7"`
  - load a missing key returns the default
  - load `"{bad"` returns the default
  - a `getItem` that throws returns the default
  - write then load round-trips
  - a `setItem` that throws doesn't throw
- [ ] Run `node --test game/test/` and expect FAIL.
- [ ] Implement `game/save.js`.
- [ ] Run `node --test game/test/` and expect PASS.
- [ ] Commit `feat: save store`.

### Task 2: Trait rules (gameplay effects, not visuals)

**Files:** create `game/rules.js` and `game/test/rules.test.js`.

**Interfaces:**
- Produces `rulesFor(traits: object) -> {maxHits: number, revive: boolean, ability: "dash"|"beam"|"shield", secret: boolean, side: "L"|"R"}`.
- Values from the spec:
  - **maxHits by Tier:** Common 3, Uncommon 4, Rare 5, Epic 6, Legendary 7; missing means 3.
  - **revive:** true when Aura exists and isn't "Clean".
  - **ability:** "beam" if Eyes includes "laser", "glass", "visor" or "vr" (case-insensitive); otherwise "dash" if Head exists; otherwise "shield".
  - **secret:** true if Form is "Skull", or Base is "Radioactive" or "1:1".
  - **side:** "L" if Side is "Left", otherwise "R".

- [ ] Write tests:
  - token 1462's traits give `{maxHits:4, revive:false, ability:"beam", secret:false, side:"L"}`
  - `{}` gives `{maxHits:3, revive:false, ability:"shield", secret:false, side:"R"}`
  - `{Tier:"Legendary", Aura:"Fire", Head:"Crown", Base:"1:1"}` gives maxHits 7, revive true, ability "dash", secret true
- [ ] Run and expect FAIL.
- [ ] Implement `game/rules.js`.
- [ ] Run and expect PASS.
- [ ] Commit `feat: trait gameplay rules`.

### Task 3: Controller math

**Files:** create `game/controller.js` and `game/test/controller.test.js`.

**Interfaces:**
- Produces `stepPlayer(p, input, dt) -> p'`, a pure function.
  - `p = {x, z, vy, y, heading, speed}`; `input = {fx, fz, run, jump}`, where fx and fz are -1..1 relative to the camera yaw already applied.
  - `dt` is clamped to 0.05 s.
  - Walk speed is 4, run speed 8, jump velocity 9, gravity -25, ground at y = 0.
  - Heading turns toward the move direction.
  - `speed` is the horizontal speed, used to pick the walk or run gait.

- [ ] Write tests:
  - no input keeps the position and gives speed 0
  - `fz:1` for 1 s (20 steps of 0.05) gives z within 4±0.01
  - `run:true` doubles that
  - `jump` on the ground makes y rise then return to 0, never below 0
  - `dt=2` moves the same as `dt=0.05` (the clamp)
- [ ] Run and expect FAIL.
- [ ] Implement.
- [ ] Run and expect PASS.
- [ ] Commit `feat: controller step`.

### Task 4: Shell, title, Chog select, credits

**Files:**
- Create `game/index.html` (UI and three.js scene bootstrap) and `game/config.js` (`TITLE`, `CONTRACT`, `CHAIN_ID=143`, `GUEST_TOKEN=1462`, `CREDITS` text).
- Create `game/chog.js`: `loadChog(scene, traits) -> Promise<{root, setGait(speed), update(dt)}>`. This is the model and trait code ported from `body/char.html`. The gait is walk below speed 5 and run at or above it.

**Interfaces:** consumes Tasks 1 and 2. Produces a `screen(name)` switch in index.html for `"title" | "select" | "credits" | "play"`.

- [ ] Title screen shows `TITLE` and the buttons Play as guest (#1462), Pick token #, and Credits.
- [ ] Select screen: a token number input (1..1969) loads `traits.json` and previews the Chog spinning with traits.
- [ ] Credits screen shows `CREDITS`.
- [ ] Check with headless screenshots of each screen at 900×700. The preview Chog shows #1462's cap, BTC glasses and jersey.
- [ ] Commit `feat: game shell, select, credits`.

### Task 5: Chapter 1, "Escape the wasteland"

**Files:**
- Create `game/chapters/ch1.js`, exporting `createCh1(rules) -> {state, step(dt, playerPos) -> events[], reset()}`. This holds the pure state.
- Create `game/chapters/ch1scene.js`, which builds the visuals:
  - a dead forest: dark-purple ground 60×20, grey trunks, the blue flame at the goal;
  - 6 skull creatures patrolling back and forth across the lane.
- Create `game/test/ch1.test.js`.

**Rules:**
- The player starts at z=0, and the goal (the time device) is at z=55.
- Touching a creature within 1.0 units costs one hit, gives 1 s of invulnerability, and knocks the player back 2 units in z.
- Hits ≥ `rules.maxHits` emits `"fail"`. If `rules.revive` is true, the first fail emits `"revive"` instead and resets hits to 0.
- Reaching z ≥ 55 emits `"complete"`.
- `reset()` restores hits 0, revive unused and the creatures' start positions.

- [ ] Write tests:
  - reaching z 55 gives `complete`
  - 4 touches with maxHits 4 gives `fail`
  - the same with revive gives `revive`, then a later `fail`
  - after `reset()`, hits are 0 and the creature positions equal the initial ones
  - two touches within the invulnerability window count as one hit
- [ ] Run and expect FAIL.
- [ ] Implement `ch1.js`.
- [ ] Run and expect PASS.
- [ ] Build `ch1scene.js` and wire up play mode:
  - intro card overlay showing chapter 1 art, if the image file is present at `game/cards/ch1.jpg`; otherwise a title text;
  - WASD/arrow keys, Shift to run, Space to jump;
  - the follow camera behind the player;
  - a hit counter in the HUD.
  - On complete: save `done:[1]`, `chapter:2` and badge `"escaped"`, then show "Chapter 1 complete".
  - On fail: show "Mongrod's forces caught you" and a Retry button, which calls `reset()`.
- [ ] Verify with headless screenshots of the intro, mid-run and the complete screen, plus one at 390×844.
- [ ] Commit `feat: chapter 1 playable`.

### Task 6: End-to-end check and handoff
- [ ] Run `node --test game/test/` and expect all to pass.
- [ ] Do a manual run in your browser: guest, then play ch1 to completion, then reload, and the title shows chapter 2 unlocked.
- [ ] Commit `chore: phase 1 complete`.

Next plan (phase 2): Chapters 2–3, covering dialogue, flags and NPCs.
