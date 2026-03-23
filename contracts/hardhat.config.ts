import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "..", ".env") });
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const alchemyKey = process.env.ALCHEMY_API_KEY;
const sepoliaRpc = alchemyKey
  ? `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./src",
    scripts: "./scripts",
  },
  networks: {
    baseSepolia: {
      url: sepoliaRpc,
      accounts: process.env.AGENT_NOEPINAX_PRIVATE_KEY
        ? [process.env.AGENT_NOEPINAX_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

export default config;
