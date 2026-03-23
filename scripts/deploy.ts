import { ethers, network, run } from "hardhat";

const VERIFY_CONFIRMATIONS = 6;
const VERIFY_RETRIES = 2;
const RETRY_DELAY_MS = 10000;

function getExplorerApiKey(): string {
  return (
    process.env.ETHERSCAN_API_KEY ??
    process.env.BASESCAN_API_KEY ??
    process.env.ARBISCAN_API_KEY ??
    ""
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyDeployment(contractAddress: string): Promise<void> {
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("Skipping verification on local development network.");
    return;
  }

  if (!getExplorerApiKey()) {
    throw new Error(
      "An explorer API key is required for non-local deployments so verification always runs. Set ETHERSCAN_API_KEY, BASESCAN_API_KEY, or ARBISCAN_API_KEY.",
    );
  }

  for (let attempt = 1; attempt <= VERIFY_RETRIES; attempt++) {
    try {
      console.log(
        `Verifying contract (attempt ${attempt}/${VERIFY_RETRIES})...`,
      );
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verification succeeded.");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const alreadyVerified = message
        .toLowerCase()
        .includes("already verified");

      if (alreadyVerified) {
        console.log("Contract is already verified.");
        return;
      }

      if (attempt === VERIFY_RETRIES) {
        throw error;
      }

      console.log(`Verification attempt failed: ${message}`);
      console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer signer found. Set PRIVATE_KEY in your environment before deploying.",
    );
  }

  console.log("Deploying SealBid to:", network.name);
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const Factory = await ethers.getContractFactory("SealBid");
  const sealBid = await Factory.deploy();
  await sealBid.waitForDeployment();

  const address = await sealBid.getAddress();
  console.log("SealBid deployed to:", address);
  console.log("Transaction hash:", sealBid.deploymentTransaction()?.hash);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log(
      `Waiting for ${VERIFY_CONFIRMATIONS} confirmations before verification...`,
    );
    await sealBid.deploymentTransaction()?.wait(VERIFY_CONFIRMATIONS);
  }

  await verifyDeployment(address);

  console.log("\nUpdate VITE_CONTRACT_ADDRESS in frontend/.env.local:");
  const chainId = (await ethers.provider.getNetwork()).chainId.toString();
  console.log("VITE_CONTRACT_ADDRESS=" + address);
  if (chainId === "84532") {
    console.log("VITE_SEALBID_ADDRESS_84532=" + address);
  }
  if (chainId === "421614") {
    console.log("VITE_SEALBID_ADDRESS_421614=" + address);
  }
  console.log("VITE_CHAIN_ID=" + chainId);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
