export const TITLE = "Monadverse";
export const CONTRACT = "0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763";   // Chog Genesis
export const CHAIN_ID = 143;                                             // Monad mainnet
export const GUEST_TOKEN = 1462;
export const CREDITS = [
  "A fan-made Chogathon 2026 hackathon entry.",
  "The Monadverse story, characters and chapter art belong to the Monadverse creators.",
  "Chog, Chog Genesis and $CHOG belong to Chog (chog.xyz).",
  "Your Chog's look and abilities come from its on-chain Chog Genesis metadata.",
  "No affiliation or endorsement implied.",
];
// Bonk Arena room server: local wrangler dev while developing, the deployed Worker otherwise (set after deploy)
export const ARENA_URL = ["localhost", "127.0.0.1"].includes(location.hostname) || /^(10|192\.168)\./.test(location.hostname) ? `http://${location.hostname}:8787` : "https://monadverse-arena.samsonsamuel531.workers.dev";
// chain for Bonk Arena stakes (ChogArena escrow). Local anvil while developing; mainnet only after an explicit go-ahead.
export const STAKE_CHAIN = { id: 31337, name: "Anvil (local test chain)", rpc: "http://127.0.0.1:8545", arena: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", chog: "0x5FbDB2315678afecb367f032d93F642f64180aa3", chogToken: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" };
