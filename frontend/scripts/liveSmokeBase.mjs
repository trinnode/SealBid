import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  getContract,
} from "viem";
import { baseSepolia as viemBaseSepolia } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { baseSepolia as cofheBaseSepolia } from "@cofhe/sdk/chains";
import { Encryptable } from "@cofhe/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_RPC = process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";

if (!CONTRACT_ADDRESS) {
  throw new Error("Missing CONTRACT_ADDRESS env var");
}
if (!PRIVATE_KEY) {
  throw new Error("Missing PRIVATE_KEY env var");
}

const normalizedPrivateKey = PRIVATE_KEY.startsWith("0x")
  ? PRIVATE_KEY
  : `0x${PRIVATE_KEY}`;

if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedPrivateKey)) {
  throw new Error("PRIVATE_KEY must be a 32-byte hex string");
}

async function loadAbi() {
  const artifactPath = path.join(
    projectRoot,
    "artifacts/contracts/SealBid.sol/SealBid.json",
  );
  const raw = await fs.readFile(artifactPath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.abi;
}

async function waitForReceipt(publicClient, txHash, label) {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  if (receipt.status !== "success") {
    throw new Error(`${label} failed: ${txHash}`);
  }
  return receipt;
}

async function main() {
  const abi = await loadAbi();

  const creatorAccount = privateKeyToAccount(normalizedPrivateKey);
  const publicClient = createPublicClient({
    chain: viemBaseSepolia,
    transport: http(BASE_RPC),
  });

  const creatorWalletClient = createWalletClient({
    account: creatorAccount,
    chain: viemBaseSepolia,
    transport: http(BASE_RPC),
  });

  const sealBidAsCreator = getContract({
    address: CONTRACT_ADDRESS,
    abi,
    client: {
      public: publicClient,
      wallet: creatorWalletClient,
    },
  });

  console.log("Creator:", creatorAccount.address);
  console.log("Contract:", CONTRACT_ADDRESS);

  const bidderPrivateKey = generatePrivateKey();
  const bidderAccount = privateKeyToAccount(bidderPrivateKey);

  const bidderWalletClient = createWalletClient({
    account: bidderAccount,
    chain: viemBaseSepolia,
    transport: http(BASE_RPC),
  });

  const sealBidAsBidder = getContract({
    address: CONTRACT_ADDRESS,
    abi,
    client: {
      public: publicClient,
      wallet: bidderWalletClient,
    },
  });

  const createHash = await sealBidAsCreator.write.createAuction([
    "Smoke Auction",
    "Live CoFHE smoke create + bid",
    86400n,
  ]);
  await waitForReceipt(publicClient, createHash, "create auction");
  console.log("create tx:", createHash);

  const auctionId = await sealBidAsCreator.read.auctionCount();
  console.log("auctionId:", auctionId.toString());

  const cofheClient = createCofheClient(
    createCofheConfig({
      environment: "node",
      supportedChains: [cofheBaseSepolia],
    }),
  );

  await cofheClient.connect(publicClient, bidderWalletClient);
  const [encryptedBid] = await cofheClient
    .encryptInputs([Encryptable.uint128(parseEther("0.01"))])
    .setAccount(bidderAccount.address)
    .setChainId(84532)
    .execute();

  // Pre-fund first so RPC gas estimation for the bidder account is stable.
  const initialFunding = parseEther("0.006");
  const initialFundingHash = await creatorWalletClient.sendTransaction({
    account: creatorAccount,
    to: bidderAccount.address,
    value: initialFunding,
  });
  await waitForReceipt(publicClient, initialFundingHash, "initial fund bidder");
  console.log(
    "Bidder funded:",
    bidderAccount.address,
    "amount:",
    initialFunding.toString(),
  );

  const fallbackGasLimit = 3_500_000n;
  let submitGasLimit = fallbackGasLimit;
  try {
    submitGasLimit = await publicClient.estimateContractGas({
      account: bidderAccount.address,
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "submitBid",
      args: [auctionId, encryptedBid],
    });
  } catch (estimateErr) {
    const estimateMessage =
      estimateErr instanceof Error ? estimateErr.message : String(estimateErr);
    console.warn(
      "submitBid gas estimation failed; using fallback gas limit:",
      fallbackGasLimit.toString(),
    );
    console.warn(estimateMessage.substring(0, 260));
  }

  const gasPrice = await publicClient.getGasPrice();
  const estimatedTotalCost = submitGasLimit * gasPrice;
  const requiredTotal =
    estimatedTotalCost + estimatedTotalCost / 2n + parseEther("0.0005");
  if (requiredTotal > initialFunding) {
    const topUp = requiredTotal - initialFunding;
    const topUpHash = await creatorWalletClient.sendTransaction({
      account: creatorAccount,
      to: bidderAccount.address,
      value: topUp,
    });
    await waitForReceipt(publicClient, topUpHash, "top up bidder");
    console.log(
      "Bidder top-up:",
      bidderAccount.address,
      "amount:",
      topUp.toString(),
    );
  }

  const bidHash = await sealBidAsBidder.write.submitBid(
    [auctionId, encryptedBid],
    { gas: submitGasLimit },
  );
  await waitForReceipt(publicClient, bidHash, "submit bid");
  console.log("bid tx:", bidHash);

  const auction = await sealBidAsCreator.read.getAuction([auctionId]);
  console.log("bidCount:", auction[8].toString());
  console.log("Smoke result: SUCCESS (create + bid)");
}

main().catch((err) => {
  console.error("Smoke result: FAILED");
  console.error(err);
  process.exitCode = 1;
});
