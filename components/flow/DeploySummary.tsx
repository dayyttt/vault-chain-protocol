"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DeployButton } from "@/components/flow/DeployButton";
import { TxStatusStepper } from "@/components/flow/TxStatusStepper";
import { WarningTriangleIcon } from "@/components/ui/icons";
import { DESTINATION_CONTRACTS } from "@/lib/contracts/chainConfig";
import { formatDecimalString } from "@/lib/utils/formatting";
import type { DestinationReadiness } from "@/lib/hooks/useDestinationReadiness";
import type { ExistingClone, FlowState, SourceTokenMetadata } from "@/lib/types/flow.types";

interface DeploySummaryProps {
  metadata: SourceTokenMetadata | null;
  wrapperName: string;
  wrapperSymbol: string;
  wrapperSupply: string;
  liquidityAmount: string;
  slippageBps: number;
  unlockDate: Date | null;
  state: FlowState;
  canDeploy: boolean;
  onDeploy: () => void;
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  onDestinationChain: boolean;
  destination: DestinationReadiness;
  existingClone: ExistingClone | null;
  sourceFee: {
    configured: boolean;
    paid: boolean;
    paying: boolean;
    txHash: string | null;
    needsNetworkSwitch: boolean;
    sourceLabel: string;
    onPay: () => void;
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-text-tertiary">{label}</span>
      <span className="truncate text-right font-medium text-text-primary">{value}</span>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
      <WarningTriangleIcon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function DeploySummary({
  metadata,
  wrapperName,
  wrapperSymbol,
  wrapperSupply,
  liquidityAmount,
  slippageBps,
  unlockDate,
  state,
  canDeploy,
  onDeploy,
  acknowledged,
  onAcknowledgedChange,
  onDestinationChain,
  destination,
  existingClone,
  sourceFee,
}: DeploySummaryProps) {
  return (
    <Card className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Summary</p>

      {metadata ? (
        <div className="space-y-2">
          <Row label="Wrapper" value={wrapperName || "—"} />
          <Row label="Symbol" value={wrapperSymbol || "—"} />
          <Row
            label="Wrapper supply (source)"
            value={wrapperSupply ? formatDecimalString(wrapperSupply) : "—"}
          />
          <Row label="Native liquidity" value={liquidityAmount ? `${liquidityAmount} ETH` : "—"} />
          <Row label="Slippage" value={`${slippageBps / 100}%`} />
          <Row
            label="LP unlock"
            value={
              unlockDate ? `${unlockDate.toISOString().slice(0, 16).replace("T", " ")} UTC` : "—"
            }
          />
          <Row label="Destination network" value={DESTINATION_CONTRACTS.label} />
        </div>
      ) : (
        <p className="text-sm text-text-tertiary">Paste a token address to see a preview.</p>
      )}

      {destination.loading && (
        <p className="text-xs text-text-tertiary">Checking destination network contracts…</p>
      )}

      {destination.error && <Notice>{destination.error}</Notice>}

      {!destination.loading && !destination.error && !destination.ready && (
        <Notice>
          Destination contracts on {DESTINATION_CONTRACTS.label} aren&apos;t ready
          {destination.missing.length > 0 ? `: ${destination.missing.join(", ")}` : ""}. Launching
          stays disabled until the contract team deploys and configures them.
        </Notice>
      )}

      {sourceFee.paid && destination.ready && !onDestinationChain && (
        <Notice>
          Your wallet must be on {DESTINATION_CONTRACTS.label} to launch. Use the switch-network
          button at the top of the page.
        </Notice>
      )}

      {existingClone && (
        <Notice>A clone of this token already exists on the destination network; launching is blocked.</Notice>
      )}

      {metadata && sourceFee.configured && !sourceFee.paid && (
        <div className="space-y-2 rounded-lg border border-border-subtle bg-bg-tertiary p-3">
          <p className="text-xs font-semibold text-text-primary">Step 1 — Pay source-chain fee</p>
          <p className="text-xs text-text-secondary">
            Pay the fixed 0.015 ETH launch fee on {sourceFee.sourceLabel}. Liquidity is not sent here;
            it is supplied only in the destination launch transaction.
          </p>
          <Button
            variant="secondary"
            busy={sourceFee.paying}
            disabled={!destination.ready || sourceFee.paying || !!existingClone}
            onClick={sourceFee.onPay}
            className="w-full"
          >
            {sourceFee.paying
              ? "Paying Sepolia fee…"
              : sourceFee.needsNetworkSwitch
                ? `Switch to ${sourceFee.sourceLabel}`
                : `Pay 0.015 ETH on ${sourceFee.sourceLabel}`}
          </Button>
          {!destination.ready && (
            <p className="text-xs text-text-tertiary">
              Configure the destination first to avoid paying a fee before it is ready.
            </p>
          )}
        </div>
      )}

      {metadata && !sourceFee.configured && (
        <Notice>
          No launch-fee gateway is configured on the source network. Deploy and configure it before
          launching a new wrapper.
        </Notice>
      )}

      {metadata && sourceFee.paid && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success">
          Source-chain launch fee confirmed. Switch to the destination network, then launch with the native
          liquidity shown above.
          {sourceFee.txHash && <span className="mt-1 block font-mono text-[11px]">{sourceFee.txHash}</span>}
        </div>
      )}

      <TxStatusStepper state={state} />

      {metadata && (
        <label className="flex items-start gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-accent-primary"
          />
          I understand this wrapper is not affiliated with or endorsed by the original token team.
        </label>
      )}

      <DeployButton state={state} canDeploy={canDeploy} onDeploy={onDeploy} />
    </Card>
  );
}
