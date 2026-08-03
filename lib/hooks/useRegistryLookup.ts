"use client";

import { useCallback, useState } from "react";
import type { Hex } from "viem";
import { tokenRegistryAbi } from "@/lib/contracts/tokenRegistry";
import { originIdHelperAbi } from "@/lib/contracts/originIdHelper";
import {
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS,
  SOURCE_CONTRACTS,
  getPublicClient,
} from "@/lib/contracts/chainConfig";
import type { ExistingClone } from "@/lib/types/flow.types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface RegistryLookupState {
  loading: boolean;
  result: (ExistingClone & { originTokenId: Hex }) | null;
  notFound: boolean;
  error: string | null;
}

const IDLE: RegistryLookupState = {
  loading: false,
  result: null,
  notFound: false,
  error: null,
};

/** Resolves originTokenId via the on-chain helper — never hashed in the frontend (spec §8). */
async function resolveOriginTokenId(
  sourceChainId: number,
  sourceToken: `0x${string}`,
): Promise<Hex> {
  const helperAddress = DESTINATION_CONTRACTS.originIdHelper || SOURCE_CONTRACTS.originIdHelper;
  const helperChainId = DESTINATION_CONTRACTS.originIdHelper
    ? DESTINATION_CHAIN_ID
    : SOURCE_CONTRACTS.chainId;
  const client = getPublicClient(helperChainId);
  if (!client || !helperAddress) {
    throw new Error("OriginIdHelper isn't configured.");
  }
  return (await client.readContract({
    address: helperAddress,
    abi: originIdHelperAbi,
    functionName: "fromEvm",
    args: [BigInt(sourceChainId), sourceToken],
  })) as Hex;
}

export function useRegistryLookup() {
  const [state, setState] = useState<RegistryLookupState>(IDLE);

  const reset = useCallback(() => setState(IDLE), []);

  const lookup = useCallback(
    async (input: { originTokenId?: Hex; sourceChainId?: number; sourceToken?: `0x${string}` }) => {
      const registry = DESTINATION_CONTRACTS.tokenRegistry;
      if (!registry) {
        setState({
          loading: false,
          result: null,
          notFound: false,
          error: "TokenRegistry isn't configured for the destination network.",
        });
        return;
      }

      setState({ loading: true, result: null, notFound: false, error: null });
      try {
        const originTokenId =
          input.originTokenId ??
          (await resolveOriginTokenId(input.sourceChainId!, input.sourceToken!));

        const client = getPublicClient(DESTINATION_CHAIN_ID);
        if (!client) throw new Error("No destination network RPC available.");

        const record = (await client.readContract({
          address: registry,
          abi: tokenRegistryAbi,
          functionName: "get",
          args: [originTokenId],
        })) as {
          token: `0x${string}`;
          creator: `0x${string}`;
          lpTimelock: `0x${string}`;
          createdAt: bigint;
        };

        if (record.token === ZERO_ADDRESS) {
          setState({ loading: false, result: null, notFound: true, error: null });
          return;
        }

        setState({
          loading: false,
          notFound: false,
          error: null,
          result: {
            originTokenId,
            token: record.token,
            creator: record.creator,
            lpTimelock: record.lpTimelock,
            createdAt: Number(record.createdAt),
          },
        });
      } catch (e) {
        setState({
          loading: false,
          result: null,
          notFound: false,
          error:
            e instanceof Error
              ? e.message
              : "Couldn't read the registry on the destination network.",
        });
      }
    },
    [],
  );

  return { ...state, lookup, reset };
}
