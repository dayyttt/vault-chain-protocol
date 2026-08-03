"use client";

import { Button } from "@/components/ui/Button";
import type { FlowState } from "@/lib/types/flow.types";

interface DeployButtonProps {
  state: FlowState;
  canDeploy: boolean;
  onDeploy: () => void;
}

const LABELS: Partial<Record<FlowState, string>> = {
  PREPARING: "Preparing…",
  AWAITING_SIGNATURE: "Waiting for wallet confirmation…",
  TX_PENDING: "Transaction pending…",
};

export function DeployButton({ state, canDeploy, onDeploy }: DeployButtonProps) {
  const busy =
    state === "PREPARING" || state === "AWAITING_SIGNATURE" || state === "TX_PENDING";

  return (
    <Button
      variant="primary"
      busy={busy}
      shine={canDeploy}
      disabled={!canDeploy}
      onClick={onDeploy}
      className="w-full"
    >
      {LABELS[state] ?? "Launch & Lock LP"}
    </Button>
  );
}
