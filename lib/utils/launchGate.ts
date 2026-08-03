import type { ExistingClone, FlowState } from "@/lib/types/flow.types";

export interface LaunchGateInput {
  state: FlowState;
  walletConnected: boolean;
  /** Wallet is on the DESTINATION chain — readable source metadata is not enough. */
  onDestinationChain: boolean;
  /** Every destination contract configured AND carrying bytecode. */
  destinationReady: boolean;
  /** LaunchParams assembled successfully (valid supply/liquidity/unlock/router). */
  hasLaunchParams: boolean;
  /** A clone already registered on the destination chain blocks a new launch. */
  existingClone: ExistingClone | null;
  previewLoading: boolean;
  acknowledged: boolean;
  /** Explicitly false until the source-chain launch fee has confirmed. */
  feePaid?: boolean;
}

export type LaunchBlockReason =
  | "not-ready"
  | "wallet-disconnected"
  | "wrong-network"
  | "destination-not-ready"
  | "incomplete-params"
  | "clone-exists"
  | "preview-loading"
  | "fee-not-paid"
  | "not-acknowledged";

/**
 * Single source of truth for whether launch may proceed (spec §7/§8).
 * Order matters only for which reason surfaces first; any single failure blocks.
 */
export function evaluateLaunchGate(i: LaunchGateInput): {
  canLaunch: boolean;
  reason: LaunchBlockReason | null;
} {
  const block = (reason: LaunchBlockReason) => ({ canLaunch: false, reason });

  if (i.state !== "READY_TO_DEPLOY") return block("not-ready");
  if (!i.walletConnected) return block("wallet-disconnected");
  if (i.feePaid === false) return block("fee-not-paid");
  if (!i.onDestinationChain) return block("wrong-network");
  if (!i.destinationReady) return block("destination-not-ready");
  if (!i.hasLaunchParams) return block("incomplete-params");
  // Checked independently of the source chain: a clone may exist on the destination
  // even when nothing exists on the source.
  if (i.existingClone != null) return block("clone-exists");
  if (i.previewLoading) return block("preview-loading");
  if (!i.acknowledged) return block("not-acknowledged");

  return { canLaunch: true, reason: null };
}
