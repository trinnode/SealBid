import { ethers } from "hardhat";

function mockEncryptedBid(value: bigint) {
  return {
    ctHash: value,
    securityZone: 0,
    utype: 6,
    signature: "0x",
  };
}

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Set CONTRACT_ADDRESS in environment");
  }

  const [creator, configuredBidder] = await ethers.getSigners();
  if (!creator) {
    throw new Error("Need at least one funded signer (creator)");
  }

  let bidder = configuredBidder;
  if (!bidder) {
    const ephemeralBidder = ethers.Wallet.createRandom().connect(
      ethers.provider,
    );
    const fundTx = await creator.sendTransaction({
      to: ephemeralBidder.address,
      value: ethers.parseEther("0.002"),
    });
    await fundTx.wait();
    bidder = ephemeralBidder;
    console.log("Funded ephemeral bidder wallet:", bidder.address);
  }

  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Contract:", contractAddress);
  console.log("Creator:", creator.address);
  console.log("Bidder:", bidder.address);

  const sealBidAsCreator = await ethers.getContractAt(
    "SealBid",
    contractAddress,
    creator,
  );
  const sealBidAsBidder = await ethers.getContractAt(
    "SealBid",
    contractAddress,
    bidder,
  );

  console.log("Creating auction...");
  const createTx = await sealBidAsCreator.createAuction(
    "Smoke Auction",
    "Live smoke flow create + bid",
    86400,
  );
  const createReceipt = await createTx.wait();
  console.log("create tx:", createReceipt?.hash);

  const auctionId = await sealBidAsCreator.auctionCount();
  console.log("created auctionId:", auctionId.toString());

  const encryptedBid = mockEncryptedBid(ethers.parseEther("0.01"));
  console.log("Submitting bid...");

  try {
    const bidTx = await sealBidAsBidder.submitBid(auctionId, encryptedBid);
    const bidReceipt = await bidTx.wait();
    console.log("bid tx:", bidReceipt?.hash);

    const auction = await sealBidAsCreator.getAuction(auctionId);
    console.log("bidCount:", auction.bidCount.toString());
    console.log("Smoke result: SUCCESS (create + bid)");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("Smoke result: BID FAILED");
    console.log("bid error:", message);
    throw error;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
