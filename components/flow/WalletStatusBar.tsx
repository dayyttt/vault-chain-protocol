"use client";

import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { formatUnits } from "viem";
import { baseSepolia, optimismSepolia, sepolia } from "wagmi/chains";
import { DESTINATION_CHAIN_ID, DESTINATION_CONTRACTS } from "@/lib/contracts/chainConfig";
import { truncateAddress, truncateDecimals } from "@/lib/utils/formatting";
import { WarningTriangleIcon } from "@/components/ui/icons";

/** Short address + native balance, plus the switch-network CTA when off destination (spec §7). */
export function WalletStatusBar({
  onSwitchError,
  allowDestinationSwitch = true,
}: {
  onSwitchError?: (msg: string) => void;
  /** Keep the wallet on Sepolia while the source-chain fee is still outstanding. */
  allowDestinationSwitch?: boolean;
}) {
  const { address, status } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const { data: balance } = useBalance({ address, chainId });

  if (status !== "connected" || !address) return null;

  const wrongNetwork = chainId !== DESTINATION_CHAIN_ID;
  const activeChain = [sepolia, baseSepolia, optimismSepolia].find((chain) => chain.id === chainId);
  const destinationChain = DESTINATION_CHAIN_ID === optimismSepolia.id ? optimismSepolia : baseSepolia;

  const switchToDestination = async () => {
    try {
      await switchChainAsync({ chainId: DESTINATION_CHAIN_ID });
    } catch (error) {
      // MetaMask uses 4902 when the requested testnet has not yet been added.
      const code = (error as { code?: number })?.code;
      const provider = (window as Window & {
        ethereum?: { request: (request: { method: string; params?: unknown[] }) => Promise<unknown> };
      }).ethereum;
      if (code !== 4902 || !provider) {
        onSwitchError?.("Network switch was cancelled or rejected in the wallet.");
        return;
      }
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${DESTINATION_CHAIN_ID.toString(16)}`,
              chainName: destinationChain.name,
              nativeCurrency: destinationChain.nativeCurrency,
              rpcUrls: destinationChain.rpcUrls.default.http,
              blockExplorerUrls: destinationChain.blockExplorers?.default.url
                ? [destinationChain.blockExplorers.default.url]
                : [],
            },
          ],
        });
        await switchChainAsync({ chainId: DESTINATION_CHAIN_ID });
      } catch {
        onSwitchError?.(`Add or switch to ${DESTINATION_CONTRACTS.label} in your wallet to continue.`);
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
        <span className="font-mono">{truncateAddress(address)}</span>
        {balance && (
          <span className="text-text-tertiary">
            {truncateDecimals(formatUnits(balance.value, balance.decimals), 4)} {balance.symbol}
          </span>
        )}
        <span className="text-text-tertiary">{activeChain?.name ?? `Chain ${chainId}`}</span>
      </span>

      {wrongNetwork && allowDestinationSwitch && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => void switchToDestination()}
          className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-warning disabled:opacity-50"
        >
          <WarningTriangleIcon className="h-3.5 w-3.5" />
          {isPending ? "Switching…" : `Switch to ${DESTINATION_CONTRACTS.label}`}
        </button>
      )}
    </div>
  );
}
