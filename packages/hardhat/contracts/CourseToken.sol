// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CourseToken
/// @notice A deliberately simple faucet token for the Fuji AMM classroom lab.
/// @dev Anyone may claim exactly once. This token has no monetary value and is not production-ready.
contract CourseToken is ERC20 {
    uint256 public constant CLAIM_AMOUNT = 1_000 ether;

    mapping(address account => bool hasClaimed) public claimed;

    error AlreadyClaimed(address account);

    event TokensClaimed(address indexed account, uint256 amount);

    constructor() ERC20("Fuji Course Token", "COURSE") {}

    function claim() external returns (uint256 amount) {
        if (claimed[msg.sender]) revert AlreadyClaimed(msg.sender);

        claimed[msg.sender] = true;
        amount = CLAIM_AMOUNT;
        _mint(msg.sender, amount);

        emit TokensClaimed(msg.sender, amount);
    }
}
