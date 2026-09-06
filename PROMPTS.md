# 给 AI 的 13 个分阶段提示词

一次只给 AI 一个阶段。每个阶段都要留下可核验结果。不要在对话里发送私钥、助记词、钱包密码、访问令牌或含秘密的截图。

## 1. Fork 后确认仓库

> 请只读检查当前仓库是否来自课程母版，告诉我远程仓库、默认分支、项目结构和未提交文件。不要修改代码，也不要 push。

## 2. 建立项目上下文

> 完整阅读 AGENTS.md、README.md、COURSE_TASK.md、SECURITY.md、CourseToken.sol、FujiV2AMM.sol、测试、部署脚本和前端配置。画出从合约到页面的数据路径，并列出不可削弱的安全限制。先不要改文件。

## 3. 选择一个合约需求

> 我要把【规则】从【旧值】改为【新值】。请先定位受影响的合约函数、测试、部署材料和前端字段，写出验收标准与最小修改范围。不要顺手重构无关代码。

## 4. 先补一个失败测试

> 只为上述需求增加最小测试，覆盖预期行为和必要边界。先不要改合约。运行目标测试，确认它因为需求尚未实现而失败，并概括失败证据。语法错误、环境错误或旧测试失败不算有效红灯。

## 5. 最小修改合约

> 根据失败测试实现需求，只改必要的 Solidity 和同步字段。保留 SafeERC20、nonReentrant、checks-effects-interactions、minAmountOut/minShares、deadline 和零输入检查。完成后运行目标测试，再解释每一处 diff 为什么必要。

## 6. 运行完整质量门禁

> 依次运行 yarn hardhat:compile、yarn hardhat:test、yarn ci:contracts、yarn next:check-types、yarn next:lint --max-warnings=0、yarn next:build。只报告 PASSED、FAILED、BLOCKED 或 NOT_RUN，并为失败项附最小错误摘要。不要把跳过项目写成通过。

## 7. 发起 Fuji 部署

> 先只检查 Fuji 配置、chain ID 和部署账户余额。只报告变量名是否存在，不显示变量值。得到我授权后运行 yarn deploy --network fuji；遇到加密账户密码提示时停下来让我在本机操作。

## 8. 把部署密码留给学员

> 我会在本机输入隔离测试账户的加密密码，Hardhat 只在内存中签名。你只继续观察公开交易状态。失败时只报告错误类型，不要要求我粘贴助记词、私钥、密码、keystore 或 token。

## 9. 核验自动生成的 ABI 与地址

> 检查部署回执与 packages/nextjs/contracts/deployedContracts.ts。确认 chain ID 为 43113、CourseToken 和 FujiV2AMM 地址都有链上 bytecode、ABI 包含本次修改。不要手工编辑 deployedContracts.ts，也不要手工复制长 ABI。

## 10. GitHub 公开前审计

> 暂时不要 commit 或 push。检查 git status、完整 diff、未跟踪文件、忽略规则和疑似秘密。只列出可疑文件路径、变量名和风险，不打印秘密值。给我计划提交与必须排除的文件清单，然后等待确认。

## 11. 经授权后 commit 和 push

> 先展示计划提交的文件、diff 摘要和英文 commit message。等我明确回复“允许提交并推送”后，执行普通 commit 和 push。禁止 force push；失败时停止并报告，不要改变远程历史。

## 12. 检查 Actions 并发布 Vercel

> 检查本次 GitHub Actions。失败时定位根因并提出最小修复；全部通过后，再按 README 从仓库根目录运行 yarn vercel 或在 Vercel 导入仓库。只使用 NEXT_PUBLIC_ 开头的公开浏览器配置，不能上传部署私钥。

## 13. 完成端到端验收

> 对公开 URL 做端到端验收：确认目标网络为 Avalanche Fuji 43113，并验证 Claim、Approve、Add Liquidity、两个方向的 Swap、Remove Liquidity。逐项报告 PASSED、FAILED、BLOCKED 或 NOT_RUN，附公开交易哈希或 Explorer 链接；不要泄露钱包秘密。

## 资源

- 课程仓库：<https://github.com/0xherstory/fuji-v2-amm-course>
- Avalanche Fuji Faucet：<https://build.avax.network/console/primary-network/faucet>
- Fuji Explorer：<https://explorer-test.avax.network/c-chain>
- Scaffold-ETH 2：<https://github.com/scaffold-eth/scaffold-eth-2>
- Vercel Git 部署：<https://vercel.com/docs/git>
