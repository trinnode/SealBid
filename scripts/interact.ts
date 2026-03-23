import { ethers } from 'hardhat'

/**
 * Quick script to interact with a deployed SealBid contract.
 * Set CONTRACT_ADDRESS in your environment before running.
 * Run with: hardhat run scripts/interact.ts --network arbitrumSepolia
 */
async function main() {
  const address = process.env.CONTRACT_ADDRESS
  if (!address) throw new Error('Set CONTRACT_ADDRESS in environment')

  const [signer] = await ethers.getSigners()
  const sealBid = await ethers.getContractAt('SealBid', address, signer)

  // Create a test auction (24 hours)
  const tx = await sealBid.createAuction(
    'My First Sealed Auction',
    'Testing the SealBid protocol',
    86400
  )
  const receipt = await tx.wait()
  console.log('Auction created. Tx:', receipt?.hash)

  const auctionId = await sealBid.auctionCount()
  const auction = await sealBid.getAuction(auctionId)
  console.log('Auction:', {
    id: auction.id.toString(),
    creator: auction.creator,
    title: auction.title,
    endTime: new Date(Number(auction.endTime) * 1000).toISOString(),
  })
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
