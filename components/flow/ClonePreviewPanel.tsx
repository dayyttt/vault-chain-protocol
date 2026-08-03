"use client";

import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { WarningTriangleIcon } from "@/components/ui/icons";
import { destinationAddressUrl } from "@/lib/utils/explorer";
import { truncateAddress } from "@/lib/utils/formatting";
import type { ClonePreview } from "@/lib/hooks/useClonePreview";

export function ClonePreviewPanel({ preview }: { preview: ClonePreview }) {
  if (preview.loading) {
    return (
      <Card className="space-y-2">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
      </Card>
    );
  }

  if (preview.error) {
    return (
      <Card className="flex items-start gap-2 border-warning/30 text-xs text-warning">
        <WarningTriangleIcon className="h-4 w-4 shrink-0" />
        <span>{preview.error}</span>
      </Card>
    );
  }

  if (preview.existing) {
    const { token, creator, lpTimelock } = preview.existing;
    return (
      <Card className="space-y-2 border-warning/30">
        <div className="flex items-start gap-2 text-xs text-warning">
          <WarningTriangleIcon className="h-4 w-4 shrink-0" />
          <span>
            This token has already been cloned on the destination network. A new launch is blocked
            to prevent duplicates.
          </span>
        </div>
        <div className="space-y-1.5 border-t border-border-subtle pt-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-tertiary">Wrapper</span>
            <span className="flex items-center gap-1.5">
              <a
                href={destinationAddressUrl(token)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-accent-primary underline underline-offset-2"
              >
                {truncateAddress(token, 6)}
              </a>
              <CopyButton value={token} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-tertiary">LP timelock</span>
            <span className="font-mono text-xs text-text-primary">
              {truncateAddress(lpTimelock, 6)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-tertiary">Creator</span>
            <span className="font-mono text-xs text-text-primary">
              {truncateAddress(creator, 6)}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  if (!preview.predictedAddress) return null;

  return (
    <Card className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Predicted wrapper address (CREATE2)
      </p>
      <div className="flex items-center justify-between gap-2">
        <a
          href={destinationAddressUrl(preview.predictedAddress)}
          target="_blank"
          rel="noreferrer"
          className="truncate font-mono text-sm text-accent-primary underline underline-offset-2"
        >
          {truncateAddress(preview.predictedAddress, 8)}
        </a>
        <CopyButton value={preview.predictedAddress} />
      </div>
      <p className="text-xs text-text-tertiary">
        This address will match on other chains only if the UniversalFactory address and every
        bytecode-forming parameter are identical there.
      </p>
    </Card>
  );
}
