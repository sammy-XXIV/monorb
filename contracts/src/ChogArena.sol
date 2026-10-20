// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ChogArena: winner-takes-all escrow for Bonk Arena 1v1 matches.
/// @notice Two kinds of match: each player escrows one Chog (winner takes both Chogs), or each stakes the same
///         amount of $CHOG (winner takes the pot). The arena server runs the fight and signs the result (EIP-712);
///         a valid signature pays the winner. If no result arrives in time, each player takes their own stake back.
/// @dev Trust: the server signer decides winners. Players can always recover their Chog if it never signs.
contract ChogArena is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;
    enum State { None, Open, Locked, Settled, Closed }

    struct Match {
        address p1;
        address p2;
        uint16 t1;
        uint16 t2;
        uint64 openedAt;
        uint64 lockedAt;
        State state;
        uint128 pot;   // $CHOG each player staked; 0 = a Chog-for-Chog match
    }

    bytes32 public constant RESULT_TYPEHASH = keccak256("Result(uint256 matchId,address winner)");
    uint64 public constant JOIN_WINDOW = 1 hours;
    uint64 public constant PLAY_WINDOW = 6 hours;

    IERC721 public immutable chog;
    IERC20 public immutable chogToken;
    address public owner;
    address public signer;
    uint256 public matchCount;
    mapping(uint256 => Match) public matches;

    event Opened(uint256 indexed matchId, address indexed p1, uint256 tokenId);
    event PotOpened(uint256 indexed matchId, address indexed p1, uint256 amount);
    event Joined(uint256 indexed matchId, address indexed p2, uint256 tokenId);
    event Settled(uint256 indexed matchId, address indexed winner);
    event Cancelled(uint256 indexed matchId);
    event Refunded(uint256 indexed matchId);
    event SignerChanged(address signer);

    error NotOwner();
    error BadState();
    error NotAllowed();
    error TooLate();
    error TooEarly();
    error BadSignature();
    error BadWinner();
    error BadAmount();

    constructor(IERC721 chog_, IERC20 chogToken_, address signer_) EIP712("ChogArena", "1") {
        chog = chog_;
        chogToken = chogToken_;
        owner = msg.sender;
        signer = signer_;
    }

    event OwnerChanged(address owner);

    /// @notice Hand the owner role (it can only rotate the signer) to another wallet.
    function transferOwnership(address owner_) external {
        if (msg.sender != owner) revert NotOwner();
        if (owner_ == address(0)) revert BadAmount();
        owner = owner_;
        emit OwnerChanged(owner_);
    }

    /// @notice Rotate the result signer (e.g. if the server key is replaced). Open and locked matches stay refundable.
    function setSigner(address signer_) external {
        if (msg.sender != owner) revert NotOwner();
        signer = signer_;
        emit SignerChanged(signer_);
    }

    /// @notice Escrow your Chog and open a match. Approve this contract for the token first.
    function open(uint256 tokenId) external nonReentrant returns (uint256 matchId) {
        matchId = ++matchCount;
        matches[matchId] = Match(msg.sender, address(0), uint16(tokenId), 0, uint64(block.timestamp), 0, State.Open, 0);
        chog.transferFrom(msg.sender, address(this), tokenId);
        emit Opened(matchId, msg.sender, tokenId);
    }

    /// @notice Escrow your Chog against an open match.
    function join(uint256 matchId, uint256 tokenId) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.state != State.Open || m.pot != 0) revert BadState();
        if (msg.sender == m.p1) revert NotAllowed();
        if (block.timestamp > m.openedAt + JOIN_WINDOW) revert TooLate();
        m.p2 = msg.sender;
        m.t2 = uint16(tokenId);
        m.lockedAt = uint64(block.timestamp);
        m.state = State.Locked;
        chog.transferFrom(msg.sender, address(this), tokenId);
        emit Joined(matchId, msg.sender, tokenId);
    }

    /// @notice Stake `amount` $CHOG and open a pot match. Approve this contract for the amount first.
    function openPot(uint128 amount) external nonReentrant returns (uint256 matchId) {
        if (amount == 0) revert BadAmount();
        matchId = ++matchCount;
        matches[matchId] = Match(msg.sender, address(0), 0, 0, uint64(block.timestamp), 0, State.Open, amount);
        chogToken.safeTransferFrom(msg.sender, address(this), amount);
        emit PotOpened(matchId, msg.sender, amount);
    }

    /// @notice Match the opener's $CHOG stake.
    function joinPot(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.state != State.Open || m.pot == 0) revert BadState();
        if (msg.sender == m.p1) revert NotAllowed();
        if (block.timestamp > m.openedAt + JOIN_WINDOW) revert TooLate();
        m.p2 = msg.sender;
        m.lockedAt = uint64(block.timestamp);
        m.state = State.Locked;
        chogToken.safeTransferFrom(msg.sender, address(this), m.pot);
        emit Joined(matchId, msg.sender, 0);
    }

    /// @notice Nobody joined: the opener takes their stake back.
    function cancel(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.state != State.Open) revert BadState();
        if (msg.sender != m.p1) revert NotAllowed();
        m.state = State.Closed;
        if (m.pot != 0) chogToken.safeTransfer(m.p1, m.pot);
        else chog.transferFrom(address(this), m.p1, m.t1);
        emit Cancelled(matchId);
    }

    /// @notice Submit the server-signed result. Anyone can submit; the winner gets both Chogs, or the whole $CHOG pot.
    function settle(uint256 matchId, address winner, bytes calldata signature) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.state != State.Locked) revert BadState();
        if (winner != m.p1 && winner != m.p2) revert BadWinner();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(RESULT_TYPEHASH, matchId, winner)));
        if (ECDSA.recover(digest, signature) != signer) revert BadSignature();
        m.state = State.Settled;
        if (m.pot != 0) {
            chogToken.safeTransfer(winner, uint256(m.pot) * 2);
        } else {
            chog.transferFrom(address(this), winner, m.t1);
            chog.transferFrom(address(this), winner, m.t2);
        }
        emit Settled(matchId, winner);
    }

    /// @notice No result in time: each player takes their own Chog back.
    function refund(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.state != State.Locked) revert BadState();
        if (block.timestamp <= m.lockedAt + PLAY_WINDOW) revert TooEarly();
        m.state = State.Closed;
        if (m.pot != 0) {
            chogToken.safeTransfer(m.p1, m.pot);
            chogToken.safeTransfer(m.p2, m.pot);
        } else {
            chog.transferFrom(address(this), m.p1, m.t1);
            chog.transferFrom(address(this), m.p2, m.t2);
        }
        emit Refunded(matchId);
    }

    /// @notice The digest the server signs, exposed so the server and tests agree on it.
    function resultDigest(uint256 matchId, address winner) external view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(RESULT_TYPEHASH, matchId, winner)));
    }
}
