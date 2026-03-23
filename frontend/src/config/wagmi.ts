import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { supportedChains } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "SealBid",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "sealbid-dev",
  chains: [...supportedChains],
  ssr: false,
});
