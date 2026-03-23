import { createCofheConfig } from "@cofhe/react";
import { getChainById } from "@cofhe/sdk/chains";
import { supportedChains } from "./chains";

export const cofheConfig = createCofheConfig({
  supportedChains: supportedChains.map((chain) => {
    const cofheChain = getChainById(chain.id);
    if (!cofheChain) {
      throw new Error(`Missing CoFHE chain metadata for chain ID ${chain.id}`);
    }

    return {
      ...chain,
      coFheUrl: cofheChain.coFheUrl,
      verifierUrl: cofheChain.verifierUrl,
      thresholdNetworkUrl: cofheChain.thresholdNetworkUrl,
      environment: "TESTNET" as const,
    };
  }),
  environment: "react",
});
