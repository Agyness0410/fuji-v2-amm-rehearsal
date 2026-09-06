# Fuji V2 AMM Course

一个面向初学者的 Avalanche Fuji 教学母版：学员 fork 后，主要修改 Solidity 合约，让 AI 补测试、部署脚本和前端适配，再把自己的合约地址与 ABI 自动带进网页并发布。

它不是完整的 Uniswap V2，也不应该承载真实资产。它保留最值得课堂观察的机制：单一 `AVAX / COURSE` 池、`x · y = k` 定价、0.30% swap fee、LP 份额、滑点下限和交易截止时间。

## 为什么选“薄母版”

官方 [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2) 提供钱包连接、合约 hooks、Hardhat 部署和 ABI 自动生成；[challenge-dex](https://github.com/scaffold-eth/se-2-challenges/tree/challenge-dex) 提供了适合课堂的 AMM 问题框架。本项目将二者收敛为一条 Fuji 学习路径，而不是搬运生产级 Uniswap 前端。

## 学员能做什么

- `Claim`：每个地址领取一次无价值的 COURSE 教学币。
- `Approve`：授权 AMM 使用指定数量的 COURSE。
- `Add liquidity`：首位 LP 建池，后续 LP 按储备比例加入。
- `Swap`：AVAX ↔ COURSE 双向兑换，前端计算 `minAmountOut` 并传入截止时间。
- `Remove liquidity`：按 LP 份额取回两侧资产，并分别设置最小输出。
- 观察 AVAX 储备、COURSE 储备、`k`、钱包余额、allowance 与个人 LP 份额。

## 技术边界

- Avalanche Fuji C-Chain，chain ID `43113`
- Solidity `0.8.30`，`evmVersion: cancun`
- Hardhat 3 + hardhat-deploy/Rocketh
- Next.js 16 + Scaffold-ETH 2 + wagmi/viem
- OpenZeppelin `SafeERC20` 与 `ReentrancyGuard`
- MIT License；上游归属见 [NOTICE.md](./NOTICE.md)

## 1. 本地安装与测试

要求 Node.js `>=22.13.0` 和 Corepack。安装依赖会下载第三方 npm 包，请先确认你在可信网络环境中。

```bash
corepack enable
yarn install --immutable
yarn hardhat:compile
yarn hardhat:test
```

启动本地链并部署：

```bash
# 终端 A
yarn chain

# 终端 B
yarn deploy
yarn start
```

`yarn deploy` 成功后会自动重写 `packages/nextjs/contracts/deployedContracts.ts`，其中包含当前链的合约地址与 ABI。不要手工复制地址，也不要手改这个生成文件。

## 2. 部署到 Fuji

1. 复制 `packages/hardhat/.env.example` 为 `packages/hardhat/.env`，需要时替换 `FUJI_RPC_URL`。
2. 运行 `yarn generate` 生成新的部署账户；或运行 `yarn account:import` 在本机导入。工具只把加密后的 `DEPLOYER_PRIVATE_KEY_ENCRYPTED` 写入本地 `.env`。
3. 用 Avalanche 官方 faucet 给部署地址领取少量 Fuji AVAX。不要使用主网资金。
4. 运行 `yarn deploy --network fuji`。

部署命令会要求你在本机输入加密密码。成功后至少验证：网络是 `43113`、两个地址存在 bytecode、网页生成文件出现 `43113` 记录。再提交部署 JSON 与生成的 `deployedContracts.ts`。

本仓库没有预先伪造一个 Fuji 地址；未经部署交易和链上验证，部署状态只能是 `NOT_RUN`。实际脚本会让学员在本机输入隔离测试账户的加密密码，Hardhat 仅在内存中完成签名。

## 3. 发布到 GitHub 与 Vercel

推送前先让 AI 执行：

```bash
git status --short
git diff --check
git ls-files | rg '(^|/)(\.env|.*\.pem|.*key.*)$' || true
gitleaks dir . --no-banner
yarn ci:contracts
```

随后由学员确认将要公开的文件，再授权 AI commit/push。导入 Vercel 时可选择仓库根目录并使用 `yarn next:build`，或直接运行 `yarn vercel`。

在 Vercel 添加 `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`；若公共 RPC 限流，再添加 `NEXT_PUBLIC_FUJI_RPC_URL`。这些是浏览器公开配置，不应放任何私钥。每次重新部署合约后，提交最新的自动生成地址/ABI，Vercel 才会构建对应版本。

## 4. 推荐课堂顺序

先运行原版并记录一次 swap 前后的 `x`、`y`、`k`；再只改一个合约规则；先让 AI 写失败测试，再实现；本地全绿后才部署 Fuji。具体任务见 [COURSE_TASK.md](./COURSE_TASK.md)，可复制的 AI 对话见 [PROMPTS.md](./PROMPTS.md)，风险边界见 [SECURITY.md](./SECURITY.md)。

## 常用命令

| 目的 | 命令 |
| --- | --- |
| 合约编译 | `yarn hardhat:compile` |
| 合约测试 | `yarn hardhat:test` |
| 本地链 | `yarn chain` |
| 本地部署 + 生成 ABI | `yarn deploy` |
| Fuji 部署 + 生成 ABI | `yarn deploy --network fuji` |
| 前端开发 | `yarn start` |
| 全部 lint | `yarn lint` |
| 前端类型检查 | `yarn next:check-types` |
| 前端生产构建 | `yarn next:build` |

## 许可证

MIT。保留原始 `LICENCE` 与 [NOTICE.md](./NOTICE.md)。Uniswap 名称仅用于描述所教授的公开 AMM 机制；本项目与 Uniswap Labs、Uniswap Foundation 无隶属或背书关系。
