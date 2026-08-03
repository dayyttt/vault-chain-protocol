import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  arbitrum,
  optimism,
  optimismSepolia,
  polygon,
  bsc,
  type Chain,
} from "wagmi/chains";
import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { SOURCE_CHAIN_ID } from "./chainConfig";

/** Source chains selectable as the origin of a token (spec §7). Read-only — never written to. */
export const SOURCE_CHAINS: readonly Chain[] = [
  mainnet,
  sepolia,
  base,
  baseSepolia,
  arbitrum,
  optimism,
  polygon,
  bsc,
];

const SOURCE_RPC_OVERRIDE: Record<number, string | undefined> = {
  [SOURCE_CHAIN_ID]: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
  [baseSepolia.id]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
  [optimismSepolia.id]: process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL,
};

// Browser extensions only expose the chain currently selected in the wallet.  Reads for a
// source token, however, must still work after the user switches networks.  Keep a public
// endpoint behind the configured RPC so a temporary provider/CORS/rate-limit issue does not
// turn a valid token into a misleading "RPC unreachable" error.
const SOURCE_RPC_FALLBACKS: Partial<Record<number, string>> = {
  [sepolia.id]: "https://ethereum-sepolia-rpc.publicnode.com",
  [baseSepolia.id]: "https://sepolia.base.org",
  [optimismSepolia.id]: "https://sepolia.optimism.io",
};

export function getSourceChain(chainId: number): Chain | undefined {
  return SOURCE_CHAINS.find((c) => c.id === chainId);
}

export function isSourceChainSupported(chainId: number): boolean {
  return SOURCE_CHAINS.some((c) => c.id === chainId);
}

/**
 * Read-only client for a source chain. Separate from the destination client on
 * purpose — a source RPC failure must never silently fall back to another chain.
 */
export function getSourcePublicClient(chainId: number): PublicClient | undefined {
  const chain = getSourceChain(chainId);
  if (!chain) return undefined;
  const configured = SOURCE_RPC_OVERRIDE[chainId];
  const fallbackUrl = SOURCE_RPC_FALLBACKS[chainId];
  return createPublicClient({
    chain,
    transport:
      configured && fallbackUrl
        ? fallback([http(configured), http(fallbackUrl)])
        : http(configured ?? fallbackUrl),
  }) as PublicClient;
}

export function getSourceExplorerUrl(chainId: number, path: string): string | null {
  const base = getSourceChain(chainId)?.blockExplorers?.default.url;
  return base ? `${base}${path}` : null;
}
