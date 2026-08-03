"use client";

import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { WarningTriangleIcon } from "@/components/ui/icons";
import { getSourceChain } from "@/lib/contracts/sourceChains";
import { sourceAddressUrl } from "@/lib/utils/explorer";
import { formatDecimalString, truncateAddress } from "@/lib/utils/formatting";
import type { SourceTokenMetadata } from "@/lib/types/flow.types";

interface SourceTokenBoardProps {
  loading?: boolean;
  metadata: SourceTokenMetadata | null;
  originTokenId?: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-text-tertiary">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-right font-medium text-text-primary">
        {children}
      </span>
    </div>
  );
}

export function SourceTokenBoard({ loading, metadata, originTokenId }: SourceTokenBoardProps) {
  if (loading) {
    return (
      <Card elevated className="space-y-3">
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </Card>
    );
  }

  if (!metadata) return null;

  const chain = getSourceChain(metadata.chainId);
  const explorer = sourceAddressUrl(metadata.chainId, metadata.address);
  const missingIdentity = !metadata.name || !metadata.symbol;

  return (
    <Card elevated className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Source token data
      </p>

      {missingIdentity && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
          <WarningTriangleIcon className="h-4 w-4 shrink-0" />
          <span>
            The token name or symbol couldn&apos;t be read from the contract. Launching is disabled
            because wrapper metadata must match the source token.
          </span>
        </div>
      )}

      <Row label="Name">{metadata.name ?? "—"}</Row>
      <Row label="Symbol">{metadata.symbol ?? "—"}</Row>
      <Row label="Decimals">{metadata.decimals}</Row>
      <Row label="Total supply">{formatDecimalString(metadata.totalSupply)}</Row>
      <Row label="Source network">{chain?.name ?? `Chain ${metadata.chainId}`}</Row>
      <Row label="Source address">
        <span className="truncate font-mono text-xs">{truncateAddress(metadata.address, 6)}</span>
        <CopyButton value={metadata.address} />
      </Row>
      {originTokenId && (
        <Row label="originTokenId">
          <span className="truncate font-mono text-xs">{truncateAddress(originTokenId, 6)}</span>
          <CopyButton value={originTokenId} />
        </Row>
      )}

      {explorer && (
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="block pt-1 text-xs text-accent-primary underline underline-offset-2"
        >
          View source contract on explorer ↗
        </a>
      )}
    </Card>
  );
}
