// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title FujiV2AMM
/// @notice A single-pool AVAX/ERC20 AMM for teaching the Uniswap V2 constant-product mechanism.
/// @dev This intentionally omits routing, protocol fees, TWAP oracles and ERC20 LP tokens.
contract FujiV2AMM is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant FEE_BPS = 50;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable token;
    uint256 public totalShares;
    mapping(address provider => uint256 shares) public liquidityOf;

    error InvalidToken(address tokenAddress);
    error InvalidAmount();
    error DeadlineExpired(uint256 deadline, uint256 currentTimestamp);
    error PoolNotInitialized();
    error InsufficientPoolLiquidity();
    error InsufficientOutputAmount(uint256 minimum, uint256 actual);
    error InsufficientSharesMinted(uint256 minimum, uint256 actual);
    error InsufficientLiquidityShares(uint256 requested, uint256 available);
    error MaxTokenAmountExceeded(uint256 required, uint256 maximum);
    error UnsupportedTokenTransfer(uint256 expected, uint256 actual);
    error AvaxTransferFailed();
    error DirectAvaxNotAllowed();

    event LiquidityAdded(address indexed provider, uint256 avaxAmount, uint256 tokenAmount, uint256 sharesMinted);
    event LiquidityRemoved(address indexed provider, uint256 sharesBurned, uint256 avaxAmount, uint256 tokenAmount);
    event AvaxToTokenSwap(address indexed trader, uint256 avaxIn, uint256 tokenOut);
    event TokenToAvaxSwap(address indexed trader, uint256 tokenIn, uint256 avaxOut);

    modifier beforeDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);
        _;
    }

    constructor(address tokenAddress) {
        if (tokenAddress == address(0) || tokenAddress.code.length == 0) {
            revert InvalidToken(tokenAddress);
        }
        token = IERC20(tokenAddress);
    }

    /// @notice Current balances used as reserves. Ordinary direct AVAX calls are rejected.
    /// @dev Forced AVAX and direct COURSE donations still change these balances and therefore pool economics.
    function getReserves() public view returns (uint256 avaxReserve, uint256 tokenReserve) {
        avaxReserve = address(this).balance;
        tokenReserve = token.balanceOf(address(this));
    }

    function getLiquidity(address provider) external view returns (uint256) {
        return liquidityOf[provider];
    }

    /// @notice Quote an exact input with a 0.50% LP fee using x*y=k.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InvalidAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientPoolLiquidity();

        uint256 amountInWithFee = amountIn * (BPS_DENOMINATOR - FEE_BPS);
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * BPS_DENOMINATOR + amountInWithFee);
    }

    function quoteAvaxToToken(uint256 avaxIn) external view returns (uint256 tokenOut) {
        _requireInitialized();
        (uint256 avaxReserve, uint256 tokenReserve) = getReserves();
        tokenOut = getAmountOut(avaxIn, avaxReserve, tokenReserve);
    }

    function quoteTokenToAvax(uint256 tokenIn) external view returns (uint256 avaxOut) {
        _requireInitialized();
        (uint256 avaxReserve, uint256 tokenReserve) = getReserves();
        avaxOut = getAmountOut(tokenIn, tokenReserve, avaxReserve);
    }

    /// @notice Add liquidity. On an empty pool, maxTokenAmount is the exact initial token deposit.
    /// @dev Later deposits preserve the reserve ratio; excess token allowance is never pulled.
    function addLiquidity(uint256 maxTokenAmount, uint256 minShares, uint256 deadline)
        external
        payable
        nonReentrant
        beforeDeadline(deadline)
        returns (uint256 tokenAmount, uint256 sharesMinted)
    {
        if (msg.value == 0 || maxTokenAmount == 0) revert InvalidAmount();

        uint256 tokenBalanceBefore = token.balanceOf(address(this));

        if (totalShares == 0) {
            tokenAmount = maxTokenAmount;
            sharesMinted = Math.sqrt(msg.value * tokenAmount);
        } else {
            // msg.value is already in this contract, so subtract it to read the pre-deposit AVAX reserve.
            uint256 avaxReserveBefore = address(this).balance - msg.value;
            if (avaxReserveBefore == 0 || tokenBalanceBefore == 0) revert InsufficientPoolLiquidity();

            tokenAmount = _ceilDiv(msg.value * tokenBalanceBefore, avaxReserveBefore);
            if (tokenAmount > maxTokenAmount) {
                revert MaxTokenAmountExceeded(tokenAmount, maxTokenAmount);
            }

            uint256 sharesFromAvax = (msg.value * totalShares) / avaxReserveBefore;
            uint256 sharesFromToken = (tokenAmount * totalShares) / tokenBalanceBefore;
            sharesMinted = _min(sharesFromAvax, sharesFromToken);
        }

        if (sharesMinted == 0) revert InsufficientSharesMinted(minShares, 0);
        if (sharesMinted < minShares) revert InsufficientSharesMinted(minShares, sharesMinted);

        // Effects before interaction: a failed or non-standard token transfer reverts the entire transaction.
        totalShares += sharesMinted;
        liquidityOf[msg.sender] += sharesMinted;

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        uint256 received = token.balanceOf(address(this)) - tokenBalanceBefore;
        if (received != tokenAmount) revert UnsupportedTokenTransfer(tokenAmount, received);

        emit LiquidityAdded(msg.sender, msg.value, tokenAmount, sharesMinted);
    }

    function swapExactAvaxForTokens(uint256 minTokenOut, uint256 deadline)
        external
        payable
        nonReentrant
        beforeDeadline(deadline)
        returns (uint256 tokenOut)
    {
        if (msg.value == 0) revert InvalidAmount();
        _requireInitialized();

        uint256 avaxReserveBefore = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));
        tokenOut = getAmountOut(msg.value, avaxReserveBefore, tokenReserve);
        if (tokenOut == 0 || tokenOut < minTokenOut) {
            revert InsufficientOutputAmount(minTokenOut, tokenOut);
        }

        token.safeTransfer(msg.sender, tokenOut);
        emit AvaxToTokenSwap(msg.sender, msg.value, tokenOut);
    }

    function swapExactTokensForAvax(uint256 tokenIn, uint256 minAvaxOut, uint256 deadline)
        external
        nonReentrant
        beforeDeadline(deadline)
        returns (uint256 avaxOut)
    {
        if (tokenIn == 0) revert InvalidAmount();
        _requireInitialized();

        (uint256 avaxReserve, uint256 tokenReserveBefore) = getReserves();
        avaxOut = getAmountOut(tokenIn, tokenReserveBefore, avaxReserve);
        if (avaxOut == 0 || avaxOut < minAvaxOut) {
            revert InsufficientOutputAmount(minAvaxOut, avaxOut);
        }

        token.safeTransferFrom(msg.sender, address(this), tokenIn);
        uint256 received = token.balanceOf(address(this)) - tokenReserveBefore;
        if (received != tokenIn) revert UnsupportedTokenTransfer(tokenIn, received);

        _sendAvax(msg.sender, avaxOut);
        emit TokenToAvaxSwap(msg.sender, tokenIn, avaxOut);
    }

    function removeLiquidity(uint256 shares, uint256 minAvaxOut, uint256 minTokenOut, uint256 deadline)
        external
        nonReentrant
        beforeDeadline(deadline)
        returns (uint256 avaxOut, uint256 tokenOut)
    {
        if (shares == 0) revert InvalidAmount();
        _requireInitialized();

        uint256 providerShares = liquidityOf[msg.sender];
        if (shares > providerShares) revert InsufficientLiquidityShares(shares, providerShares);

        (uint256 avaxReserve, uint256 tokenReserve) = getReserves();
        avaxOut = (shares * avaxReserve) / totalShares;
        tokenOut = (shares * tokenReserve) / totalShares;
        if (avaxOut == 0 || avaxOut < minAvaxOut) {
            revert InsufficientOutputAmount(minAvaxOut, avaxOut);
        }
        if (tokenOut == 0 || tokenOut < minTokenOut) {
            revert InsufficientOutputAmount(minTokenOut, tokenOut);
        }

        // Effects before interactions: callbacks observe the already-burned LP position.
        liquidityOf[msg.sender] = providerShares - shares;
        totalShares -= shares;

        token.safeTransfer(msg.sender, tokenOut);
        _sendAvax(msg.sender, avaxOut);

        emit LiquidityRemoved(msg.sender, shares, avaxOut, tokenOut);
    }

    function _requireInitialized() internal view {
        if (totalShares == 0) revert PoolNotInitialized();
    }

    function _sendAvax(address recipient, uint256 amount) internal {
        (bool success,) = payable(recipient).call{value: amount}("");
        if (!success) revert AvaxTransferFailed();
    }

    function _ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return a == 0 ? 0 : ((a - 1) / b) + 1;
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    receive() external payable {
        revert DirectAvaxNotAllowed();
    }

    fallback() external payable {
        revert DirectAvaxNotAllowed();
    }
}
