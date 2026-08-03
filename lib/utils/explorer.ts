import { DESTINATION_CONTRACTS, DESTINATION_CHAIN_ID } from "@/lib/contracts/chainConfig";
import { getSourceChain } from "@/lib/contracts/sourceChains";
import { baseSepolia, optimismSepolia } from "wagmi/chains";

const DESTINATION_EXPLORER =
  (DESTINATION_CHAIN_ID === optimismSepolia.id ? optimismSepolia : baseSepolia).blockExplorers?.default.url ??
  "https://sepolia.basescan.org";

/** Explorer links for results always point at the DESTINATION chain (spec §8). */
export function destinationAddressUrl(address: string): string {
  return `${DESTINATION_EXPLORER}/address/${address}`;
}

export function destinationTxUrl(hash: string): string {
  return `${DESTINATION_EXPLORER}/tx/${hash}`;
}

export function sourceAddressUrl(chainId: number, address: string): string | null {
  const base = getSourceChain(chainId)?.blockExplorers?.default.url;
  return base ? `${base}/address/${address}` : null;
}

export function sourceTxUrl(chainId: number, hash: string): string | null {
  const base = getSourceChain(chainId)?.blockExplorers?.default.url;
  return base ? `${base}/tx/${hash}` : null;
}

/**
 * Swap URL for the freshly created wrapper. Returns null when the destination swap
 * URL isn't configured — the Open Swap button must stay hidden in that case (spec §7).
 */
export function swapUrlFor(tokenAddress: string): string | null {
  const base = DESTINATION_CONTRACTS.swapUrl.trim();
  if (!base) return null;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}outputCurrency=${tokenAddress}&chain=${DESTINATION_CHAIN_ID}`;
}
