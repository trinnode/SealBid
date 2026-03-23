# SealBid

<p align="center">
	<img src="frontend/public/favicon.svg" alt="SealBid Logo" width="96" height="96" />
</p>

<p align="center">
	<img src="https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity" />
	<img src="https://img.shields.io/badge/Hardhat-FFF100?style=for-the-badge&logo=hardhat&logoColor=black" alt="Hardhat" />
	<img src="https://img.shields.io/badge/Fhenix-4B2AFF?style=for-the-badge" alt="Fhenix" />
	<img src="https://img.shields.io/badge/CoFHE-0F172A?style=for-the-badge" alt="CoFHE" />
	<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
	<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
	<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
	<img src="https://img.shields.io/badge/wagmi-1C1C1C?style=for-the-badge" alt="wagmi" />
	<img src="https://img.shields.io/badge/viem-1C1C1C?style=for-the-badge" alt="viem" />
	<img src="https://img.shields.io/badge/RainbowKit-FF4FA3?style=for-the-badge" alt="RainbowKit" />
	<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
	<img src="https://img.shields.io/badge/Base-0052FF?style=for-the-badge&logo=base&logoColor=white" alt="Base" />
</p>

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

```VITE_CHAIN_ID=84532
```
```VITE_CONTRACT_ADDRESS=0x9847d973FD671DCE663a2e325D97c1E7d49c04CF
```
```VITE_SEALBID_ADDRESS_84532=0x9847d973FD671DCE663a2e325D97c1E7d49c04CF
```

## FHENIX Repository And Community

1. Fhenix GitHub: https://github.com/FhenixProtocol
2. Buildathon community: https://t.me/+rA9gI3AsW8c3YzIx
3. Fhenix docs: https://docs.fhenix.io
4. CoFHE quick start: https://cofhe-docs.fhenix.zone/fhe-library/sdk/quick-start
5. Architecture overview: https://cofhe-docs.fhenix.zone/deep-dive/cofhe-components/overview

## License

MIT
