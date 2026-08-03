"use client";

import { useEffect, useState } from "react";
import { universalFactoryAbi } from "@/lib/contracts/universalFactory";
import {
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS,
  getPublicClient,
} from "@/lib/contracts/chainConfig";
import type { LaunchParams } from "@/lib/utils/launchParams";
import type { ExistingClone } from "@/lib/types/flow.types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const IDLE: ClonePreview = {
  loading: false,
  predictedAddress: null,
  existing: null,
  error: null,
};

export interface ClonePreview {
  loading: boolean;
  predictedAddress: `0x${string}` | null;
  existing: ExistingClone | null;
  error: string | null;
}

/**
 * Calls predictTokenAddress + clonedTokens + TokenRegistry.get on the DESTINATION
 * chain whenever the params change. An existing clone blocks launch (spec §7).
 */
export function useClonePreview(params: LaunchParams | null): ClonePreview {
  const [state, setState] = useState<ClonePreview>(IDLE);

  const factory = DESTINATION_CONTRACTS.universalFactory;
  const enabled = !!params && !!factory;

  // Serialized so the effect keys off values, not object identity.
  const key =
    enabled && params
      ? [
          params.originTokenId,
          params.name,
          params.symbol,
          params.supply.toString(),
          params.unlockTime.toString(),
          params.dexRouter,
        ].join("|")
      : null;

  useEffect(() => {
    if (!key || !params) return;
    let cancelled = false;

    (async () => {
      const client = getPublicClient(DESTINATION_CHAIN_ID);
      if (!client) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const [predicted, cloned] = await Promise.all([
          client.readContract({
            address: factory,
            abi: universalFactoryAbi,
            functionName: "predictTokenAddress",
            args: [params],
          }) as Promise<`0x${string}`>,
          client.readContract({
            address: factory,
            abi: universalFactoryAbi,
            functionName: "clonedTokens",
            args: [params.originTokenId],
          }) as Promise<`0x${string}`>,
        ]);
        if (cancelled) return;

        const existingToken = cloned !== ZERO_ADDRESS ? cloned : null;

        setState({
          loading: false,
          predictedAddress: predicted,
          existing: existingToken
            ? {
                token: existingToken,
                creator: ZERO_ADDRESS,
                lpTimelock: ZERO_ADDRESS,
                createdAt: 0,
              }
            : null,
          error: null,
        });
      } catch {
        if (cancelled) return;
        setState({
          loading: false,
          predictedAddress: null,
          existing: null,
          error: "Couldn't read preview data from the destination network.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, factory]);

  return enabled ? state : IDLE;
}
