// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only stand-in for the $CHOG token (local sandbox). Anyone can mint.
contract MockCHOG is ERC20("Test CHOG", "tCHOG") {
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}
