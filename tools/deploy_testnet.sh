#!/usr/bin/env bash
# Deploy the test Chog + test $CHOG + ChogArena to Monad TESTNET (chain 10143) from WSL, then print the three addresses.
# Needs contracts/.env with DEPLOYER_KEY (gitignored) funded with testnet MON. Usage: bash tools/deploy_testnet.sh
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"; cd "$(dirname "$0")/../contracts"; set -a; . ./.env; set +a
R=https://testnet-rpc.monad.xyz; SIGNER="${SIGNER:-0x67184a0F7ED448B0fc4E63b8208d1952CBc2da59}"   # the monorb-arena Worker's public signer address
[ "$(cast chain-id --rpc-url $R)" = "10143" ] || { echo "not Monad testnet"; exit 1; }
BAL=$(cast balance "$(cast wallet address "$DEPLOYER_KEY")" --rpc-url $R); [ "$BAL" != "0" ] || { echo "deployer has 0 testnet MON"; exit 1; }
dep() { local c=$1; shift; forge create "$c" --rpc-url $R --private-key "$DEPLOYER_KEY" --broadcast --gas-limit 4000000 "$@" 2>&1 | awk '/Deployed to:/ {print $3}'; }   # --constructor-args is variadic: keep it last
CHOG=$(dep src/MockChog.sol:MockChog); TOKEN=$(dep src/MockChogToken.sol:MockCHOG)
[ -n "$CHOG" ] && [ -n "$TOKEN" ] || { echo "token deploy failed"; exit 1; }
ARENA=$(dep src/ChogArena.sol:ChogArena --constructor-args "$CHOG" "$TOKEN" "$SIGNER")
echo "CHOG=$CHOG"; echo "TOKEN=$TOKEN"; echo "ARENA=$ARENA"; echo "signer on-chain: $(cast call "$ARENA" 'signer()(address)' --rpc-url $R)"
