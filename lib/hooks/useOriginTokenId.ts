"use client";

import { useReadContract } from "wagmi";
import { originIdHelperAbi } from "@/lib/contracts/originIdHelper";
import {
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS,
  SOURCE_CONTRACTS,
} from "@/lib/contracts/chainConfig";
import { isValidAddress } from "@/lib/utils/validation";

/**
 * Derives originTokenId via OriginIdHelper.fromEvm(sourceChainId, sourceToken).
 * The FIRST arg is the SOURCE chain id — never the destination (spec §11).
 * The helper is `pure`, so it can be read from whichever chain has it deployed;
 * destination is preferred, with source as fallback while destination is unset.
 */
export function useOriginTokenId(sourceChainId: number, tokenAddress: string) {
  const addr = tokenAddress.trim();
  const destinationReady = !!DESTINATION_CONTRACTS.originIdHelper;
  const helper = destinationReady
    ? DESTINATION_CONTRACTS.originIdHelper
    : SOURCE_CONTRACTS.originIdHelper;
  const readChainId = destinationReady ? DESTINATION_CHAIN_ID : SOURCE_CONTRACTS.chainId;

  return useReadContract({
    address: helper || undefined,
    abi: originIdHelperAbi,
    functionName: "fromEvm",
    args: [BigInt(sourceChainId), addr as `0x${string}`],
    chainId: readChainId,
    query: {
      enabled: isValidAddress(addr) && !!helper,
      // Chain id is part of the key so source data can never be reused across chains.
      gcTime: 0,
    },
  });
}
