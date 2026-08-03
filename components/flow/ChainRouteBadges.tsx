import { ChainIcon } from "@/components/ui/ChainIcon";
import {
  SOURCE_CHAIN_ID,
  SOURCE_CONTRACTS,
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS,
} from "@/lib/contracts/chainConfig";

/** Permanent test-mode route badges required by spec §7. */
export function ChainRouteBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1 font-medium text-text-secondary">
        <ChainIcon chainId={SOURCE_CHAIN_ID} className="h-3.5 w-3.5" />
        Source: {SOURCE_CONTRACTS.label}
      </span>
      <span aria-hidden className="text-text-tertiary">
        →
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1 font-medium text-text-secondary">
        <ChainIcon chainId={DESTINATION_CHAIN_ID} className="h-3.5 w-3.5" />
        Destination: {DESTINATION_CONTRACTS.label}
      </span>
    </div>
  );
}
