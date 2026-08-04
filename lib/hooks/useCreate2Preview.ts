"use client";

/**
 * Pure offchain CREATE2 address preview.
 *
 * Predicts the cloned token address using only the LaunchParams and the
 * factory address — no RPC call, no wallet connection required.
 *
 * The address is computed by:
 *   1. salt = keccak256(abi.encodePacked(originalToken))
 *   2. initcode = ClonedToken.creationCode ++ abi.encode(name, symbol, supply, originTokenId)
 *   3. address = last20bytes(keccak256(0xff ++ factory ++ salt ++ keccak256(initcode)))
 *
 * Because no caller-specific or chain-specific values enter the formula, the
 * result is identical on every EVM chain where the factory has the same address.
 */

import { useMemo } from "react";
import { isAddress } from "viem";
import { predictTokenAddress } from "@/lib/utils/create2Predict";
import { DESTINATION_CONTRACTS } from "@/lib/contracts/chainConfig";
import { CLONED_TOKEN_CREATION_CODE } from "@/lib/contracts/clonedTokenCreationCode";
import type { LaunchParams } from "@/lib/utils/launchParams";

export interface Create2PreviewResult {
  /** Predicted address, or null if inputs are incomplete/invalid. */
  predictedAddress: `0x${string}` | null;
  /** Error message if prediction failed. */
  error: string | null;
}

/**
 * Hook: returns the deterministic CREATE2 address for the given LaunchParams.
 *
 * Computation is synchronous and runs in useMemo — no loading state needed.
 * The value updates instantly whenever params change, so the dashboard can
 * display the final "0x..." address before the user hits Confirm.
 */
export function useCreate2Preview(params: LaunchParams | null): Create2PreviewResult {
  return useMemo<Create2PreviewResult>(() => {
    if (!params) return { predictedAddress: null, error: null };

    const factory = DESTINATION_CONTRACTS.universalFactory;
    if (!factory || !isAddress(factory)) {
      return {
        predictedAddress: null,
        error: "UniversalFactory address is not configured for the destination chain.",
      };
    }

    if (!isAddress(params.originalToken)) {
      return { predictedAddress: null, error: "Invalid originalToken address." };
    }

    if (!params.originTokenId || params.originTokenId === "0x" + "0".repeat(64)) {
      return { predictedAddress: null, error: "Invalid originTokenId." };
    }

    if (!params.name || !params.symbol) {
      return { predictedAddress: null, error: "Token name and symbol are required." };
    }

    if (params.supply <= 0n) {
      return { predictedAddress: null, error: "Supply must be greater than zero." };
    }

    try {
      const address = predictTokenAddress({
        factoryAddress:         factory,
        clonedTokenCreationCode: CLONED_TOKEN_CREATION_CODE,
        originalToken:          params.originalToken,
        name:                   params.name,
        symbol:                 params.symbol,
        supply:                 params.supply,
        originTokenId:          params.originTokenId,
      });
      return { predictedAddress: address, error: null };
    } catch (e) {
      return {
        predictedAddress: null,
        error: e instanceof Error ? e.message : "Failed to compute predicted address.",
      };
    }
  }, [
    params?.originalToken,
    params?.originTokenId,
    params?.name,
    params?.symbol,
    params?.supply,
    // factory is read from env — stable across renders
  ]);
}
