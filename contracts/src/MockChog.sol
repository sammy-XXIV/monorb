// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Test-only stand-in for Chog Genesis (testnet demo + local tests). Anyone can mint.
contract MockChog is ERC721("Test Chog", "TCHOG") {
    function mint(address to, uint256 id) external { _mint(to, id); }
}
