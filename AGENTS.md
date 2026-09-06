# AI contribution rules

This repository is a teaching project. Keep changes small, explainable, and testable by beginners.

## Non-negotiable boundaries

- This is an educational single-pool AMM, not a production exchange.
- Never ask a learner to paste a private key, seed phrase, encrypted keystore password, API token, or wallet export into chat.
- Use `yarn generate` or `yarn account:import` to create `DEPLOYER_PRIVATE_KEY_ENCRYPTED` locally.
- Never commit `.env`, `.env.local`, generated plaintext keys, wallet files, build output, or logs.
- Never claim a Fuji deployment succeeded unless the transaction and deployed bytecode were checked on chain ID 43113.
- Do not weaken `minAmountOut`, `minShares`, `deadline`, zero-value checks, `nonReentrant`, or checks-effects-interactions merely to make a test pass.
- Do not add upgradeability, admin withdrawal, arbitrary token support, price oracles, routing, or a backend unless the course task explicitly asks for it.

## Source of truth

- Contracts: `packages/hardhat/contracts/`
- Contract tests: `packages/hardhat/test/`
- Deployment: `packages/hardhat/deploy/`
- Fuji/compiler config: `packages/hardhat/hardhat.config.ts`
- Frontend: `packages/nextjs/app/page.tsx`
- Generated address + ABI: `packages/nextjs/contracts/deployedContracts.ts` (never hand-edit)
- Learner brief: `COURSE_TASK.md`
- Security assumptions: `SECURITY.md`

## Required workflow for AI agents

1. Read `README.md`, `COURSE_TASK.md`, and `SECURITY.md` before changing code.
2. State the intended behavior and affected files before editing.
3. Add or update a failing test for each contract behavior change.
4. Run the smallest relevant check, then the full checks below.
5. Report checks as `PASSED`, `FAILED`, `BLOCKED`, or `NOT_RUN`; never turn a skipped check into a pass.
6. Before any GitHub push, inspect `git status`, staged paths, and tracked files for secrets.

## Completion checks

```bash
yarn hardhat:compile
yarn hardhat:check-types
yarn hardhat:lint --max-warnings=0
yarn hardhat:test
# In another terminal: yarn chain
yarn deploy
yarn next:check-types
yarn next:lint --max-warnings=0
yarn next:build
```

Fuji deployment and Vercel publication are separate, credentialed checks and must be reported separately.
