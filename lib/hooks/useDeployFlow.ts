"use client";

import { useCallback, useReducer } from "react";
import type { Hash } from "viem";
import type {
  DeployResult,
  FlowAction,
  FlowData,
  SourceTokenMetadata,
} from "@/lib/types/flow.types";
import { fetchSourceTokenMetadata } from "@/lib/api/sourceToken";
import { SOURCE_CHAIN_ID } from "@/lib/contracts/chainConfig";
import { describeLaunchError } from "@/lib/hooks/useLaunchAndLock";

const DEFAULT_SLIPPAGE_BPS = 100; // 1% (spec §7)
const DEFAULT_LOCK_DAYS = 30;

const initialState: FlowData = {
  state: "IDLE",
  sourceChainId: SOURCE_CHAIN_ID,
  tokenAddress: "",
  metadata: null,
  liquidityAmount: "",
  slippageBps: DEFAULT_SLIPPAGE_BPS,
  lockDurationDays: DEFAULT_LOCK_DAYS,
  customUnlockIso: "",
  deployResult: null,
  error: null,
};

/** Clears everything derived from a specific source token (spec §8). */
function clearDerived(s: FlowData): FlowData {
  return {
    ...s,
    metadata: null,
    error: null,
  };
}

function reducer(s: FlowData, a: FlowAction): FlowData {
  switch (a.type) {
    case "WALLET_CONNECT_START":
      return { ...s, state: "WALLET_CONNECTING", error: null };
    case "WALLET_CONNECTED":
      return { ...s, state: "FORM_READY" };
    case "SET_SOURCE_CHAIN":
      // Changing source invalidates metadata, prediction and simulation.
      return {
        ...clearDerived(s),
        sourceChainId: a.chainId,
        state: s.state === "IDLE" ? "IDLE" : "FORM_READY",
      };
    case "SET_TOKEN_ADDRESS":
      return {
        ...clearDerived(s),
        tokenAddress: a.address,
        state: s.state === "IDLE" ? "IDLE" : "FORM_READY",
      };
    case "FETCH_METADATA_START":
      return { ...s, state: "FETCHING_METADATA", error: null };
    case "FETCH_METADATA_SUCCESS":
      return {
        ...s,
        state: "READY_TO_DEPLOY",
        metadata: a.metadata,
      };
    case "FETCH_METADATA_ERROR":
      return { ...s, state: "FORM_READY", metadata: null, error: a.error };
    case "SET_LIQUIDITY":
      return { ...s, liquidityAmount: a.amount };
    case "SET_SLIPPAGE":
      return { ...s, slippageBps: a.bps };
    case "SET_LOCK_DURATION":
      return { ...s, lockDurationDays: a.days, customUnlockIso: "" };
    case "SET_CUSTOM_UNLOCK":
      return { ...s, lockDurationDays: null, customUnlockIso: a.iso };
    case "DEPLOY_START":
      return { ...s, state: "PREPARING", error: null };
    case "SIGNATURE_REQUESTED":
      return { ...s, state: "AWAITING_SIGNATURE" };
    case "SIGNATURE_CONFIRMED":
      return { ...s, state: "TX_PENDING" };
    case "DEPLOY_SUCCESS":
      return { ...s, state: "SUCCESS", deployResult: a.result };
    case "DEPLOY_REJECTED":
      return { ...s, state: "ERROR_REJECTED", error: a.error };
    case "RETRY":
      return { ...s, state: "READY_TO_DEPLOY", error: null };
    case "CLEAR_ERROR":
      return { ...s, error: null };
    case "RESET":
      return initialState;
    default:
      return s;
  }
}

export function useDeployFlow() {
  const [data, dispatch] = useReducer(reducer, initialState);

  const onWalletConnecting = useCallback(
    () => dispatch({ type: "WALLET_CONNECT_START" }),
    [],
  );
  const onWalletConnected = useCallback(() => dispatch({ type: "WALLET_CONNECTED" }), []);
  const setSourceChain = useCallback(
    (chainId: number) => dispatch({ type: "SET_SOURCE_CHAIN", chainId }),
    [],
  );
  const setTokenAddress = useCallback(
    (address: string) => dispatch({ type: "SET_TOKEN_ADDRESS", address }),
    [],
  );
  const setLiquidity = useCallback(
    (amount: string) => dispatch({ type: "SET_LIQUIDITY", amount }),
    [],
  );
  const setSlippage = useCallback((bps: number) => dispatch({ type: "SET_SLIPPAGE", bps }), []);
  const setLockDuration = useCallback(
    (days: number) => dispatch({ type: "SET_LOCK_DURATION", days }),
    [],
  );
  const setCustomUnlock = useCallback(
    (iso: string) => dispatch({ type: "SET_CUSTOM_UNLOCK", iso }),
    [],
  );

  const fetchMetadata = useCallback(
    async (chainId: number, address: `0x${string}`) => {
      dispatch({ type: "FETCH_METADATA_START" });
      try {
        const metadata: SourceTokenMetadata = await fetchSourceTokenMetadata(chainId, address);
        dispatch({ type: "FETCH_METADATA_SUCCESS", metadata });
      } catch (e) {
        dispatch({
          type: "FETCH_METADATA_ERROR",
          error:
            e instanceof Error
              ? e.message
              : "Couldn't read token data from the source network.",
        });
      }
    },
    [],
  );

  const deploy = useCallback(
    async (
      submit: (
        onSignatureRequested: () => void,
        onHash: (hash: Hash) => void,
      ) => Promise<DeployResult>,
    ) => {
      dispatch({ type: "DEPLOY_START" });
      try {
        const result = await submit(
          () => dispatch({ type: "SIGNATURE_REQUESTED" }),
          () => dispatch({ type: "SIGNATURE_CONFIRMED" }),
        );
        dispatch({ type: "DEPLOY_SUCCESS", result });
      } catch (e) {
        dispatch({ type: "DEPLOY_REJECTED", error: describeLaunchError(e) });
      }
    },
    [],
  );

  const retry = useCallback(() => dispatch({ type: "RETRY" }), []);
  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    data,
    onWalletConnecting,
    onWalletConnected,
    setSourceChain,
    setTokenAddress,
    setLiquidity,
    setSlippage,
    setLockDuration,
    setCustomUnlock,
    fetchMetadata,
    deploy,
    retry,
    clearError,
    reset,
  };
}
