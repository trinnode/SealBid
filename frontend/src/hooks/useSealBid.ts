import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { SEALBID_ABI, getContractAddress } from "../config/contracts";
import { parseAbiItem } from "viem";
const MAX_LOG_RANGE = 10_000n;
const BID_SUBMITTED_EVENT = parseAbiItem(
  "event BidSubmitted(uint256 indexed auctionId, address indexed bidder, uint256 totalBids)",
);
const AUCTION_CREATED_EVENT = parseAbiItem(
  "event AuctionCreated(uint256 indexed auctionId, address indexed creator, string title, uint256 endTime)",
);

export interface AuctionData {
  id: bigint;
  creator: string;
  title: string;
  description: string;
  endTime: bigint;
  finalized: boolean;
  winner: string;
  revealedHighestBid: bigint;
  bidCount: bigint;
}

export interface BidActivityItem {
  bidder: string;
  totalBids: bigint;
  blockNumber: bigint;
  blockTimestamp: number;
  transactionHash: string;
}

function formatWriteError(message: string | undefined): string {
  const raw = (message ?? "").toLowerCase();

  if (raw.includes("invalidduration")) {
    return "Invalid duration. Auction duration must be between 1 hour and 30 days.";
  }

  if (raw.includes("invalidtitle")) {
    return "Invalid title or description length. Title must be 1-100 chars and description up to 1000 chars.";
  }

  if (raw.includes("exceeds max transaction gas limit")) {
    return "Transaction gas limit was rejected by the provider path. Retry once; if it persists, switch wallet transport/provider route on Base Sepolia.";
  }

  if (raw.includes("execution reverted")) {
    return "Unexpected on-chain revert. Review the technical details below for the exact revert payload.";
  }

  return message ?? "Transaction failed. Please try again.";
}

function isRpcCompatibilityFailure(message: string | undefined): boolean {
  const raw = (message ?? "").toLowerCase();
  return (
    raw.includes("exceeds max transaction gas limit") ||
    raw.includes("rpc") ||
    raw.includes("method not found") ||
    raw.includes("unsupported") ||
    raw.includes("intrinsic gas too low")
  );
}

/**
 * Read a single auction by ID.
 */
export function useAuction(auctionId: bigint | undefined) {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  const { data, ...rest } = useReadContract({
    address,
    abi: SEALBID_ABI,
    functionName: "getAuction",
    args: auctionId !== undefined ? [auctionId] : undefined,
    query: { enabled: auctionId !== undefined && !!address },
  });

  let formattedData: AuctionData | undefined = undefined;
  if (data) {
    const d = data as readonly any[];
    formattedData = {
      id: d[0],
      creator: d[1],
      title: d[2],
      description: d[3],
      endTime: d[4],
      finalized: d[5],
      winner: d[6],
      revealedHighestBid: d[7],
      bidCount: d[8],
    };
  }

  return { data: formattedData, ...rest };
}

/**
 * Read total auction count (useful for listing all auctions).
 */
export function useAuctionCount() {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  return useReadContract({
    address,
    abi: SEALBID_ABI,
    functionName: "auctionCount",
    query: { enabled: !!address },
  });
}

/**
 * Read bidder list for an auction.
 */
export function useBidders(auctionId: bigint | undefined) {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  return useReadContract({
    address,
    abi: SEALBID_ABI,
    functionName: "getBidders",
    args: auctionId !== undefined ? [auctionId] : undefined,
    query: { enabled: auctionId !== undefined && !!address },
  });
}

export function useAuctionBidActivity(auctionId: bigint | undefined) {
  const chainId = useChainId();
  const address = getContractAddress(chainId);
  const publicClient = usePublicClient({ chainId });
  const [data, setData] = useState<BidActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refetch = useCallback(() => {
    setRefreshNonce((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function load(): Promise<void> {
      if (!auctionId || !address || !publicClient) {
        setData([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const latestBlock = await publicClient.getBlockNumber();

        // Locate the specific auction creation block in 10k windows to avoid
        // free-tier RPC range limits and then query bids forward from that point.
        let auctionCreatedBlock: bigint | null = null;
        let searchTo = latestBlock;

        while (searchTo >= 0n && auctionCreatedBlock === null) {
          const searchFrom =
            searchTo >= MAX_LOG_RANGE - 1n
              ? searchTo - (MAX_LOG_RANGE - 1n)
              : 0n;

          const auctionLogs = await publicClient.getLogs({
            address,
            event: AUCTION_CREATED_EVENT,
            args: { auctionId },
            fromBlock: searchFrom,
            toBlock: searchTo,
          });

          if (auctionLogs.length > 0) {
            const first = auctionLogs[0];
            if (first.blockNumber !== null) {
              auctionCreatedBlock = first.blockNumber;
              break;
            }
          }

          if (searchFrom === 0n) {
            break;
          }
          searchTo = searchFrom - 1n;
        }

        const startBlock =
          auctionCreatedBlock ??
          (latestBlock >= MAX_LOG_RANGE - 1n
            ? latestBlock - (MAX_LOG_RANGE - 1n)
            : 0n);

        const logs = [] as Awaited<
          ReturnType<typeof publicClient.getLogs<typeof BID_SUBMITTED_EVENT>>
        >;

        let from = startBlock;
        while (from <= latestBlock) {
          const to =
            from + (MAX_LOG_RANGE - 1n) <= latestBlock
              ? from + (MAX_LOG_RANGE - 1n)
              : latestBlock;

          const chunkLogs = await publicClient.getLogs({
            address,
            event: BID_SUBMITTED_EVENT,
            args: { auctionId },
            fromBlock: from,
            toBlock: to,
          });
          logs.push(...chunkLogs);

          if (to === latestBlock) {
            break;
          }
          from = to + 1n;
        }

        const uniqueBlockNumbers = Array.from(
          new Set(logs.map((log) => log.blockNumber).filter((v) => v !== null)),
        ) as bigint[];

        const blockEntries = await Promise.all(
          uniqueBlockNumbers.map(async (blockNumber) => {
            const block = await publicClient.getBlock({ blockNumber });
            return [blockNumber.toString(), Number(block.timestamp)] as const;
          }),
        );

        const timestampByBlock = new Map<string, number>(blockEntries);
        const nextData = logs
          .filter(
            (log) =>
              log.blockNumber !== null &&
              log.transactionHash !== null &&
              log.args.bidder !== undefined &&
              log.args.totalBids !== undefined,
          )
          .map((log) => {
            const blockNumber = log.blockNumber as bigint;
            const blockTimestamp =
              timestampByBlock.get(blockNumber.toString()) ?? 0;

            return {
              bidder: log.args.bidder as string,
              totalBids: log.args.totalBids as bigint,
              blockNumber,
              blockTimestamp,
              transactionHash: log.transactionHash as string,
            };
          })
          .sort((a, b) => {
            if (a.blockNumber === b.blockNumber) return 0;
            return a.blockNumber < b.blockNumber ? 1 : -1;
          });

        if (!isCancelled) {
          setData(nextData);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [auctionId, address, publicClient, refreshNonce]);

  return { data, isLoading, error, refetch };
}

/**
 * Create a new auction.
 */
export function useCreateAuction() {
  const chainId = useChainId();
  const { address: account } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const address = getContractAddress(chainId);
  const {
    writeContractAsync,
    data: hash,
    isPending,
    error,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [preflightRawError, setPreflightRawError] = useState<string | null>(
    null,
  );
  const [isPreflighting, setIsPreflighting] = useState(false);

  async function runCreatePreflight(
    title: string,
    description: string,
    durationSeconds: bigint,
  ): Promise<{ ok: true } | { ok: false; message: string; raw: string }> {
    setPreflightError(null);
    setPreflightRawError(null);

    if (!publicClient || !address || !account) {
      return { ok: true };
    }

    setIsPreflighting(true);
    try {
      await publicClient.simulateContract({
        account,
        address,
        abi: SEALBID_ABI,
        functionName: "createAuction",
        args: [title, description, durationSeconds],
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const formatted = formatWriteError(message);
      setPreflightError(formatted);
      setPreflightRawError(message);
      return { ok: false, message: formatted, raw: message };
    } finally {
      setIsPreflighting(false);
    }
  }

  async function create(
    title: string,
    description: string,
    durationSeconds: bigint,
  ) {
    if (!address) throw new Error("Contract not deployed on this chain");

    const preflightResult = await runCreatePreflight(
      title,
      description,
      durationSeconds,
    );

    // Some RPC routes fail simulateContract for FHE paths while write can still succeed.
    // Keep preflight result as warning but do not block the transaction attempt.
    if (!preflightResult.ok) {
      setPreflightError(preflightResult.message);
      setPreflightRawError(preflightResult.raw);
    }

    try {
      return await writeContractAsync({
        address,
        abi: SEALBID_ABI,
        functionName: "createAuction",
        args: [title, description, durationSeconds],
        // Base Sepolia + FHE precompile calls may return unstable estimate ceilings.
        gas: 12_000_000n,
      });
    } catch (firstErr) {
      const firstMessage =
        firstErr instanceof Error ? firstErr.message : String(firstErr);
      if (
        !firstMessage
          .toLowerCase()
          .includes("exceeds max transaction gas limit")
      ) {
        throw firstErr;
      }

      // Retry once with a lower gas cap when provider enforces stricter max gas.
      return await writeContractAsync({
        address,
        abi: SEALBID_ABI,
        functionName: "createAuction",
        args: [title, description, durationSeconds],
        gas: 9_500_000n,
      });
    }
  }

  const combinedCreateError =
    preflightError ?? formatWriteError(error?.message);
  const rpcCompatibilityWarning = isRpcCompatibilityFailure(
    preflightError ?? error?.message,
  )
    ? "RPC simulation may not fully support this FHE createAuction path. The app will still attempt the transaction; if the write also fails, switch wallet transport/provider route on Base Sepolia."
    : null;

  return {
    create,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    formattedError: combinedCreateError,
    technicalError: preflightRawError ?? error?.message ?? null,
    isPreflighting,
    rpcCompatibilityWarning,
  };
}

/**
 * Finalize an auction (callable by anyone after endTime).
 */
export function useFinalizeAuction() {
  const chainId = useChainId();
  const address = getContractAddress(chainId);
  const {
    writeContractAsync,
    data: hash,
    isPending,
    error,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  async function finalize(auctionId: bigint) {
    if (!address) throw new Error("Contract not deployed on this chain");
    return writeContractAsync({
      address,
      abi: SEALBID_ABI,
      functionName: "finalizeAuction",
      args: [auctionId],
    });
  }

  return { finalize, hash, isPending, isConfirming, isSuccess, error };
}

/**
 * Claim a win. Caller must know their plaintext bid amount from the sealMyBid
 * sealed output they decrypted client-side.
 */
export function useClaimWin() {
  const chainId = useChainId();
  const address = getContractAddress(chainId);
  const {
    writeContractAsync,
    data: hash,
    isPending,
    error,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  async function claim(auctionId: bigint, bidAmount: bigint) {
    if (!address) throw new Error("Contract not deployed on this chain");
    return writeContractAsync({
      address,
      abi: SEALBID_ABI,
      functionName: "claimWin",
      args: [auctionId, bidAmount],
    });
  }

  return { claim, hash, isPending, isConfirming, isSuccess, error };
}
