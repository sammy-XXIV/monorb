export const TITLE = "Monorb";
export const CONTRACT = "0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763";   // Chog Genesis
export const CHAIN_ID = 143;                                             // Monad mainnet (the real Chog Genesis lives here)
export const GUEST_TOKEN = 1462;
export const CREDITS = [
  "A fan-made Chogathon 2026 hackathon entry.",
  "The Monadverse story, characters and chapter art belong to the Monadverse creators.",
  "Chog, Chog Genesis and $CHOG belong to Chog (chog.xyz). This build runs on Monad testnet with free test tokens.",
  "Your Chog's look and abilities come from its on-chain Chog Genesis metadata.",
  "No affiliation or endorsement implied.",
];
// Bonk Arena room server: local wrangler dev while developing, the deployed Worker otherwise (set after deploy)
export const ARENA_URL = ["localhost", "127.0.0.1"].includes(location.hostname) || /^(10|192\.168)\./.test(location.hostname) ? `http://${location.hostname}:8787` : "https://monorb-arena.samsonsamuel531.workers.dev";
// Chains. The live site runs on Monad TESTNET with free test tokens (a public faucet mints a test Chog and test $CHOG); localhost keeps the anvil sandbox
// for stakes and the real mainnet Chog Genesis for wallet reads. (The audited-by-tests ChogArena is also deployed on mainnet: 0x6B90…8B48, not used by the live app.)
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname) || /^(10|192\.168)\./.test(location.hostname);
export const TESTNET = { id: 10143, name: "Monad Testnet", rpc: "https://testnet-rpc.monad.xyz", explorer: "https://testnet.monadexplorer.com", faucet: true,
  arena: "0x8CECe063eb9ff3da4d277De8a44fe32a65ad3E3c", chog: "0xefB2979b20a8998D5d98285bE5508dd7bf31D354", chogToken: "0x7691Bdf560c9a3992E4E7C27BAB55338127c4C75" };   // deployed by tools/deploy_testnet.sh
export const STAKE_CHAIN = LOCAL
  ? { id: 31337, name: "Anvil (local test chain)", rpc: "http://127.0.0.1:8545", faucet: true, arena: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", chog: "0x5FbDB2315678afecb367f032d93F642f64180aa3", chogToken: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" }
  : TESTNET;
// where "connect wallet" looks for your Chogs: the real Chog Genesis on mainnet while developing, the test Chog on testnet when live
export const NFT_READ = LOCAL ? { rpc: "https://rpc.monad.xyz", chog: CONTRACT, multicall: "0xcA11bde05977b3631167028862bE2a173976CA11" } : { rpc: TESTNET.rpc, chog: TESTNET.chog, multicall: "0xcA11bde05977b3631167028862bE2a173976CA11" };
