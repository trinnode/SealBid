import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "fhenix-hardhat-network";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const HAS_VALID_PRIVATE_KEY =
  typeof PRIVATE_KEY === "string" &&
  /^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY) &&
  !/^0x0{64}$/.test(PRIVATE_KEY);
const NETWORK_ACCOUNTS = HAS_VALID_PRIVATE_KEY ? [PRIVATE_KEY] : [];
const ARBITRUM_SEPOLIA_RPC =
  process.env.ARBITRUM_SEPOLIA_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const ETHERSCAN_API_KEY =
  process.env.ETHERSCAN_API_KEY ??
  process.env.BASESCAN_API_KEY ??
  process.env.ARBISCAN_API_KEY ??
  "";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
          viaIR: true,
        },
      },
      {
        version: "0.8.25",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    hardhat: {},
    localfhenix: {
      url: process.env.LOCAL_FHENIX_RPC ?? "http://localhost:42069",
      accounts: NETWORK_ACCOUNTS,
    },
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_RPC,
      accounts: NETWORK_ACCOUNTS,
      chainId: 421614,
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC,
      accounts: NETWORK_ACCOUNTS,
      chainId: 84532,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    // Etherscan V2 uses a single API key across supported explorers.
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 120000,
  },
};

export default config;
