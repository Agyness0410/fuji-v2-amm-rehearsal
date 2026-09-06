import "dotenv/config";
import { defineConfig, overrideTask } from "hardhat/config";
import hardhatToolbox from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import HardhatDeploy from "hardhat-deploy";
import generateTsAbis from "./scripts/generateTsAbis.js";

// Remote deployment goes through runHardhatDeployWithPK.ts, which injects an
// encrypted account at runtime and never stores a plaintext key in the repo.
// With no injected account, a Fuji deployment must fail instead of silently
// falling back to a publicly known local-development key.
const deployerPrivateKey = process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY;
const fujiRpcUrl = process.env.FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";

export const etherscanApiKey = process.env.SNOWTRACE_API_KEY ?? "";

export default defineConfig({
  plugins: [hardhatToolbox, HardhatDeploy],
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: {
          evmVersion: "cancun",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  generateTypedArtifacts: {
    destinations: [
      {
        folder: "./generated",
        mode: "typescript",
      },
    ],
  },
  verify: {
    etherscan: {
      apiKey: etherscanApiKey,
    },
  },
  networks: {
    default: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
    },
    fuji: {
      type: "http",
      chainId: 43113,
      url: fujiRpcUrl,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
  },
  tasks: [
    overrideTask("deploy")
      .setInlineAction(async (args, _hre, runSuper) => {
        await runSuper(args);
        // Every successful deployment regenerates the frontend address + ABI map.
        await generateTsAbis();
      })
      .build(),
  ],
});
