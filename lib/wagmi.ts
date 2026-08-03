import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, coinbaseWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import {
  sepolia,
  mainnet,
  base,
  baseSepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  bsc,
  avalanche,
} from "wagmi/chains";

// No WalletConnect connector on purpose — avoids any dependency on a Reown/WalletConnect
// Cloud project. Only browser-extension (MetaMask, etc.) and Coinbase Wallet are offered.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Wallets",
      wallets: [injectedWallet, coinbaseWallet],
    },
  ],
  { appName: "VAULT", projectId: "unused" },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [
    sepolia,
    mainnet,
    base,
    baseSepolia,
    polygon,
    polygonAmoy,
    arbitrum,
    arbitrumSepolia,
    optimism,
    optimismSepolia,
    bsc,
    avalanche,
  ],
  transports: {
    // Source + destination use env RPC when provided; others fall back to public.
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [mainnet.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimism.id]: http(),
    [optimismSepolia.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
  },
  ssr: true,
});
