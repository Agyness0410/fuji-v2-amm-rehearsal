import { artifacts, deployScript } from "../rocketh/deploy.js";

/**
 * Deploys the classroom faucet token and its single AVAX/token AMM.
 *
 * The pool is intentionally left empty. The first learner to call addLiquidity
 * chooses the initial price by supplying both assets. No real-network seed or
 * private key is embedded in this script.
 */
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    const courseToken = await deploy("CourseToken", {
      account: deployer,
      artifact: artifacts.CourseToken,
      args: [],
    });

    await deploy("FujiV2AMM", {
      account: deployer,
      artifact: artifacts.FujiV2AMM,
      args: [courseToken.address],
    });
  },
  { tags: ["CourseToken", "FujiV2AMM"] },
);
