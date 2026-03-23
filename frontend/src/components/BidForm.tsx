import { useState } from "react";
import { parseEther } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { useCofheClient, useCofheConnection } from "@cofhe/react";
import { Encryptable } from "@cofhe/sdk";
import { getContractAddress, SEALBID_ABI } from "../config/contracts";
import { LockClosedIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { CustomConnectButton } from "./CustomConnectButton";

interface BidFormProps {
  auctionId: bigint;
}

function formatSubmitBidError(message: string | undefined): string {
  const raw = (message ?? "").toLowerCase();

  if (raw.includes("0x4d13139e") || raw.includes("aclnotallowed")) {
    return "Encrypted payload ACL denied for this contract call (ACLNotAllowed). Re-encrypt with the active wallet on Base Sepolia and retry.";
  }
  if (raw.includes("creatorcannotbid")) {
    return "Auction creators cannot place bids on their own auction.";
  }
  if (raw.includes("auctionended")) {
    return "This auction is closed. Bidding is no longer allowed.";
  }
  if (raw.includes("auctionalreadyfinalized")) {
    return "This auction has already been finalized.";
  }
  if (raw.includes("auctionnotfound")) {
    return "Auction not found on the selected network.";
  }
  if (
    raw.includes("invalid encrypted input") ||
    raw.includes("invalidsignature")
  ) {
    return "Encrypted bid payload validation failed. Reconnect wallet and retry encryption.";
  }
  if (raw.includes("execution reverted")) {
    return "Transaction would revert on-chain. Check auction status and wallet role for this auction.";
  }

  return message ?? "Transaction failed. Please try again.";
}

export function BidForm({ auctionId }: BidFormProps) {
  const [amount, setAmount] = useState("");
  const [encrypting, setEncrypting] = useState(false);
  const [localFheError, setLocalFheError] = useState<string | null>(null);

  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const cofheClient = useCofheClient();
  const cofheConnection = useCofheConnection();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });

  const {
    writeContractAsync,
    data: hash,
    isPending: writeIsPending,
    error: writeError,
  } = useWriteContract();

  const isCofheConnecting = !!(cofheConnection as { connecting?: boolean })
    .connecting;
  const isPending = writeIsPending || encrypting || isCofheConnecting;
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !account || !contractAddress) return;

    try {
      setEncrypting(true);
      setLocalFheError(null);

      const value = parseEther(amount);
      if (!cofheClient) {
        throw new Error(
          "CoFHE client is not initialized yet. Reconnect your wallet and retry.",
        );
      }

      if (!cofheConnection.connected) {
        if (!publicClient || !walletClient) {
          throw new Error(
            "Wallet client is not ready yet. Wait a moment and retry.",
          );
        }

        await cofheClient.connect(publicClient, walletClient);
      }

      const [encryptedBid] = await cofheClient
        .encryptInputs([Encryptable.uint128(value)])
        .setAccount(account)
        .setChainId(chainId)
        .execute();

      if (!publicClient) {
        throw new Error(
          "Public RPC client is not ready yet. Retry in a moment.",
        );
      }

      await publicClient.simulateContract({
        account,
        address: contractAddress,
        abi: SEALBID_ABI,
        functionName: "submitBid",
        args: [auctionId, encryptedBid],
      });

      await writeContractAsync({
        address: contractAddress,
        abi: SEALBID_ABI,
        functionName: "submitBid",
        args: [auctionId, encryptedBid],
        gas: 9_500_000n,
      } as any);
    } catch (err: any) {
      console.error("Execution Reverted:", err);
      const rawMessage = err?.message ? String(err.message) : String(err ?? "");
      const isWasmLoadFailure =
        rawMessage.includes("WebAssembly.instantiate") ||
        rawMessage.includes("expected magic word") ||
        rawMessage.includes("Failed to initialize TFHE");

      if (isWasmLoadFailure) {
        setLocalFheError(
          "TFHE runtime failed to load (WASM file resolved as HTML). Hard refresh the page and retry. If it persists, restart the frontend dev server.",
        );
        return;
      }

      const formatted = formatSubmitBidError(rawMessage);
      setLocalFheError(
        `${formatted}\n\nTechnical details:\n${rawMessage.substring(0, 220)}`,
      );
    } finally {
      setEncrypting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
          <LockClosedIcon className="w-6 h-6 text-red-500" />
        </div>
        <h4 className="text-white font-bold mb-2">Authentication Layer</h4>
        <p className="text-sm text-gray-400 font-mono mb-6 max-w-sm">
          Cryptographic signing and FHE payload generation requires an active
          wallet session. Bridge connection below.
        </p>
        <CustomConnectButton />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl bg-green-500/10 border border-green-500/30 p-6 text-center"
      >
        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="w-6 h-6 text-green-400" />
        </div>
        <h4 className="text-green-400 font-bold mb-2">Payload Accepted</h4>
        <p className="text-sm text-green-500/70 font-mono">
          Encrypted payload secured on-chain. Zero knowledge of bid amount has
          been maintained.
        </p>
      </motion.div>
    );
  }

  const combinedError = localFheError || writeError?.message || null;
  const isValidAmount = isAmountValid(amount);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">
          Capital Commitment (ETH)
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <span className="text-gray-500 font-mono block group-focus-within:text-[#00ff66] transition-colors">
              Ξ
            </span>
          </div>
          <input
            type="number"
            step="0.0001"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="block w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-lg text-white font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#00ff66] focus:border-[#00ff66] transition-all relative z-0 shadow-inner"
            placeholder="0.00"
            disabled={isPending || encrypting}
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-gray-500 font-mono">
          <LockClosedIcon className="w-4 h-4 shrink-0 text-[#00ff66]" />
          <span>
            CoFHE encrypts bid input before submitBid transaction broadcast.
          </span>
        </p>
      </div>

      {combinedError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-400 font-mono overflow-x-auto whitespace-pre-wrap">
          {combinedError}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || encrypting || !isValidAmount}
        className="group relative w-full flex items-center justify-center py-4 px-4 rounded font-bold text-black bg-white hover:bg-[#00ff66] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:shadow-[0_0_20px_rgba(0,255,102,0.3)]"
      >
        <span className="relative z-10 flex items-center gap-2 font-mono uppercase tracking-wider text-sm transition-transform duration-200 group-hover:scale-105">
          {encrypting
            ? "Encrypting Payload..."
            : isCofheConnecting
              ? "Syncing CoFHE Session..."
              : isPending
                ? "Broadcasting To Network..."
                : isValidAmount
                  ? "Sign & Transmit"
                  : "Input Valid Capital"}
        </span>
      </button>
    </form>
  );
}

function isAmountValid(amount: string) {
  if (!amount) return false;
  try {
    return parseEther(amount) > 0n;
  } catch {
    return false;
  }
}
