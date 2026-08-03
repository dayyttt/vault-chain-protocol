import { describe, it, expect } from "vitest";
import { evaluateLaunchGate, type LaunchGateInput } from "@/lib/utils/launchGate";
import type { ExistingClone } from "@/lib/types/flow.types";

const CLONE: ExistingClone = {
  token: "0x0facfDf2F230967cBef236853a9FD44cDD475657",
  creator: "0x1111111111111111111111111111111111111111",
  lpTimelock: "0x78De656aE1B20708E376Cf582f8ae7B63a5125De",
  createdAt: 1_800_000_000,
};

function gate(overrides: Partial<LaunchGateInput> = {}) {
  return evaluateLaunchGate({
    state: "READY_TO_DEPLOY",
    walletConnected: true,
    onDestinationChain: true,
    destinationReady: true,
    hasLaunchParams: true,
    existingClone: null,
    previewLoading: false,
    acknowledged: true,
    ...overrides,
  });
}

describe("launch gating", () => {
  it("allows launch only when every condition holds", () => {
    expect(gate()).toEqual({ canLaunch: true, reason: null });
  });

  it("blocks an existing destination clone even though the source has none", () => {
    // The source chain is irrelevant here — the registry lives on the destination.
    const r = gate({ existingClone: CLONE });
    expect(r.canLaunch).toBe(false);
    expect(r.reason).toBe("clone-exists");
  });

  it("blocks while the wallet is on the wrong network", () => {
    expect(gate({ onDestinationChain: false })).toMatchObject({
      canLaunch: false,
      reason: "wrong-network",
    });
  });

  it("blocks when destination contracts aren't deployed/configured", () => {
    expect(gate({ destinationReady: false })).toMatchObject({
      canLaunch: false,
      reason: "destination-not-ready",
    });
  });

  it("does not enable launch merely because source metadata was readable", () => {
    // Metadata read succeeded (state READY_TO_DEPLOY) but destination is unusable.
    const r = gate({ destinationReady: false, onDestinationChain: false });
    expect(r.canLaunch).toBe(false);
  });

  it("blocks on incomplete params, disconnect, pending preview and missing acknowledgement", () => {
    expect(gate({ hasLaunchParams: false }).reason).toBe("incomplete-params");
    expect(gate({ walletConnected: false }).reason).toBe("wallet-disconnected");
    expect(gate({ previewLoading: true }).reason).toBe("preview-loading");
    expect(gate({ acknowledged: false }).reason).toBe("not-acknowledged");
  });

  it("blocks in every non-ready flow state", () => {
    for (const state of [
      "IDLE",
      "WALLET_CONNECTING",
      "FORM_READY",
      "FETCHING_METADATA",
      "PREPARING",
      "AWAITING_SIGNATURE",
      "TX_PENDING",
      "SUCCESS",
      "ERROR_REJECTED",
    ] as const) {
      expect(gate({ state }).canLaunch).toBe(false);
    }
  });
});
