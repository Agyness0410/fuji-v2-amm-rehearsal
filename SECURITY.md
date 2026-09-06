# Security model

## 这套代码保护了什么

- 所有资金入口拒绝零值。
- swap 与移除流动性由调用者提供最小可接受输出；加池提供最小 LP 份额。
- 用户提供绝对 deadline，过期交易回滚。
- OpenZeppelin `SafeERC20` 处理 ERC20 返回值差异。
- 外部资金流函数使用 `nonReentrant`。
- 取款路径先更新 LP 份额，再执行外部转账，遵循 checks-effects-interactions。
- 合约不提供 owner 后门、管理员提款或任意执行。
- 直接向 AMM 发送 AVAX 会回滚，减少储备被意外改变的教学歧义。

## 它没有保护什么

- 没有审计，不承诺生产安全。
- 没有预言机；池价格可以被闪电资金或大额交易短时操纵。
- 前端 quote 只是提交前估算；从签名到打包之间价格仍可能变化。
- 公共 mempool 中仍存在抢跑、夹子交易和 MEV。
- 只有一个池，没有路由、TWAP、协议费、`MINIMUM_LIQUIDITY` 锁定或完整 Uniswap V2 LP ERC20。
- COURSE 无价值，Claim 的“每地址一次”可被创建多个地址绕过。
- 误转 ERC20、强制发送的 AVAX（例如 `selfdestruct`）可能造成余额与经济份额偏离。
- 测试覆盖不等于形式化验证或第三方审计。

## 密钥与部署

不要把真实私钥写进 `.env`。使用 Scaffold-ETH 的本地账户工具把 keystore JSON 加密为 `DEPLOYER_PRIVATE_KEY_ENCRYPTED`，密码只在本机交互输入。公开仓库前检查 Git 历史；一旦 secret 被提交，删除文件并不等于撤销泄露，必须轮换凭据。

Fuji 是测试网，但钱包仍应与主网资产隔离。不要复用保管真实资产的钱包或助记词。

## 报告问题

这是课程模板，不设漏洞赏金。请在公开 issue 中只写复现所需的非敏感信息；不要公开仍有效的凭据。若 fork 用于任何真实价值场景，维护者必须自行安排独立审计与威胁建模。
