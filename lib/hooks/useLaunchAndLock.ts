"use client";

import { useCallback } from "react";
import { useWriteContract, useAccount, useChainId } from "wagmi";
import { decodeEventLog, type Hash } from "viem";
import { universalFactoryAbi } from "@/lib/contracts/universalFactory";
import {
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS,
  getPublicClient,
  hasBytecode,
} from "@/lib/contracts/chainConfig";
import { destinationTxUrl } from "@/lib/utils/explorer";
import { isDeadlineValid, type LaunchParams } from "@/lib/utils/launchParams";
import type { DeployResult } from "@/lib/types/flow.types";

interface TokenClonedAndLockedArgs {
  originTokenId: `0x${string}`;
  clonedToken: `0x${string}`;
  creator: `0x${string}`;
  lpTimelock: `0x${string}`;
  lpLiquidity: bigint;
  dexRouter: `0x${string}`;
}

/** Maps a raw revert/RPC error onto something a user can act on (spec §7). */
export function describeLaunchError(e: unknown): string {
  const raw = e instanceof Error ? `${e.message}` : String(e);
  const msg = raw.toLowerCase();
  if (msg.includes("user rejected") || msg.includes("user denied") || msg.includes("rejected the request")) {
    return "The transaction was rejected in your wallet. You can try again.";
  }
  if (msg.includes("insufficient funds")) {
    return "Not enough native balance to cover the liquidity plus gas.";
  }
  if (msg.includes("deadline")) {
    return "The transaction deadline has passed. Retry to get a fresh deadline.";
  }
  if (msg.includes("already") || msg.includes("exists")) {
    return "A clone of this token already exists on the destination network.";
  }
  if (msg.includes("insufficient_a_amount") || msg.includes("insufficient_b_amount")) {
    return "Slippage is too tight for current pool conditions. Raise the tolerance.";
  }
  if (msg.includes("fetch") || msg.includes("timeout") || msg.includes("network")) {
    return "Couldn't reach the destination network RPC. Check your connection and try again.";
  }
  return raw;
}

export interface PerformLaunchDeps {
  walletChainId: number;
  address?: `0x${string}`;
  writeContractAsync: (request: unknown) => Promise<Hash>;
  nowSeconds: number;
}

export interface PerformLaunchInput {
  params: LaunchParams;
  sourceChainId: number;
  sourceTokenAddress: string;
  onSignatureRequested?: () => void;
  onHash?: (hash: Hash) => void;
}

/**
 * The full guarded launch sequence. Kept free of React so every guard is directly
 * testable; the hook below only supplies wallet state.
 */
export async function performLaunch(
  deps: PerformLaunchDeps,
  { params, sourceChainId, sourceTokenAddress, onSignatureRequested, onHash }: PerformLaunchInput,
): Promise<DeployResult> {
  // §8: assert wallet is on the destination chain before any write.
  if (deps.walletChainId !== DESTINATION_CHAIN_ID) {
    throw new Error(`Switch to ${DESTINATION_CONTRACTS.label} before launching.`);
  }
  if (!deps.address) throw new Error("Wallet isn't connected.");

  const client = getPublicClient(DESTINATION_CHAIN_ID);
  if (!client) throw new Error("No destination network RPC available.");

  const factory = DESTINATION_CONTRACTS.universalFactory;
  if (!factory) {
    throw new Error("UniversalFactory isn't configured for the destination network.");
  }

  // §7 pre-flight: factory + router must actually exist on the destination chain.
  const [factoryOk, routerOk] = await Promise.all([
    hasBytecode(DESTINATION_CHAIN_ID, factory),
    hasBytecode(DESTINATION_CHAIN_ID, params.dexRouter),
  ]);
  if (!factoryOk) throw new Error("UniversalFactory has no bytecode on the destination network.");
  if (!routerOk) throw new Error("The DEX router has no bytecode on the destination network.");

  if (!isDeadlineValid(params.deadline, deps.nowSeconds)) {
    throw new Error("The transaction deadline has passed. Please retry.");
  }
  if (params.unlockTime <= BigInt(deps.nowSeconds)) {
    throw new Error("LP unlock time must be in the future.");
  }

  const nativeValue = params.minNativeLiquidity;
  const balance = await client.getBalance({ address: deps.address });
  if (balance <= nativeValue) {
    throw new Error("Not enough native balance to cover the liquidity plus gas.");
  }

  // §7: simulate on the destination chain before requesting a signature.
  const { request } = await client.simulateContract({
    account: deps.address,
    address: factory,
    abi: universalFactoryAbi,
    functionName: "launchAndLock",
    args: [params],
    value: nativeValue,
  });

  onSignatureRequested?.();
  const hash = await deps.writeContractAsync(request);
  onHash?.(hash);

  // §10: a hash alone is not success — wait for a confirmed receipt.
  const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1 });
  if (receipt.status !== "success") {
    throw new Error("The transaction reverted on the destination network.");
  }

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: universalFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "TokenClonedAndLocked") continue;
      const args = decoded.args as unknown as TokenClonedAndLockedArgs;
      return {
        clonedTokenAddress: args.clonedToken,
        lpTimelockAddress: args.lpTimelock,
        lpLiquidity: args.lpLiquidity.toString(),
        dexRouter: args.dexRouter,
        originTokenId: args.originTokenId,
        unlockTime: Number(params.unlockTime),
        sourceChainId,
        sourceTokenAddress,
        txHash: hash,
        explorerUrl: destinationTxUrl(hash),
      };
    } catch {
      // Not our event — keep scanning.
    }
  }

  throw new Error(
    "The transaction confirmed, but no TokenClonedAndLocked event was found in the logs.",
  );
}

export function useLaunchAndLock() {
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const walletChainId = useChainId();

  const launchAndLock = useCallback(
    (
      params: LaunchParams,
      sourceChainId: number,
      sourceTokenAddress: string,
      onSignatureRequested?: () => void,
      onHash?: (hash: Hash) => void,
    ): Promise<DeployResult> =>
      performLaunch(
        {
          walletChainId,
          address,
          writeContractAsync: (request) =>
            writeContractAsync(request as Parameters<typeof writeContractAsync>[0]),
          nowSeconds: Math.floor(Date.now() / 1000),
        },
        { params, sourceChainId, sourceTokenAddress, onSignatureRequested, onHash },
      ),
    [writeContractAsync, address, walletChainId],
  );

  return { launchAndLock };
}
