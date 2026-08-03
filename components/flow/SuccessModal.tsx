"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { truncateAddress, formatDecimalString } from "@/lib/utils/formatting";
import { destinationAddressUrl, sourceAddressUrl, sourceTxUrl, swapUrlFor } from "@/lib/utils/explorer";
import { getSourceChain } from "@/lib/contracts/sourceChains";
import type { DeployResult } from "@/lib/types/flow.types";

interface SuccessModalProps {
  result: DeployResult;
  sourceFeeTxHash?: string | null;
  onReset: () => void;
}

function Row({
  label,
  value,
  href,
  copy = true,
}: {
  label: string;
  value: string;
  href?: string | null;
  copy?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-xs text-text-tertiary">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="truncate font-mono text-xs text-accent-primary underline underline-offset-2"
            title={value}
          >
            {truncateAddress(value, 6)}
          </a>
        ) : (
          <span className="truncate font-mono text-xs text-text-primary" title={value}>
            {value.startsWith("0x") ? truncateAddress(value, 6) : value}
          </span>
        )}
        {copy && <CopyButton value={value} />}
      </span>
    </div>
  );
}

export function SuccessModal({ result, sourceFeeTxHash, onReset }: SuccessModalProps) {
  const swapUrl = swapUrlFor(result.clonedTokenAddress);
  const sourceChain = getSourceChain(result.sourceChainId);
  const unlockDate = new Date(result.unlockTime * 1000);

  return (
    <Modal titleId="success-title">
      <h2 id="success-title" className="text-lg font-bold text-success">
        Wrapper created &amp; LP locked
      </h2>

      <div className="space-y-2 rounded-lg border border-border-subtle p-3">
        {sourceFeeTxHash && (
          <Row
            label={`Source fee (${sourceChain?.name ?? result.sourceChainId})`}
            value={sourceFeeTxHash}
            href={sourceTxUrl(result.sourceChainId, sourceFeeTxHash)}
          />
        )}
        <Row
          label="Launch & LP lock"
          value={result.txHash}
          href={result.explorerUrl}
        />
        <Row
          label="Wrapper address"
          value={result.clonedTokenAddress}
          href={destinationAddressUrl(result.clonedTokenAddress)}
        />
        <Row
          label="LP timelock"
          value={result.lpTimelockAddress}
          href={destinationAddressUrl(result.lpTimelockAddress)}
        />
        <Row label="LP liquidity" value={formatDecimalString(result.lpLiquidity)} copy={false} />
        <Row
          label="DEX router"
          value={result.dexRouter}
          href={destinationAddressUrl(result.dexRouter)}
        />
        <Row
          label={`Source token (${sourceChain?.name ?? result.sourceChainId})`}
          value={result.sourceTokenAddress}
          href={sourceAddressUrl(result.sourceChainId, result.sourceTokenAddress)}
        />
        <Row label="originTokenId" value={result.originTokenId} />
        <Row
          label="Unlock date"
          value={`${unlockDate.toISOString().slice(0, 16).replace("T", " ")} UTC`}
          copy={false}
        />
      </div>

      {swapUrl && (
        <a href={swapUrl} target="_blank" rel="noreferrer" className="block">
          <Button variant="secondary" className="w-full">
            Open Swap ↗
          </Button>
        </a>
      )}

      <Button variant="secondary" onClick={onReset} className="w-full">
        Clone another token
      </Button>
    </Modal>
  );
}
