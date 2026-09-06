import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

const INITIAL_AVAX = ethers.parseEther("10");
const INITIAL_TOKENS = ethers.parseEther("1000");
const INITIAL_SHARES = ethers.parseEther("100");
const CLAIM_AMOUNT = ethers.parseEther("1000");

async function futureDeadline(offsetSeconds = 3600) {
  const latestBlock = await ethers.provider.getBlock("latest");
  if (!latestBlock) throw new Error("Latest block was not available");
  return BigInt(latestBlock.timestamp + offsetSeconds);
}

async function deployFixture() {
  const [provider, trader, outsider] = await ethers.getSigners();

  const tokenFactory = await ethers.getContractFactory("CourseToken");
  const token = await tokenFactory.deploy();
  await token.waitForDeployment();

  const ammFactory = await ethers.getContractFactory("FujiV2AMM");
  const amm = await ammFactory.deploy(await token.getAddress());
  await amm.waitForDeployment();

  return { provider, trader, outsider, token, amm, tokenFactory, ammFactory };
}

async function initializedFixture() {
  const fixture = await deployFixture();
  const { provider, token, amm } = fixture;
  const ammAddress = await amm.getAddress();
  const deadline = await futureDeadline();

  await token.connect(provider).claim();
  await token.connect(provider).approve(ammAddress, INITIAL_TOKENS);
  await amm.connect(provider).addLiquidity(INITIAL_TOKENS, INITIAL_SHARES, deadline, { value: INITIAL_AVAX });

  return fixture;
}

describe("CourseToken", function () {
  it("lets each address claim the fixed teaching balance exactly once", async function () {
    const { provider, trader, token } = await networkHelpers.loadFixture(deployFixture);

    await expect(token.connect(provider).claim())
      .to.emit(token, "TokensClaimed")
      .withArgs(provider.address, CLAIM_AMOUNT);
    expect(await token.balanceOf(provider.address)).to.equal(CLAIM_AMOUNT);
    expect(await token.claimed(provider.address)).to.equal(true);

    await expect(token.connect(provider).claim())
      .to.be.revertedWithCustomError(token, "AlreadyClaimed")
      .withArgs(provider.address);

    await token.connect(trader).claim();
    expect(await token.balanceOf(trader.address)).to.equal(CLAIM_AMOUNT);
  });
});

describe("FujiV2AMM", function () {
  describe("deployment and reserve boundaries", function () {
    it("binds one valid token and starts empty", async function () {
      const { token, amm } = await networkHelpers.loadFixture(deployFixture);

      expect(await amm.token()).to.equal(await token.getAddress());
      expect(await amm.FEE_BPS()).to.equal(30n);
      expect(await amm.BPS_DENOMINATOR()).to.equal(10_000n);
      expect(await amm.totalShares()).to.equal(0n);
      const [avaxReserve, tokenReserve] = await amm.getReserves();
      expect(avaxReserve).to.equal(0n);
      expect(tokenReserve).to.equal(0n);
    });

    it("rejects zero-address and non-contract token inputs", async function () {
      const { outsider, ammFactory } = await networkHelpers.loadFixture(deployFixture);

      await expect(ammFactory.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(ammFactory, "InvalidToken")
        .withArgs(ethers.ZeroAddress);
      await expect(ammFactory.deploy(outsider.address))
        .to.be.revertedWithCustomError(ammFactory, "InvalidToken")
        .withArgs(outsider.address);
    });

    it("rejects direct AVAX transfers and unknown payable calls", async function () {
      const { trader, amm } = await networkHelpers.loadFixture(deployFixture);
      const ammAddress = await amm.getAddress();

      await expect(trader.sendTransaction({ to: ammAddress, value: 1n })).to.be.revertedWithCustomError(
        amm,
        "DirectAvaxNotAllowed",
      );
      await expect(
        trader.sendTransaction({ to: ammAddress, value: 1n, data: "0x12345678" }),
      ).to.be.revertedWithCustomError(amm, "DirectAvaxNotAllowed");
    });

    it("documents that forced AVAX changes balance-based reserves", async function () {
      const { amm } = await networkHelpers.loadFixture(initializedFixture);
      const forcedAmount = ethers.parseEther("1");
      await ethers.provider.send("hardhat_setBalance", [
        await amm.getAddress(),
        ethers.toBeHex(INITIAL_AVAX + forcedAmount),
      ]);

      const [avaxReserve] = await amm.getReserves();
      expect(avaxReserve).to.equal(INITIAL_AVAX + forcedAmount);
    });

    it("documents that direct COURSE donations change balance-based reserves", async function () {
      const { trader, token, amm } = await networkHelpers.loadFixture(initializedFixture);
      const donatedAmount = ethers.parseEther("25");

      await token.connect(trader).claim();
      await token.connect(trader).transfer(await amm.getAddress(), donatedAmount);

      const [, tokenReserve] = await amm.getReserves();
      expect(tokenReserve).to.equal(INITIAL_TOKENS + donatedAmount);
    });
  });

  describe("initial and proportional liquidity", function () {
    it("uses the first deposit to set the price and mints geometric-mean shares", async function () {
      const { provider, token, amm } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await futureDeadline();

      await token.connect(provider).claim();
      await token.connect(provider).approve(await amm.getAddress(), INITIAL_TOKENS);

      await expect(
        amm.connect(provider).addLiquidity(INITIAL_TOKENS, INITIAL_SHARES, deadline, { value: INITIAL_AVAX }),
      )
        .to.emit(amm, "LiquidityAdded")
        .withArgs(provider.address, INITIAL_AVAX, INITIAL_TOKENS, INITIAL_SHARES);

      expect(await amm.totalShares()).to.equal(INITIAL_SHARES);
      expect(await amm.getLiquidity(provider.address)).to.equal(INITIAL_SHARES);
      const [avaxReserve, tokenReserve] = await amm.getReserves();
      expect(avaxReserve).to.equal(INITIAL_AVAX);
      expect(tokenReserve).to.equal(INITIAL_TOKENS);
    });

    it("pulls only the proportional token amount and mints proportional shares", async function () {
      const { trader, token, amm } = await networkHelpers.loadFixture(initializedFixture);
      const deadline = await futureDeadline();
      const oneAvax = ethers.parseEther("1");
      const requiredTokens = ethers.parseEther("100");
      const expectedShares = ethers.parseEther("10");

      await token.connect(trader).claim();
      await token.connect(trader).approve(await amm.getAddress(), ethers.parseEther("101"));

      await expect(
        amm.connect(trader).addLiquidity(ethers.parseEther("101"), expectedShares, deadline, { value: oneAvax }),
      )
        .to.emit(amm, "LiquidityAdded")
        .withArgs(trader.address, oneAvax, requiredTokens, expectedShares);

      expect(await token.balanceOf(trader.address)).to.equal(CLAIM_AMOUNT - requiredTokens);
      expect(await amm.getLiquidity(trader.address)).to.equal(expectedShares);
      expect(await amm.totalShares()).to.equal(INITIAL_SHARES + expectedShares);
    });

    it("enforces nonzero inputs, max token cost, minimum shares, allowance and deadline", async function () {
      const { trader, token, amm } = await networkHelpers.loadFixture(initializedFixture);
      const deadline = await futureDeadline();

      await token.connect(trader).claim();

      await expect(amm.connect(trader).addLiquidity(1n, 0n, deadline, { value: 0n })).to.be.revertedWithCustomError(
        amm,
        "InvalidAmount",
      );
      await expect(amm.connect(trader).addLiquidity(0n, 0n, deadline, { value: 1n })).to.be.revertedWithCustomError(
        amm,
        "InvalidAmount",
      );

      await token.connect(trader).approve(await amm.getAddress(), INITIAL_TOKENS);
      await expect(
        amm.connect(trader).addLiquidity(ethers.parseEther("99"), 0n, deadline, { value: ethers.parseEther("1") }),
      )
        .to.be.revertedWithCustomError(amm, "MaxTokenAmountExceeded")
        .withArgs(ethers.parseEther("100"), ethers.parseEther("99"));

      await expect(
        amm.connect(trader).addLiquidity(INITIAL_TOKENS, ethers.parseEther("11"), deadline, {
          value: ethers.parseEther("1"),
        }),
      )
        .to.be.revertedWithCustomError(amm, "InsufficientSharesMinted")
        .withArgs(ethers.parseEther("11"), ethers.parseEther("10"));

      await token.connect(trader).approve(await amm.getAddress(), 0n);
      await expect(
        amm.connect(trader).addLiquidity(INITIAL_TOKENS, 0n, deadline, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance"); // gitleaks:allow -- Solidity error name

      await expect(
        amm.connect(trader).addLiquidity(INITIAL_TOKENS, 0n, 0n, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(amm, "DeadlineExpired");
    });
  });

  describe("quotes and swaps", function () {
    it("quotes the x*y=k output with the 30 bps fee", async function () {
      const { amm } = await networkHelpers.loadFixture(initializedFixture);
      const amountIn = ethers.parseEther("1");
      const amountInWithFee = amountIn * 9_970n;
      const expected = (amountInWithFee * INITIAL_TOKENS) / (INITIAL_AVAX * 10_000n + amountInWithFee);

      expect(await amm.quoteAvaxToToken(amountIn)).to.equal(expected);
      expect(await amm.getAmountOut(amountIn, INITIAL_AVAX, INITIAL_TOKENS)).to.equal(expected);
    });

    it("swaps exact AVAX for tokens and grows the fee-adjusted invariant", async function () {
      const { trader, token, amm } = await networkHelpers.loadFixture(initializedFixture);
      const deadline = await futureDeadline();
      const avaxIn = ethers.parseEther("1");
      const tokenOut = await amm.quoteAvaxToToken(avaxIn);
      const [avaxBefore, tokenBefore] = await amm.getReserves();

      await expect(amm.connect(trader).swapExactAvaxForTokens(tokenOut, deadline, { value: avaxIn }))
        .to.emit(amm, "AvaxToTokenSwap")
        .withArgs(trader.address, avaxIn, tokenOut);

      expect(await token.balanceOf(trader.address)).to.equal(tokenOut);
      const [avaxAfter, tokenAfter] = await amm.getReserves();
      expect(avaxAfter).to.equal(avaxBefore + avaxIn);
      expect(tokenAfter).to.equal(tokenBefore - tokenOut);
      expect(avaxAfter * tokenAfter).to.be.gte(avaxBefore * tokenBefore);
    });

    it("swaps exact tokens for AVAX after approval", async function () {
      const { trader, token, amm } = await networkHelpers.loadFixture(initializedFixture);
      const deadline = await futureDeadline();
      const tokenIn = ethers.parseEther("10");

      await token.connect(trader).claim();
      await token.connect(trader).approve(await amm.getAddress(), tokenIn);
      const avaxOut = await amm.quoteTokenToAvax(tokenIn);
      const [avaxBefore, tokenBefore] = await amm.getReserves();

      await expect(amm.connect(trader).swapExactTokensForAvax(tokenIn, avaxOut, deadline))
        .to.emit(amm, "TokenToAvaxSwap")
        .withArgs(trader.address, tokenIn, avaxOut);

      const [avaxAfter, tokenAfter] = await amm.getReserves();
      expect(avaxAfter).to.equal(avaxBefore - avaxOut);
      expect(tokenAfter).to.equal(tokenBefore + tokenIn);
      expect(avaxAfter * tokenAfter).to.be.gte(avaxBefore * tokenBefore);
    });

    it("rejects quotes and swaps before initialization", async function () {
      const { trader, amm } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await futureDeadline();

      await expect(amm.quoteAvaxToToken(1n)).to.be.revertedWithCustomError(amm, "PoolNotInitialized");
      await expect(amm.quoteTokenToAvax(1n)).to.be.revertedWithCustomError(amm, "PoolNotInitialized");
      await expect(amm.getAmountOut(1n, 0n, 1n)).to.be.revertedWithCustomError(amm, "InsufficientPoolLiquidity");
      await expect(
        amm.connect(trader).swapExactAvaxForTokens(0n, deadline, { value: 1n }),
      ).to.be.revertedWithCustomError(amm, "PoolNotInitialized");
      await expect(amm.connect(trader).swapExactTokensForAvax(1n, 0n, deadline)).to.be.revertedWithCustomError(
        amm,
        "PoolNotInitialized",
      );
      await expect(amm.connect(trader).removeLiquidity(1n, 0n, 0n, deadline)).to.be.revertedWithCustomError(
        amm,
        "PoolNotInitialized",
      );
    });

    it("enforces zero-input, slippage, allowance and deadline protections", async function () {
      const { trader, token, amm } = await networkHelpers.loadFixture(initializedFixture);
      const deadline = await futureDeadline();

      await expect(amm.getAmountOut(0n, 1n, 1n)).to.be.revertedWithCustomError(amm, "InvalidAmount");
      await expect(
        amm.connect(trader).swapExactAvaxForTokens(0n, deadline, { value: 0n }),
      ).to.be.revertedWithCustomError(amm, "InvalidAmount");
      await expect(amm.connect(trader).swapExactTokensForAvax(0n, 0n, deadline)).to.be.revertedWithCustomError(
        amm,
        "InvalidAmount",
      );

      const avaxIn = ethers.parseEther("1");
      const tokenOut = await amm.quoteAvaxToToken(avaxIn);
      await expect(amm.connect(trader).swapExactAvaxForTokens(tokenOut + 1n, deadline, { value: avaxIn }))
        .to.be.revertedWithCustomError(amm, "InsufficientOutputAmount")
        .withArgs(tokenOut + 1n, tokenOut);

      await token.connect(trader).claim();
      const tokenIn = ethers.parseEther("10");
      const avaxOut = await amm.quoteTokenToAvax(tokenIn);
      await expect(amm.connect(trader).swapExactTokensForAvax(tokenIn, avaxOut + 1n, deadline))
        .to.be.revertedWithCustomError(amm, "InsufficientOutputAmount")
        .withArgs(avaxOut + 1n, avaxOut);
      await expect(amm.connect(trader).swapExactTokensForAvax(tokenIn, 0n, deadline)).to.be.revertedWithCustomError(
        token,
        "ERC20InsufficientAllowance",
      );

      await expect(amm.connect(trader).swapExactAvaxForTokens(0n, 0n, { value: avaxIn })).to.be.revertedWithCustomError(
        amm,
        "DeadlineExpired",
      );
      await expect(amm.connect(trader).swapExactTokensForAvax(tokenIn, 0n, 0n)).to.be.revertedWithCustomError(
        amm,
        "DeadlineExpired",
      );
    });
  });

  describe("liquidity removal and interaction safety", function () {
    async function fixtureWithSecondProvider() {
      const fixture = await initializedFixture();
      const { trader, token, amm } = fixture;
      const deadline = await futureDeadline();

      await token.connect(trader).claim();
      await token.connect(trader).approve(await amm.getAddress(), ethers.parseEther("100"));
      await amm.connect(trader).addLiquidity(ethers.parseEther("100"), ethers.parseEther("10"), deadline, {
        value: ethers.parseEther("1"),
      });

      return fixture;
    }

    it("burns shares before paying out proportional reserves", async function () {
      const { trader, token, amm } = await networkHelpers.loadFixture(fixtureWithSecondProvider);
      const deadline = await futureDeadline();
      const shares = ethers.parseEther("5");
      const expectedAvax = ethers.parseEther("0.5");
      const expectedTokens = ethers.parseEther("50");
      const tokenBalanceBefore = await token.balanceOf(trader.address);

      await expect(amm.connect(trader).removeLiquidity(shares, expectedAvax, expectedTokens, deadline))
        .to.emit(amm, "LiquidityRemoved")
        .withArgs(trader.address, shares, expectedAvax, expectedTokens);

      expect(await amm.getLiquidity(trader.address)).to.equal(ethers.parseEther("5"));
      expect(await amm.totalShares()).to.equal(ethers.parseEther("105"));
      expect(await token.balanceOf(trader.address)).to.equal(tokenBalanceBefore + expectedTokens);
    });

    it("enforces share balance, minimum outputs, nonzero input and deadline", async function () {
      const { trader, outsider, amm } = await networkHelpers.loadFixture(fixtureWithSecondProvider);
      const deadline = await futureDeadline();
      const oneShare = ethers.parseEther("1");

      await expect(amm.connect(trader).removeLiquidity(0n, 0n, 0n, deadline)).to.be.revertedWithCustomError(
        amm,
        "InvalidAmount",
      );
      await expect(amm.connect(outsider).removeLiquidity(oneShare, 0n, 0n, deadline))
        .to.be.revertedWithCustomError(amm, "InsufficientLiquidityShares")
        .withArgs(oneShare, 0n);
      await expect(
        amm.connect(trader).removeLiquidity(oneShare, ethers.MaxUint256, 0n, deadline),
      ).to.be.revertedWithCustomError(amm, "InsufficientOutputAmount");
      await expect(
        amm.connect(trader).removeLiquidity(oneShare, 0n, ethers.MaxUint256, deadline),
      ).to.be.revertedWithCustomError(amm, "InsufficientOutputAmount");
      await expect(amm.connect(trader).removeLiquidity(oneShare, 0n, 0n, 0n)).to.be.revertedWithCustomError(
        amm,
        "DeadlineExpired",
      );
    });

    it("blocks callback reentrancy and exposes already-updated LP state", async function () {
      const { provider, trader, token, amm } = await networkHelpers.loadFixture(initializedFixture);
      const deadline = await futureDeadline();

      const attackerFactory = await ethers.getContractFactory("ReentrantLiquidityProvider");
      const attacker = await attackerFactory.deploy(await amm.getAddress(), await token.getAddress());
      await attacker.waitForDeployment();

      await token.connect(trader).claim();
      await token.connect(trader).transfer(await attacker.getAddress(), ethers.parseEther("100"));
      await attacker.connect(provider).provide(ethers.parseEther("100"), deadline, {
        value: ethers.parseEther("1"),
      });

      await attacker.connect(provider).removeAndAttemptReentry(ethers.parseEther("5"), deadline);

      expect(await attacker.reentryAttempted()).to.equal(true);
      expect(await attacker.reentryBlocked()).to.equal(true);
      expect(await attacker.sharesObservedDuringCallback()).to.equal(ethers.parseEther("5"));
      expect(await amm.getLiquidity(await attacker.getAddress())).to.equal(ethers.parseEther("5"));
    });
  });
});
