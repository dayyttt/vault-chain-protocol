"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import {
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS,
  hasBytecode,
} from "@/lib/contracts/chainConfig";

/** Kept distinct from SourceRpcError's copy so the two RPC failures never look alike. */
export const DESTINATION_RPC_ERROR =
  "Couldn't reach the destination network RPC.";

export interface DestinationReadiness {
  loading: boolean;
  ready: boolean;
  /** Human-readable names of destination contracts missing an address or bytecode. */
  missing: string[];
  error: string | null;
}

const REQUIRED = [
  { key: "universalFactory", label: "UniversalFactory" },
  { key: "originIdHelper", label: "OriginIdHelper" },
  { key: "dexRouter", label: "DEX Router" },
] as const;

/**
 * Config problems knowable without any RPC call: an address that is absent, or present
 * but not a valid 20-byte address. Both are configuration faults, NOT RPC faults —
 * passing a malformed value to the RPC makes it reject the params, which would
 * otherwise surface as a misleading "can't reach the network" error.
 */
const UNSET = REQUIRED.filter(({ key }) => {
  const value = (DESTINATION_CONTRACTS[key] as string | undefined)?.trim();
  return !value || !isAddress(value);
}).map(({ label }) => label);

/**
 * Verifies every required destination contract is configured AND has bytecode.
 * The frontend must refuse launch when any of these is missing (spec §5/§8) —
 * a readable source token is not sufficient to enable the launch button.
 */
export function useDestinationReadiness(): DestinationReadiness {
  const [state, setState] = useState<DestinationReadiness>({
    loading: true,
    ready: false,
    missing: [],
    error: null,
  });

  useEffect(() => {
    if (UNSET.length > 0) return;
    let cancelled = false;

    (async () => {
      try {
        const checks = await Promise.all(
          REQUIRED.map(async ({ key, label }) => ({
            label,
            ok: await hasBytecode(
              DESTINATION_CHAIN_ID,
              DESTINATION_CONTRACTS[key] as `0x${string}`,
            ),
          })),
        );
        if (cancelled) return;
        const missing = checks.filter((c) => !c.ok).map((c) => c.label);
        setState({ loading: false, ready: missing.length === 0, missing, error: null });
      } catch {
        if (cancelled) return;
        // Destination RPC failure is its own error — never fall back to source (spec §8).
        setState({
          loading: false,
          ready: false,
          missing: [],
          error: DESTINATION_RPC_ERROR,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (UNSET.length > 0) {
    return { loading: false, ready: false, missing: UNSET, error: null };
  }
  return state;
}
