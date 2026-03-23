import SealBidABI from "../../../artifacts/contracts/SealBid.sol/SealBid.json";
import { getAddress, isAddress } from "viem";

export const SEALBID_ABI = SealBidABI.abi;

function normalizeAddress(
  value: string | undefined,
): `0x${string}` | undefined {
  if (!value) return undefined;
  if (!isAddress(value)) return undefined;
  return getAddress(value);
}

/**
 * Contract addresses per chain.
 * Prefer chain-specific vars in `frontend/.env.local`:
 * - VITE_SEALBID_ADDRESS_421614
 * - VITE_SEALBID_ADDRESS_84532
 * Fallback for single-network dev:
 * - VITE_CONTRACT_ADDRESS
 */
export const CONTRACT_ADDRESSES: Partial<Record<number, `0x${string}`>> = {
  421614:
    normalizeAddress(import.meta.env.VITE_SEALBID_ADDRESS_421614) ??
    normalizeAddress(import.meta.env.VITE_CONTRACT_ADDRESS),
  84532:
    normalizeAddress(import.meta.env.VITE_SEALBID_ADDRESS_84532) ??
    normalizeAddress(import.meta.env.VITE_CONTRACT_ADDRESS),
};

export function getContractAddress(chainId: number): `0x${string}` | undefined {
  return CONTRACT_ADDRESSES[chainId];
}

export const BASE_SEPOLIA_CONTRACT_ADDRESS = CONTRACT_ADDRESSES[84532];
