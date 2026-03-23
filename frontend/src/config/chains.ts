import { defineChain } from "viem";
import { baseSepolia } from "wagmi/chains";

export const localFhenix = defineChain({
  id: 412346,
  name: "Local Fhenix",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://localhost:42069"] },
  },
});

export const BASE_SEPOLIA_CHAIN_ID = 84532 as const;

// Focus the app on Base Sepolia for stable production UX.
export const supportedChains = [baseSepolia] as const;

export type SupportedChain = (typeof supportedChains)[number];
