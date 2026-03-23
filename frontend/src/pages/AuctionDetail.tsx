import { useParams, useNavigate } from "react-router-dom";
import {
  useAuction,
  useAuctionBidActivity,
  useFinalizeAuction,
  useClaimWin,
} from "../hooks/useSealBid";
import { BidForm } from "../components/BidForm";
import {
  ArrowLeftIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  KeyIcon,
  SignalIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { CustomConnectButton } from "../components/CustomConnectButton";
import { getContractAddress, SEALBID_ABI } from "../config/contracts";
import { useAccount, useChainId, useWatchContractEvent } from "wagmi";
import { motion } from "framer-motion";
import { useState } from "react";
import { parseEther } from "viem";

export function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auctionId = id ? BigInt(id) : undefined;
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);

  const {
    data: auction,
    isLoading,
    refetch: refetchAuction,
  } = useAuction(auctionId);
  const {
    data: bidActivity,
    isLoading: isBidActivityLoading,
    error: bidActivityError,
    refetch: refetchBidActivity,
  } = useAuctionBidActivity(auctionId);
  const {
    finalize,
    isPending: isEnding,
    error: finalizeError,
  } = useFinalizeAuction();
  const { claim, isPending: isClaiming, error: claimError } = useClaimWin();
  const [actionError, setActionError] = useState<string | null>(null);
  const [claimNotice, setClaimNotice] = useState<string | null>(null);

  const refetchFromEvent = async (
    observedAuctionId: bigint | undefined,
  ): Promise<void> => {
    if (!auctionId || observedAuctionId === undefined) return;
    if (observedAuctionId !== auctionId) return;

    await Promise.all([refetchAuction(), refetchBidActivity()]);
  };

  useWatchContractEvent({
    address: contractAddress,
    abi: SEALBID_ABI,
    eventName: "BidSubmitted",
    onLogs: (logs) => {
      for (const log of logs) {
        const auctionFromLog = (log as { args?: { auctionId?: bigint } }).args
          ?.auctionId;
        void refetchFromEvent(auctionFromLog);
      }
    },
    enabled: !!contractAddress && auctionId !== undefined,
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: SEALBID_ABI,
    eventName: "AuctionFinalized",
    onLogs: (logs) => {
      for (const log of logs) {
        const auctionFromLog = (log as { args?: { auctionId?: bigint } }).args
          ?.auctionId;
        void refetchFromEvent(auctionFromLog);
      }
    },
    enabled: !!contractAddress && auctionId !== undefined,
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: SEALBID_ABI,
    eventName: "WinnerClaimed",
    onLogs: (logs) => {
      for (const log of logs) {
        const auctionFromLog = (log as { args?: { auctionId?: bigint } }).args
          ?.auctionId;
        void refetchFromEvent(auctionFromLog);
      }
    },
    enabled: !!contractAddress && auctionId !== undefined,
  });

  const handleFinalize = async () => {
    if (!auctionId) return;
    setActionError(null);
    try {
      await finalize(auctionId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Finalize transaction failed.",
      );
    }
  };

  const handleClaim = async () => {
    if (!auctionId) return;

    const entered = window.prompt(
      "Enter your exact bid amount in ETH (example: 0.25):",
    );

    if (!entered) return;

    try {
      setActionError(null);
      setClaimNotice(null);
      const bidAmountWei = parseEther(entered.trim());
      await claim(auctionId, bidAmountWei);
      setClaimNotice(
        "Claim transaction submitted. If winner is not set yet, wait a few seconds and click again to complete decryption verification.",
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Claim transaction could not be prepared.",
      );
    }
  };

  if (isLoading || !auction) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="scene-wrap">
          <div className="aurora-orb aurora-orb-a" />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-12 h-12 border-2 border-[#00ff66] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-[#00ff66] font-mono tracking-widest uppercase text-sm">
            Decrypting Market State...
          </div>
        </div>
      </div>
    );
  }

  const ended =
    auction.finalized || Number(auction.endTime) < Date.now() / 1000;
  const hasWinner =
    auction.winner !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="min-h-screen relative pb-20">
      <div className="scene-wrap fixed inset-0 pointer-events-none">
        <div className="aurora-orb aurora-orb-a" />
        <div className="aurora-orb aurora-orb-b" />
        <div className="perspective-grid" />
      </div>

      <nav className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-white/5 h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-sm uppercase tracking-wider">
              Back to Markets
            </span>
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? "bg-[#00ff66]" : "bg-red-500"}`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? "bg-[#00ff66]" : "bg-red-500"}`}
                ></span>
              </span>
              <span className="text-xs font-mono text-gray-400 uppercase">
                {isConnected ? "Session Active" : "Disconnected"}
              </span>
            </div>
            <CustomConnectButton />
          </div>
        </div>
      </nav>

      <main className="pt-24 px-4 sm:px-6 relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-8 border border-white/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ff66]/5 rounded-bl-full pointer-events-none" />

          <div className="flex items-center gap-3 mb-4">
            <span
              className={`px-3 py-1 text-xs font-mono uppercase tracking-widest rounded-sm border ${
                ended
                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                  : "bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66]/20"
              }`}
            >
              {ended ? "Market Closed" : "Market Active"}
            </span>
            <span className="text-gray-500 font-mono text-sm">
              ID: {auction.id.toString().padStart(4, "0")}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
            {auction.title}
          </h1>
          <p className="text-xl text-gray-400 font-mono max-w-3xl leading-relaxed">
            {auction.description}
          </p>
          <div className="mt-5 text-xs text-gray-500 font-mono break-all">
            Creator: {auction.creator}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="glass-panel p-6 rounded-xl border border-white/5 flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <SignalIcon className="w-6 h-6 text-[#00d4ff]" />
                </div>
                <div>
                  <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                    Total Sealed Bids
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {auction.bidCount.toString()}
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-xl border border-white/5 flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-[#00ff66]" />
                </div>
                <div>
                  <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                    Time Remaining
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {ended
                      ? "00:00:00"
                      : new Date(
                          Number(auction.endTime) * 1000,
                        ).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Closes at expiry block threshold
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Cryptographic Execution Details Wrapper */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-8 rounded-xl border border-white/5"
            >
              <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                <DocumentTextIcon className="w-6 h-6 text-[#00ff66]" />
                Protocol Execution Log
              </h3>

              <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-white/10">
                {/* Mocked/Derived history items */}
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-black border border-[#00ff66]/30 rounded-full flex items-center justify-center">
                    <KeyIcon className="w-3.5 h-3.5 text-[#00ff66]" />
                  </div>
                  <div className="text-sm font-mono text-gray-400 mb-1">
                    Block N-412 &bull; Market Deployed
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <p className="text-white text-sm">
                      Contract parameters instantiated and FHE public key
                      securely mapped.
                    </p>
                  </div>
                </div>

                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-black border border-[#00d4ff]/30 rounded-full flex items-center justify-center">
                    <LockClosedIcon className="w-3.5 h-3.5 text-[#00d4ff]" />
                  </div>
                  <div className="text-sm font-mono text-gray-400 mb-1">
                    Current State &bull; Ingestion
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <p className="text-white text-sm">
                      Accepting tfhe payload variants. All values remain opaque
                      across execution nodes.
                    </p>
                  </div>
                </div>

                {ended && (
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-1 w-7 h-7 bg-black border border-yellow-500/30 rounded-full flex items-center justify-center">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-yellow-500" />
                    </div>
                    <div className="text-sm font-mono text-gray-400 mb-1">
                      Resolution &bull; Finalization Phase
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                      <p className="text-white text-sm">
                        Settlement conditions met. Maximum encrypted value
                        isolated without decryption of subset.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-8 rounded-xl border border-white/5"
            >
              <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                <SignalIcon className="w-6 h-6 text-[#00d4ff]" />
                Bid Activity
              </h3>

              <p className="text-xs text-gray-500 font-mono mb-4">
                Bidder addresses and placement time are public. Bid amounts
                remain encrypted by protocol design.
              </p>

              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="text-xs text-gray-500 font-mono">
                  Refresh bid activity manually.
                </div>
                <button
                  onClick={() => {
                    refetchBidActivity();
                  }}
                  className="px-3 py-1 rounded border border-white/20 text-xs text-white font-mono hover:bg-white/10 transition-colors"
                >
                  Refresh Now
                </button>
              </div>

              {isBidActivityLoading ? (
                <div className="text-sm text-gray-500 font-mono">
                  Loading bid activity...
                </div>
              ) : bidActivityError ? (
                <div className="text-sm text-red-400 font-mono break-words">
                  Failed to load activity: {bidActivityError.message}
                </div>
              ) : bidActivity.length === 0 ? (
                <div className="text-sm text-gray-500 font-mono">
                  No bids recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bidActivity.map((item, idx) => (
                    <div
                      key={`${item.transactionHash}-${idx}`}
                      className="rounded-lg border border-white/10 bg-white/5 p-4"
                    >
                      <div className="text-xs text-gray-400 font-mono break-all">
                        Bidder: {item.bidder}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 font-mono">
                        Placed {relativeTimeFromUnix(item.blockTimestamp)} •
                        Block {item.blockNumber.toString()}
                      </div>
                      <div className="mt-1 text-xs text-[#00d4ff] font-mono">
                        Amount: Encrypted (hidden)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Action Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="glass-panel p-6 rounded-xl border border-[#00ff66]/20 shadow-[0_0_30px_rgba(0,255,102,0.05)] relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <LockClosedIcon className="w-24 h-24 text-[#00ff66]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-6 relative z-10">
                Submit Identity Payload
              </h2>

              <div className="relative z-10">
                {!ended ? (
                  <BidForm auctionId={auctionId!} />
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-center">
                      <SignalIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <h4 className="text-yellow-500 font-bold mb-1">
                        Market Terminated
                      </h4>
                      <p className="text-xs text-yellow-500/70 font-mono">
                        No further ciphertext accepted.
                      </p>
                    </div>

                    {!auction.finalized && (
                      <button
                        onClick={handleFinalize}
                        disabled={isEnding}
                        className="w-full py-4 text-center rounded font-mono font-bold uppercase tracking-widest text-black bg-[#00d4ff] hover:bg-white transition-all disabled:opacity-50"
                      >
                        {isEnding
                          ? "Committing Process..."
                          : "Finalize Protocol"}
                      </button>
                    )}

                    {auction.finalized &&
                      auction.creator === address &&
                      !hasWinner && (
                        <div className="p-4 rounded border border-white/10 bg-white/5 text-center">
                          <p className="text-sm text-gray-400 font-mono">
                            Awaiting highest bidder to execute claim function
                            and decrypt results.
                          </p>
                        </div>
                      )}

                    {auction.finalized && !hasWinner && (
                      <button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="w-full py-4 text-center rounded font-mono font-bold uppercase tracking-widest text-black bg-[#00ff66] hover:shadow-[0_0_15px_rgba(0,255,102,0.4)] transition-all disabled:opacity-50"
                      >
                        {isClaiming
                          ? "Verifying..."
                          : claimNotice
                            ? "Complete Claim Verification"
                            : "Execute Claim Verification"}
                      </button>
                    )}

                    {claimNotice && !hasWinner && (
                      <div className="p-3 rounded border border-[#00ff66]/30 bg-[#00ff66]/10 text-xs text-[#00ff66] font-mono break-words">
                        {claimNotice}
                      </div>
                    )}

                    {(actionError ||
                      finalizeError?.message ||
                      claimError?.message) && (
                      <div className="p-3 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-300 font-mono break-words">
                        {actionError ??
                          finalizeError?.message ??
                          claimError?.message}
                      </div>
                    )}

                    {hasWinner && (
                      <div className="p-4 rounded-xl border border-[#00ff66]/30 bg-[#00ff66]/10 text-center">
                        <ShieldCheckIcon className="w-8 h-8 text-[#00ff66] mx-auto mb-2" />
                        <div className="text-[#00ff66] font-bold text-lg mb-1">
                          Cryptographic Verdict
                        </div>
                        <div className="text-xs text-gray-300 font-mono truncate px-2 mb-2">
                          {auction.winner}
                        </div>
                        <div className="inline-block px-3 py-1 bg-[#00ff66]/20 rounded text-[#00ff66] font-mono text-sm tracking-wider">
                          Finalized State Correct
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl border border-white/5 text-sm">
              <h4 className="text-gray-400 font-mono uppercase tracking-widest mb-4">
                Market Rules
              </h4>
              <ul className="space-y-3 text-gray-500 font-mono text-xs">
                <li className="flex gap-2">
                  <span className="text-[#00ff66]">1.</span> Encryption is
                  performed client-side using Fhenix network keys.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#00ff66]">2.</span> Contract evaluates
                  encrypted values without decryption.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#00ff66]">3.</span> Losing bids remain
                  entirely opaque indefinitely.
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function relativeTimeFromUnix(unixSeconds: number): string {
  if (!unixSeconds) return "just now";

  const now = Math.floor(Date.now() / 1000);
  const delta = Math.max(0, now - unixSeconds);

  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}
