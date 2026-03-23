# SealBid

SealBid is a private sealed bid auction application built with Fhenix FHE.

Users submit encrypted bids from the browser. The contract computes the highest bid on encrypted state. During the auction, bid values remain private. At the end, only the highest bid amount is revealed.

## Project Status

SealBid is live on Base Sepolia.

1. Network: Base Sepolia
2. Chain ID: 84532
3. Deployed contract: 0x9847d973FD671DCE663a2e325D97c1E7d49c04CF
4. Explorer: https://sepolia.basescan.org/address/0x9847d973FD671DCE663a2e325D97c1E7d49c04CF

## Why This Project Exists

Classic on chain auctions expose bid values and participant intent. That breaks sealed bid market design and opens the door to strategy leakage.

SealBid treats privacy as a core part of protocol behavior. Bids stay encrypted during submission and ranking. The winner is determined without exposing every bid to the public.

## What We Built

1. A Solidity contract that stores bids as encrypted values
2. Encrypted highest bid tracking with FHE max operations
3. Auction finalization that reveals only the final highest amount
4. Winner claim flow with contract level verification
5. A React frontend for create, bid, finalize, and claim actions
6. Event driven UI updates for bid count and status changes
7. Wallet role transitions for creator and bidder flows

## How Privacy Works In SealBid

When a bidder submits a value, the frontend encrypts it first and sends encrypted input with proof. The contract validates the proof and updates encrypted state.

The contract does not expose raw bid values in events. During auction execution, operations run on encrypted data. At finalization time, only the winning amount is decrypted and stored as the public result.

Non winning bids remain private.

## Contract Flow

1. createAuction
Creates a new auction with metadata and duration.

2. submitBid
Accepts encrypted bid input and updates encrypted highest bid.

3. finalizeAuction
Ends the auction and reveals only the highest bid amount.

4. claimWin
Lets the winning wallet claim after value checks pass.

5. sealMyBid
Returns a sealed output so a bidder can confirm their own bid data.

## Tech Stack

1. Solidity 0.8.24 with Hardhat
2. Fhenix contracts and CoFHE tooling
3. React with TypeScript and Vite
4. wagmi and viem for wallet and contract interactions
5. Tailwind CSS for UI styling

## Local Setup

1. Install dependencies

```bash
pnpm install
cd frontend && pnpm install
```

2. Configure environment

```bash
cp .env.example .env
cd frontend && cp .env.example .env.local
```

3. Compile contracts

```bash
pnpm compile
```

4. Run tests

```bash
pnpm test
```

5. Start frontend

```bash
cd frontend
pnpm dev
```

## Base Deployment Notes

1. Deploy command

```bash
pnpm deploy:base
```

2. Frontend environment values

Set these values in frontend .env.local to match the deployed contract.

VITE_CHAIN_ID=84532
VITE_CONTRACT_ADDRESS=0x9847d973FD671DCE663a2e325D97c1E7d49c04CF
VITE_SEALBID_ADDRESS_84532=0x9847d973FD671DCE663a2e325D97c1E7d49c04CF

## Buildathon Context

This project is built for the Fhenix Privacy by Design dApp Buildathon on Akindo.

1. Grant total: 20000 USDC
2. Pool: 20000 USDC
3. Distribution network: Ethereum
4. Category: Unlimited
5. Tags: Solidity, EVM, privacy, Arbitrum, Base

Judging focus

1. Privacy Architecture
2. Innovation and Originality
3. User Experience
4. Technical Execution
5. Market Potential

## Repository And Community

1. Fhenix GitHub: https://github.com/FhenixProtocol
2. Buildathon community: https://t.me/+rA9gI3AsW8c3YzIx
3. Fhenix docs: https://docs.fhenix.io
4. CoFHE quick start: https://cofhe-docs.fhenix.zone/fhe-library/sdk/quick-start
5. Architecture overview: https://cofhe-docs.fhenix.zone/deep-dive/cofhe-components/overview

## License

MIT
