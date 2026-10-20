// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ChogArena} from "../src/ChogArena.sol";
import {MockChog} from "../src/MockChog.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ChogArenaTest is Test {
    MockChog chog;
    ChogArena arena;
    uint256 signerKey = 0xA11CE;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address eve = makeAddr("eve");

    function setUp() public {
        chog = new MockChog();
        arena = new ChogArena(chog, IERC20(address(0)), vm.addr(signerKey));
        chog.mint(alice, 1); chog.mint(bob, 2); chog.mint(eve, 3);
        vm.prank(alice); chog.setApprovalForAll(address(arena), true);
        vm.prank(bob); chog.setApprovalForAll(address(arena), true);
        vm.prank(eve); chog.setApprovalForAll(address(arena), true);
    }

    function sign(uint256 key, uint256 id, address winner) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, arena.resultDigest(id, winner));
        return abi.encodePacked(r, s, v);
    }
    function locked() internal returns (uint256 id) {
        vm.prank(alice); id = arena.open(1);
        vm.prank(bob); arena.join(id, 2);
    }

    function test_happyPath_winnerTakesBoth() public {
        uint256 id = locked();
        assertEq(chog.ownerOf(1), address(arena)); assertEq(chog.ownerOf(2), address(arena));
        vm.prank(eve); arena.settle(id, bob, sign(signerKey, id, bob));   // anyone may relay the signed result
        assertEq(chog.ownerOf(1), bob); assertEq(chog.ownerOf(2), bob);
    }
    function test_rejectsWrongSigner() public {
        uint256 id = locked();
        bytes memory forged = sign(0xBAD, id, alice);
        vm.expectRevert(ChogArena.BadSignature.selector); arena.settle(id, alice, forged);
    }
    function test_rejectsSignatureForOtherWinner() public {
        uint256 id = locked();
        bytes memory sigBob = sign(signerKey, id, bob);
        vm.expectRevert(ChogArena.BadSignature.selector); arena.settle(id, alice, sigBob);
    }
    function test_rejectsSignatureFromAnotherMatch() public {
        uint256 id1 = locked();
        vm.prank(eve); uint256 id2 = arena.open(3);
        bytes memory sig = sign(signerKey, id1, alice);
        vm.expectRevert(ChogArena.BadState.selector); arena.settle(id2, alice, sig);   // id2 isn't locked
        bytes memory sigEve = sign(signerKey, id1, eve);
        vm.expectRevert(ChogArena.BadWinner.selector); arena.settle(id1, eve, sigEve);
    }
    function test_cannotSettleTwice() public {
        uint256 id = locked(); bytes memory sig = sign(signerKey, id, alice);
        arena.settle(id, alice, sig);
        vm.expectRevert(ChogArena.BadState.selector); arena.settle(id, alice, sig);
    }
    function test_cannotJoinOwnMatch() public {
        vm.prank(alice); uint256 id = arena.open(1);
        chog.mint(alice, 9);
        vm.prank(alice); vm.expectRevert(ChogArena.NotAllowed.selector); arena.join(id, 9);
    }
    function test_cannotJoinAfterWindow() public {
        vm.prank(alice); uint256 id = arena.open(1);
        vm.warp(block.timestamp + arena.JOIN_WINDOW() + 1);
        vm.prank(bob); vm.expectRevert(ChogArena.TooLate.selector); arena.join(id, 2);
    }
    function test_cancelOnlyByOpenerAndOnlyWhileOpen() public {
        vm.prank(alice); uint256 id = arena.open(1);
        vm.prank(bob); vm.expectRevert(ChogArena.NotAllowed.selector); arena.cancel(id);
        vm.prank(alice); arena.cancel(id); assertEq(chog.ownerOf(1), alice);
        vm.prank(bob); vm.expectRevert(ChogArena.BadState.selector); arena.join(id, 2);
    }
    function test_refundAfterDeadlineReturnsEach() public {
        uint256 id = locked();
        vm.expectRevert(ChogArena.TooEarly.selector); arena.refund(id);
        vm.warp(block.timestamp + arena.PLAY_WINDOW() + 1);
        arena.refund(id);
        assertEq(chog.ownerOf(1), alice); assertEq(chog.ownerOf(2), bob);
        bytes memory late = sign(signerKey, id, alice);
        vm.expectRevert(ChogArena.BadState.selector); arena.settle(id, alice, late);
    }
    function test_onlyOwnerRotatesSigner() public {
        vm.prank(eve); vm.expectRevert(ChogArena.NotOwner.selector); arena.setSigner(eve);
        uint256 id = locked();
        arena.setSigner(vm.addr(0xB0B));
        bytes memory oldKey = sign(signerKey, id, alice);
        vm.expectRevert(ChogArena.BadSignature.selector); arena.settle(id, alice, oldKey);
        arena.settle(id, alice, sign(0xB0B, id, alice));
        assertEq(chog.ownerOf(2), alice);
    }
    function test_cannotOpenWithSomeoneElsesChog() public {
        vm.prank(eve); vm.expectRevert(); arena.open(1);
    }
}

// ---------------- $CHOG pot matches ----------------
import {MockCHOG} from "../src/MockChogToken.sol";

contract ChogArenaPotTest is Test {
    MockChog nft; MockCHOG tok; ChogArena arena;
    uint256 signerKey = 0xA11CE;
    address alice = makeAddr("alice"); address bob = makeAddr("bob"); address eve = makeAddr("eve");
    uint128 constant POT = 100 ether;

    function setUp() public {
        nft = new MockChog(); tok = new MockCHOG();
        arena = new ChogArena(nft, tok, vm.addr(signerKey));
        for (uint256 i; i < 3; i++) { address u = [alice, bob, eve][i]; tok.mint(u, 1000 ether); vm.prank(u); tok.approve(address(arena), type(uint256).max); }
    }
    function sign(uint256 key, uint256 id, address w) internal view returns (bytes memory) { (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, arena.resultDigest(id, w)); return abi.encodePacked(r, s, v); }
    function locked() internal returns (uint256 id) { vm.prank(alice); id = arena.openPot(POT); vm.prank(bob); arena.joinPot(id); }

    function test_pot_winnerTakesAll() public {
        uint256 id = locked();
        assertEq(tok.balanceOf(address(arena)), 2 * POT);
        bytes memory sig = sign(signerKey, id, alice);
        vm.prank(eve); arena.settle(id, alice, sig);
        assertEq(tok.balanceOf(alice), 1000 ether + POT); assertEq(tok.balanceOf(bob), 1000 ether - POT); assertEq(tok.balanceOf(address(arena)), 0);
    }
    function test_pot_zeroAmountRejected() public { vm.prank(alice); vm.expectRevert(ChogArena.BadAmount.selector); arena.openPot(0); }
    function test_pot_cannotJoinPotWithNft_orNftWithPot() public {
        vm.prank(alice); uint256 id = arena.openPot(POT);
        vm.prank(bob); vm.expectRevert(ChogArena.BadState.selector); arena.join(id, 2);
        nft.mint(alice, 1); vm.prank(alice); nft.setApprovalForAll(address(arena), true); vm.prank(alice); uint256 nid = arena.open(1);
        vm.prank(bob); vm.expectRevert(ChogArena.BadState.selector); arena.joinPot(nid);
    }
    function test_pot_cancelReturnsStake() public {
        vm.prank(alice); uint256 id = arena.openPot(POT);
        vm.prank(alice); arena.cancel(id); assertEq(tok.balanceOf(alice), 1000 ether);
    }
    function test_pot_refundAfterDeadline() public {
        uint256 id = locked(); vm.warp(block.timestamp + arena.PLAY_WINDOW() + 1); arena.refund(id);
        assertEq(tok.balanceOf(alice), 1000 ether); assertEq(tok.balanceOf(bob), 1000 ether);
    }
    function test_pot_wrongSignerAndDoubleSettle() public {
        uint256 id = locked(); bytes memory bad = sign(0xBAD, id, bob);
        vm.expectRevert(ChogArena.BadSignature.selector); arena.settle(id, bob, bad);
        bytes memory sig = sign(signerKey, id, bob); arena.settle(id, bob, sig);
        vm.expectRevert(ChogArena.BadState.selector); arena.settle(id, bob, sig);
    }
    function test_pot_joinOwnPotRejected() public { vm.prank(alice); uint256 id = arena.openPot(POT); vm.prank(alice); vm.expectRevert(ChogArena.NotAllowed.selector); arena.joinPot(id); }
}
