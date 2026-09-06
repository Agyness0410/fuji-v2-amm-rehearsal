"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import toast from "react-hot-toast";
import { formatEther, formatUnits, parseUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";

const parsePositive = (value: string, decimals = 18): bigint | undefined => {
  try {
    const parsed = parseUnits(value, decimals);
    return parsed > 0n ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const sqrt = (value: bigint) => {
  if (value < 2n) return value;
  let x0 = value / 2n;
  let x1 = (x0 + value / x0) / 2n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + value / x0) / 2n;
  }
  return x0;
};

const short = (value?: bigint, decimals = 18, digits = 5) => {
  if (value === undefined) return "—";
  const formatted = formatUnits(value, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  return fraction ? `${whole}.${fraction.slice(0, digits)}`.replace(/\.?0+$/, "") : whole;
};

const Card = ({ title, step, children }: { title: string; step: string; children: ReactNode }) => (
  <section className="workflow-card border border-base-300 bg-base-100 p-6">
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center bg-primary font-mono text-sm font-bold text-primary-content">
        {step}
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
    {children}
  </section>
);

const Field = ({
  label,
  value,
  onChange,
  suffix,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  disabled?: boolean;
}) => (
  <label className="form-control w-full">
    <span className="brand-text-helper mb-2 text-sm">{label}</span>
    <div className="field-shell flex items-center border border-base-300 bg-base-200 px-4 focus-within:border-primary">
      <input
        className="min-w-0 flex-1 bg-transparent py-3 text-lg outline-none"
        inputMode="decimal"
        placeholder="0.0"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
      <span className="ml-3 text-sm font-semibold">{suffix}</span>
    </div>
  </label>
);

const Home: NextPage = () => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: tokenContract } = useDeployedContractInfo({ contractName: "CourseToken" });
  const { data: ammContract } = useDeployedContractInfo({ contractName: "FujiV2AMM" });
  const { data: nativeBalance } = useBalance({ address, chainId: targetNetwork.id });

  const [approveAmount, setApproveAmount] = useState("1000");
  const [addAvax, setAddAvax] = useState("0.02");
  const [initialToken, setInitialToken] = useState("1000");
  const [swapAmount, setSwapAmount] = useState("0.001");
  const [swapDirection, setSwapDirection] = useState<"avaxToToken" | "tokenToAvax">("avaxToToken");
  const [removeShares, setRemoveShares] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [deadlineMinutes, setDeadlineMinutes] = useState("10");

  const { data: reservesData } = useScaffoldReadContract({
    contractName: "FujiV2AMM",
    functionName: "getReserves",
  });
  const reserves = reservesData as readonly [bigint, bigint] | undefined;
  const avaxReserve = reserves?.[0] ?? 0n;
  const tokenReserve = reserves?.[1] ?? 0n;

  const { data: totalSharesData } = useScaffoldReadContract({
    contractName: "FujiV2AMM",
    functionName: "totalShares",
  });
  const totalShares = totalSharesData as bigint | undefined;
  const { data: userSharesData } = useScaffoldReadContract({
    contractName: "FujiV2AMM",
    functionName: "liquidityOf",
    args: [address],
  });
  const userShares = userSharesData as bigint | undefined;
  const { data: tokenBalanceData } = useScaffoldReadContract({
    contractName: "CourseToken",
    functionName: "balanceOf",
    args: [address],
  });
  const tokenBalance = tokenBalanceData as bigint | undefined;
  const { data: allowanceData } = useScaffoldReadContract({
    contractName: "CourseToken",
    functionName: "allowance",
    args: [address, ammContract?.address],
  });
  const allowance = allowanceData as bigint | undefined;
  const { data: claimedData } = useScaffoldReadContract({
    contractName: "CourseToken",
    functionName: "claimed",
    args: [address],
  });
  const hasClaimed = claimedData as boolean | undefined;

  const swapInput = parsePositive(swapAmount);
  const canQuote = avaxReserve > 0n && tokenReserve > 0n && swapInput !== undefined;
  const { data: avaxToTokenQuoteData } = useScaffoldReadContract({
    contractName: "FujiV2AMM",
    functionName: "quoteAvaxToToken",
    args: [swapDirection === "avaxToToken" ? swapInput : undefined],
    query: { enabled: canQuote && swapDirection === "avaxToToken" },
  });
  const { data: tokenToAvaxQuoteData } = useScaffoldReadContract({
    contractName: "FujiV2AMM",
    functionName: "quoteTokenToAvax",
    args: [swapDirection === "tokenToAvax" ? swapInput : undefined],
    query: { enabled: canQuote && swapDirection === "tokenToAvax" },
  });
  const swapQuote = (swapDirection === "avaxToToken" ? avaxToTokenQuoteData : tokenToAvaxQuoteData) as
    | bigint
    | undefined;

  const { writeContractAsync: writeToken, isMining: tokenIsMining } = useScaffoldWriteContract({
    contractName: "CourseToken",
  });
  const { writeContractAsync: writeAmm, isMining: ammIsMining } = useScaffoldWriteContract({
    contractName: "FujiV2AMM",
  });

  const slippageBps = useMemo(() => {
    const numeric = Number(slippage);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric >= 100) return undefined;
    const bps = BigInt(Math.round(numeric * 100));
    return bps < 10_000n ? bps : undefined;
  }, [slippage]);

  const deadline = () => {
    const minutes = Number(deadlineMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) throw new Error("截止时间需在 1–1440 分钟内");
    return BigInt(Math.floor(Date.now() / 1000) + Math.floor(minutes * 60));
  };
  const withSlippageDown = (value: bigint) => {
    if (slippageBps === undefined) throw new Error("滑点需在 0%（含）到 100%（不含）之间");
    return (value * (10_000n - slippageBps)) / 10_000n;
  };
  const run = async (action: () => Promise<unknown>) => {
    if (!address) return toast.error("请先连接钱包");
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "交易未提交");
    }
  };

  const addPreview = useMemo(() => {
    const avaxIn = parsePositive(addAvax);
    const firstToken = parsePositive(initialToken);
    if (!avaxIn || slippageBps === undefined) return undefined;
    if (!totalShares || totalShares === 0n) {
      if (!firstToken) return undefined;
      return { tokenRequired: firstToken, maxToken: firstToken, shares: sqrt(avaxIn * firstToken) };
    }
    if (avaxReserve === 0n) return undefined;
    const tokenRequired = (avaxIn * tokenReserve + avaxReserve - 1n) / avaxReserve;
    const shares = (avaxIn * totalShares) / avaxReserve;
    return {
      tokenRequired,
      maxToken: (tokenRequired * (10_000n + slippageBps) + 9_999n) / 10_000n,
      shares,
    };
  }, [addAvax, initialToken, totalShares, avaxReserve, tokenReserve, slippageBps]);

  const removeInput = parsePositive(removeShares);
  const removePreview =
    removeInput && totalShares && totalShares > 0n
      ? {
          avax: (removeInput * avaxReserve) / totalShares,
          token: (removeInput * tokenReserve) / totalShares,
        }
      : undefined;

  const contractsReady = Boolean(tokenContract && ammContract);
  const busy = tokenIsMining || ammIsMining;

  return (
    <div className="amm-page mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:py-12">
      <header className="amm-hero mb-10 bg-neutral px-6 py-8 text-neutral-content sm:px-10 sm:py-10">
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-neutral-content sm:text-sm">
          {targetNetwork.id === 43113 ? "Avalanche Fuji" : "Local Hardhat"} · chain {targetNetwork.id}
        </p>
        <h1 className="max-w-4xl text-4xl font-bold sm:text-6xl">Uniswap V2 机制教学池</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-neutral-content">
          用无价值的 COURSE 教学币观察 x · y = k、0.50% 手续费、价格影响和 LP 份额。仅限测试网教学，绝不使用真实资产。
        </p>
        {!contractsReady && (
          <div className="alert alert-warning mt-6 text-warning-content">
            当前网络没有找到合约。先运行部署命令，让脚本自动生成地址与 ABI；不要手工填写地址。
          </div>
        )}
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["AVAX 储备", `${short(avaxReserve)} AVAX`],
          ["COURSE 储备", `${short(tokenReserve)} COURSE`],
          ["k = x · y", `${(Number(formatEther(avaxReserve)) * Number(formatUnits(tokenReserve, 18))).toPrecision(6)}`],
          ["我的 LP 份额", short(userShares)],
        ].map(([label, value]) => (
          <div key={label} className="metric-card border border-base-300 bg-base-100 p-5">
            <div className="brand-text-helper font-mono text-xs uppercase tracking-[0.08em]">{label}</div>
            <div className="mt-3 break-all text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </section>

      <section className="info-panel mb-8 grid gap-5 border border-base-300 bg-base-100 p-6 md:grid-cols-3">
        <div>
          <div className="brand-text-helper text-sm">钱包余额</div>
          <div className="mt-1 font-semibold">{nativeBalance ? short(nativeBalance.value) : "—"} AVAX</div>
          <div className="font-semibold">{short(tokenBalance)} COURSE</div>
        </div>
        <div>
          <div className="brand-text-helper text-sm">AMM allowance</div>
          <div className="mt-1 font-semibold">{short(allowance)} COURSE</div>
        </div>
        <div className="brand-text-helper text-xs">
          <div>
            Token: {tokenContract ? <Address address={tokenContract.address} chain={targetNetwork} /> : "未部署"}
          </div>
          <div>AMM: {ammContract ? <Address address={ammContract.address} chain={targetNetwork} /> : "未部署"}</div>
        </div>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <label className="form-control">
          <span className="mb-2 text-sm">滑点保护 (%)</span>
          <input
            className="input input-bordered"
            value={slippage}
            onChange={event => setSlippage(event.target.value)}
          />
        </label>
        <label className="form-control">
          <span className="mb-2 text-sm">交易有效期（分钟）</span>
          <input
            className="input input-bordered"
            value={deadlineMinutes}
            onChange={event => setDeadlineMinutes(event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card step="1" title="领取教学币">
          <p className="brand-text-secondary mb-5 text-sm">
            每个地址只能 Claim 一次。这不等于每人一次，也是课堂要讨论的限制。
          </p>
          <button
            className="btn btn-primary w-full"
            disabled={!contractsReady || !address || hasClaimed || busy}
            onClick={() => run(() => writeToken({ functionName: "claim" }))}
          >
            {hasClaimed ? "这个地址已领取" : "Claim 1,000 COURSE"}
          </button>
        </Card>

        <Card step="2" title="授权 AMM">
          <Field label="授权额度" value={approveAmount} onChange={setApproveAmount} suffix="COURSE" />
          <button
            className="btn btn-primary mt-5 w-full"
            disabled={!contractsReady || !address || !parsePositive(approveAmount) || busy}
            onClick={() =>
              run(async () => {
                const amount = parsePositive(approveAmount);
                if (!amount || !ammContract) throw new Error("请输入大于 0 的授权额度");
                await writeToken({ functionName: "approve", args: [ammContract.address, amount] });
              })
            }
          >
            Approve
          </button>
        </Card>

        <Card step="3" title={totalShares === 0n ? "建立首池" : "增加流动性"}>
          <div className="space-y-4">
            <Field label="投入" value={addAvax} onChange={setAddAvax} suffix="AVAX" />
            {(!totalShares || totalShares === 0n) && (
              <Field label="首池配对数量" value={initialToken} onChange={setInitialToken} suffix="COURSE" />
            )}
          </div>
          <p className="brand-text-secondary mt-4 text-sm">
            预计需要 {short(addPreview?.tokenRequired)} COURSE，预计获得 {short(addPreview?.shares)} LP；合约会校验最大
            Token 输入与最小 LP 输出。
          </p>
          <button
            className="btn btn-primary mt-5 w-full"
            disabled={!contractsReady || !address || !addPreview || addPreview.shares === 0n || busy}
            onClick={() =>
              run(async () => {
                const avaxIn = parsePositive(addAvax);
                if (!avaxIn || !addPreview) throw new Error("请输入有效的流动性数量");
                const minShares = withSlippageDown(addPreview.shares);
                if (minShares === 0n) throw new Error("滑点后的最小 LP 份额不能为 0");
                await writeAmm({
                  functionName: "addLiquidity",
                  args: [addPreview.maxToken, minShares, deadline()],
                  value: avaxIn,
                });
              })
            }
          >
            Add liquidity
          </button>
        </Card>

        <Card step="4" title="Swap">
          <div className="tabs tabs-box mb-4 grid grid-cols-2">
            <button
              className={`tab ${swapDirection === "avaxToToken" ? "tab-active" : ""}`}
              onClick={() => setSwapDirection("avaxToToken")}
            >
              AVAX → COURSE
            </button>
            <button
              className={`tab ${swapDirection === "tokenToAvax" ? "tab-active" : ""}`}
              onClick={() => setSwapDirection("tokenToAvax")}
            >
              COURSE → AVAX
            </button>
          </div>
          <Field
            label="精确输入"
            value={swapAmount}
            onChange={setSwapAmount}
            suffix={swapDirection === "avaxToToken" ? "AVAX" : "COURSE"}
          />
          <p className="brand-text-secondary mt-4 text-sm">
            当前 quote：{short(swapQuote)} {swapDirection === "avaxToToken" ? "COURSE" : "AVAX"}；最小接收：
            {swapQuote && slippageBps !== undefined ? short(withSlippageDown(swapQuote)) : "—"}
          </p>
          <button
            className="btn btn-primary mt-5 w-full"
            disabled={!contractsReady || !address || !swapInput || !swapQuote || swapQuote === 0n || busy}
            onClick={() =>
              run(async () => {
                if (!swapInput || !swapQuote) throw new Error("请输入有效数量并等待 quote");
                const minOut = withSlippageDown(swapQuote);
                if (minOut === 0n) throw new Error("最小输出不能为 0");
                if (swapDirection === "avaxToToken") {
                  await writeAmm({
                    functionName: "swapExactAvaxForTokens",
                    args: [minOut, deadline()],
                    value: swapInput,
                  });
                } else {
                  await writeAmm({
                    functionName: "swapExactTokensForAvax",
                    args: [swapInput, minOut, deadline()],
                  });
                }
              })
            }
          >
            Swap with protection
          </button>
        </Card>

        <div className="lg:col-span-2">
          <Card step="5" title="移除流动性">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="销毁 LP 份额" value={removeShares} onChange={setRemoveShares} suffix="LP" />
              <div className="estimate-panel border-l border-base-300 py-2 pl-4 text-sm">
                <div>预计取回 {short(removePreview?.avax)} AVAX</div>
                <div>预计取回 {short(removePreview?.token)} COURSE</div>
                <div className="brand-text-helper mt-2">两侧资产都使用相同滑点百分比计算最小输出。</div>
              </div>
            </div>
            <button
              className="btn btn-primary mt-5 w-full"
              disabled={
                !contractsReady || !address || !removeInput || !removePreview || slippageBps === undefined || busy
              }
              onClick={() =>
                run(async () => {
                  if (!removeInput || !removePreview) throw new Error("请输入有效 LP 份额");
                  const minAvaxOut = withSlippageDown(removePreview.avax);
                  const minTokenOut = withSlippageDown(removePreview.token);
                  if (minAvaxOut === 0n || minTokenOut === 0n) throw new Error("滑点后的最小输出不能为 0");
                  await writeAmm({
                    functionName: "removeLiquidity",
                    args: [removeInput, minAvaxOut, minTokenOut, deadline()],
                  });
                })
              }
            >
              Remove liquidity
            </button>
          </Card>
        </div>
      </div>

      <aside className="safety-note mt-8 border border-warning/60 bg-warning/10 p-6 text-sm leading-relaxed">
        <strong>安全边界：</strong> 滑点和 deadline 只能约束你愿意接受的结果，不能阻止价格操纵、MEV
        或错误的经济设计。本项目没有生产审计；Fuji 资产也只应来自测试网 faucet。
      </aside>
    </div>
  );
};

export default Home;
