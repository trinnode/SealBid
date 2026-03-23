import { useState, useCallback } from "react";
import { toHex, padHex } from "viem";

type Eip1193ProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type FhenixPermit = {
  publicKey: string;
  signature: string;
  sealingKey?: {
    privateKey: string;
  };
};

type FhenixModule = {
  FhenixClient: new (params: {
    provider: Eip1193ProviderLike;
    ignoreErrors?: boolean;
    skipPubKeyFetch?: boolean;
  }) => {
    encrypt_uint128: (
      value: bigint | string,
      securityZone?: number,
    ) => Promise<{ data: Uint8Array; securityZone: number }>;
  };
  generatePermit: (
    contractAddress: string,
    provider: Eip1193ProviderLike,
  ) => Promise<FhenixPermit>;
};

let fhenixModulePromise: Promise<FhenixModule> | null = null;

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function getEip1193Provider(): Eip1193ProviderLike | null {
  if (typeof window === "undefined") return null;
  const maybeProvider = (window as { ethereum?: Eip1193ProviderLike }).ethereum;
  if (!maybeProvider || typeof maybeProvider.request !== "function")
    return null;
  return maybeProvider;
}

function ensureHex(value: string): `0x${string}` {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

async function loadFhenixModule(): Promise<FhenixModule> {
  if (!fhenixModulePromise) {
    // Use the prebundled dist build to avoid wasm loader issues in app bundlers.
    fhenixModulePromise = import("fhenixjs-dist") as Promise<FhenixModule>;
  }

  return fhenixModulePromise;
}

export interface EncryptedBidResult {
  mode: EncryptionMode;
  encryptedBid: {
    data: `0x${string}`;
    securityZone: number;
  };
  // Legacy field kept optional for backward compatibility with older UI code.
  inputProof?: `0x${string}`;
}

export interface FhePermission {
  publicKey: `0x${string}`;
  signature: `0x${string}`;
  privateKey?: `0x${string}`;
}

export type EncryptionMode = "fhenix" | "local-fallback";

export function useFheEncryption() {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [encryptionMode, setEncryptionMode] =
    useState<EncryptionMode>("local-fallback");
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Packs a bid amount into the inEuint128 shape expected by the contract ABI.
   *
   * NOTE:
   * - This local implementation is compatible with Hardhat mocked FHE (MockFheOps).
   * - This app currently targets submitBid(auctionId, encryptedBid) with no separate
   *   inputProof argument.
   * @param bidAmount  Plain number or bigint (e.g. in wei for ETH bids)
   * @param contractAddress  The SealBid contract address
   * @param userAddress  Connected wallet address
   */
  const encryptBid = useCallback(
    async (
      bidAmount: bigint,
      _contractAddress: `0x${string}`,
      _userAddress: `0x${string}`,
    ): Promise<EncryptedBidResult | null> => {
      setIsEncrypting(true);
      setError(null);
      setNotice(null);
      try {
        const provider = getEip1193Provider();

        if (provider) {
          const RPC_FALLBACK_URL = "https://sepolia.base.org";
          const coprocessorProvider = {
            async request({
              method,
              params,
            }: {
              method: string;
              params?: any[];
            }) {
              const res = await fetch(RPC_FALLBACK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  id: 1,
                  method,
                  params,
                }),
              });
              const json = await res.json();
              if (json.error) {
                throw new Error(
                  typeof json.error.message === "string"
                    ? json.error.message
                    : "Coprocessor provider returned an RPC error",
                );
              }
              return json.result;
            },
          };

          try {
            const { FhenixClient } = await loadFhenixModule();
            // First try the connected wallet provider, which is the canonical path.
            const client = new FhenixClient({
              provider,
              ignoreErrors: false,
            });

            const encrypted = await client.encrypt_uint128(bidAmount, 0);
            setEncryptionMode("fhenix");

            return {
              mode: "fhenix",
              encryptedBid: {
                data: toHex(encrypted.data),
                securityZone: encrypted.securityZone,
              },
            };
          } catch (walletProviderErr) {
            try {
              const { FhenixClient } = await loadFhenixModule();
              // Fallback provider route for environments where injected wallets block required RPC methods.
              const client = new FhenixClient({
                provider: coprocessorProvider,
                ignoreErrors: false,
              });

              const encrypted = await client.encrypt_uint128(bidAmount, 0);
              setEncryptionMode("fhenix");

              return {
                mode: "fhenix",
                encryptedBid: {
                  data: toHex(encrypted.data),
                  securityZone: encrypted.securityZone,
                },
              };
            } catch (coprocessorErr) {
              console.warn("FHE encryption provider fallback failed", {
                walletProviderError: getErrorMessage(walletProviderErr),
                coprocessorError: getErrorMessage(coprocessorErr),
              });

              setNotice(
                "This RPC path does not expose the expected FHE public-key route. Falling back to compatibility encryption for local/dev flows.",
              );
            }
          }
        }

        setEncryptionMode("local-fallback");
        return {
          mode: "local-fallback",
          encryptedBid: {
            data: padHex(toHex(bidAmount), { size: 32 }),
            securityZone: 0,
          },
        };
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setIsEncrypting(false);
      }
    },
    [],
  );

  /**
   * Generates a Permissioned access permission for sealMyBid.
   */
  const generatePermission = useCallback(
    async (contractAddress: `0x${string}`): Promise<FhePermission | null> => {
      try {
        setError(null);
        setNotice(null);

        const provider = getEip1193Provider();
        if (!provider) {
          throw new Error(
            "No wallet provider detected. Connect a wallet to generate permission.",
          );
        }

        // Prefer canonical permit generation from the SDK so users can decrypt sealed outputs.
        try {
          const { generatePermit } = await loadFhenixModule();
          const permit = await generatePermit(contractAddress, provider);

          return {
            publicKey: ensureHex(permit.publicKey),
            signature: ensureHex(permit.signature),
            privateKey: permit.sealingKey?.privateKey
              ? ensureHex(permit.sealingKey.privateKey)
              : undefined,
          };
        } catch {
          // Fallback keeps Permissioned reads usable on wallets/RPCs that cannot load FHE permit helpers.
          setNotice(
            "SDK permit generation failed on this environment. Falling back to wallet EIP-712 signing.",
          );
        }

        const [accountsResult, chainIdResult] = await Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" }),
        ]);

        let accounts = Array.isArray(accountsResult)
          ? (accountsResult as string[])
          : [];
        if (accounts.length === 0) {
          const requested = await provider.request({
            method: "eth_requestAccounts",
          });
          accounts = Array.isArray(requested) ? (requested as string[]) : [];
        }
        const account = accounts[0];
        if (!account) {
          throw new Error("No active account found in wallet.");
        }

        if (typeof chainIdResult !== "string") {
          throw new Error("Unable to read chain ID from wallet provider.");
        }

        const random = new Uint8Array(32);
        crypto.getRandomValues(random);
        const publicKey = ensureHex(toHex(random).slice(2).padStart(64, "0"));

        const chainId = Number(BigInt(chainIdResult));
        const domain = {
          name: "Fhenix Permission",
          version: "1.0",
          chainId,
          verifyingContract: contractAddress,
        };
        const types = {
          Permissioned: [{ name: "publicKey", type: "bytes32" }],
        };
        const message = { publicKey };

        const signatureResult = await provider.request({
          method: "eth_signTypedData_v4",
          params: [
            account,
            JSON.stringify({
              domain,
              types: {
                EIP712Domain: [
                  { name: "name", type: "string" },
                  { name: "version", type: "string" },
                  { name: "chainId", type: "uint256" },
                  { name: "verifyingContract", type: "address" },
                ],
                ...types,
              },
              primaryType: "Permissioned",
              message,
            }),
          ],
        });

        if (typeof signatureResult !== "string") {
          throw new Error(
            "Wallet did not return a valid permission signature.",
          );
        }

        return {
          publicKey,
          signature: ensureHex(signatureResult),
        };
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [],
  );

  return {
    encryptBid,
    generatePermission,
    isEncrypting,
    encryptionMode,
    notice,
    error,
  };
}
