const hre = require("hardhat");

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("Set CONTRACT_ADDRESS in environment");
  }

  const { ethers } = hre;
  const [signer] = await ethers.getSigners();

  console.log("signer", signer.address);
  console.log("chain", (await ethers.provider.getNetwork()).chainId.toString());

  const code = await ethers.provider.getCode(address);
  console.log("code_len", code.length);

  const sealBid = await ethers.getContractAt("SealBid", address, signer);

  try {
    const count = await sealBid.auctionCount();
    console.log("auctionCount", count.toString());
  } catch (err) {
    console.log("auctionCount_error", err);
  }

  try {
    const tx = await sealBid.createAuction("Probe", "Probe desc", 86400);
    console.log("create_tx", tx.hash);
    const receipt = await tx.wait();
    console.log("create_status", receipt && receipt.status);
  } catch (err) {
    console.log(
      "create_error",
      err && (err.shortMessage || err.message || err),
    );
    console.log("create_data", err && err.data ? err.data : null);
    console.log("create_reason", err && err.reason ? err.reason : null);
    console.log("create_revert", err && err.revert ? err.revert : null);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
