// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFujiV2AMM {
    function addLiquidity(uint256 maxTokenAmount, uint256 minShares, uint256 deadline)
        external
        payable
        returns (uint256 tokenAmount, uint256 sharesMinted);

    function removeLiquidity(uint256 shares, uint256 minAvaxOut, uint256 minTokenOut, uint256 deadline)
        external
        returns (uint256 avaxOut, uint256 tokenOut);

    function getLiquidity(address provider) external view returns (uint256);
}

/// @dev Test-only receiver that attempts to reenter while AVAX is being paid out.
contract ReentrantLiquidityProvider {
    IFujiV2AMM public immutable amm;
    IERC20 public immutable token;

    bool public reentryAttempted;
    bool public reentryBlocked;
    uint256 public sharesObservedDuringCallback;

    constructor(address ammAddress, address tokenAddress) {
        amm = IFujiV2AMM(ammAddress);
        token = IERC20(tokenAddress);
    }

    function provide(uint256 maxTokenAmount, uint256 deadline) external payable {
        token.approve(address(amm), maxTokenAmount);
        amm.addLiquidity{value: msg.value}(maxTokenAmount, 1, deadline);
    }

    function removeAndAttemptReentry(uint256 shares, uint256 deadline) external {
        amm.removeLiquidity(shares, 0, 0, deadline);
    }

    receive() external payable {
        sharesObservedDuringCallback = amm.getLiquidity(address(this));
        reentryAttempted = true;

        try amm.removeLiquidity(1, 0, 0, type(uint256).max) {
            reentryBlocked = false;
        } catch {
            reentryBlocked = true;
        }
    }
}
