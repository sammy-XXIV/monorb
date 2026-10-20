// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ChogArena} from "../src/ChogArena.sol";

/// Rehearsal against the REAL Monad mainnet Chog Genesis + $CHOG (forked; nothing is sent on-chain).
/// Run: FORK_URL=<rpc> forge test --match-contract ChogArenaForkTest
contract ChogArenaForkTest is Test {
    IERC721 constant CHOG = IERC721(0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763);
    IERC20 constant TOKEN = IERC20(0x350035555E10d9AfAF1566AaebfCeD5BA6C27777);
    address constant WHALE = 0x116e7D070f1888B81E1E0324F56d6746B2D7d8f1;   // a $CHOG holder on mainnet
    uint256 signerKey = 0x5157;
    ChogArena arena;
    address alice = makeAddr("alice"); address bob = makeAddr("bob");

    function setUp() public {
        string memory url = vm.envOr("FORK_URL", string(""));
        if (bytes(url).length == 0) { vm.skip(true); return; }
        vm.createSelectFork(url);
        arena = new ChogArena(CHOG, TOKEN, vm.addr(signerKey));
    }
    function sign(uint256 id, address w) internal view returns (bytes memory) { (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, arena.resultDigest(id, w)); return abi.encodePacked(r, s, v); }

    function test_fork_chogPot() public {
        vm.startPrank(WHALE); TOKEN.transfer(alice, 500 ether); TOKEN.transfer(bob, 500 ether); vm.stopPrank();
        vm.prank(alice); TOKEN.approve(address(arena), 100 ether); vm.prank(alice); uint256 id = arena.openPot(100 ether);
        vm.prank(bob); TOKEN.approve(address(arena), 100 ether); vm.prank(bob); arena.joinPot(id);
        assertEq(TOKEN.balanceOf(address(arena)), 200 ether);
        arena.settle(id, bob, sign(id, bob));
        assertEq(TOKEN.balanceOf(bob), 600 ether); assertEq(TOKEN.balanceOf(alice), 400 ether); assertEq(TOKEN.balanceOf(address(arena)), 0);
    }

    function test_fork_chogForChog() public {
        address o1 = CHOG.ownerOf(1); uint256 t2 = 2; address o2 = CHOG.ownerOf(t2);
        while (o2 == o1) { t2++; o2 = CHOG.ownerOf(t2); }   // two different holders
        vm.prank(o1); CHOG.setApprovalForAll(address(arena), true); vm.prank(o1); uint256 id = arena.open(1);
        vm.prank(o2); CHOG.setApprovalForAll(address(arena), true); vm.prank(o2); arena.join(id, t2);
        assertEq(CHOG.ownerOf(1), address(arena)); assertEq(CHOG.ownerOf(t2), address(arena));
        arena.settle(id, o2, sign(id, o2));
        assertEq(CHOG.ownerOf(1), o2); assertEq(CHOG.ownerOf(t2), o2);
    }

    function test_fork_refundReturnsRealChogs() public {
        address o1 = CHOG.ownerOf(1); uint256 t2 = 2; address o2 = CHOG.ownerOf(t2);
        while (o2 == o1) { t2++; o2 = CHOG.ownerOf(t2); }
        vm.prank(o1); CHOG.setApprovalForAll(address(arena), true); vm.prank(o1); uint256 id = arena.open(1);
        vm.prank(o2); CHOG.setApprovalForAll(address(arena), true); vm.prank(o2); arena.join(id, t2);
        vm.warp(block.timestamp + arena.PLAY_WINDOW() + 1); arena.refund(id);
        assertEq(CHOG.ownerOf(1), o1); assertEq(CHOG.ownerOf(t2), o2);
    }
}
