// Core types for the VAULT clone-&-bridge flow (spec §5-§11).

/** Transaction lifecycle shown to the user (spec §7). */
export type FlowState =
  | "IDLE"
  | "WALLET_CONNECTING"
  | "FORM_READY"
  | "FETCHING_METADATA"
  | "READY_TO_DEPLOY"
  | "PREPARING"
  | "AWAITING_SIGNATURE"
  | "TX_PENDING"
  | "SUCCESS"
  | "ERROR_REJECTED";

/** ERC-20 metadata read from the SOURCE chain. name/symbol may be null (unreadable). */
export interface SourceTokenMetadata {
  chainId: number;
  address: `0x${string}`;
  name: string | null;
  symbol: string | null;
  decimals: number;
  /** Base-unit supply as a decimal string — never a JS number (spec §10). */
  totalSupplyRaw: string;
  /** Human-readable supply as an exact decimal string. */
  totalSupply: string;
}

/** Existing clone found on the destination registry — blocks a new launch (spec §7). */
export interface ExistingClone {
  token: `0x${string}`;
  creator: `0x${string}`;
  lpTimelock: `0x${string}`;
  createdAt: number;
}

/** Decoded from the TokenClonedAndLocked event after a confirmed receipt. */
export interface DeployResult {
  clonedTokenAddress: string;
  lpTimelockAddress: string;
  lpLiquidity: string;
  dexRouter: string;
  originTokenId: string;
  unlockTime: number;
  sourceChainId: number;
  sourceTokenAddress: string;
  txHash: string;
  explorerUrl: string;
}

export interface FlowData {
  state: FlowState;
  /** Chain the ORIGINAL token lives on — an identifier only, never switches the wallet. */
  sourceChainId: number;
  tokenAddress: string;
  metadata: SourceTokenMetadata | null;
  /** Native liquidity in ETH as a decimal string. */
  liquidityAmount: string;
  /** Slippage tolerance in basis points (100 = 1%). */
  slippageBps: number;
  /** LP lock duration in days, or null when a custom unlock date is used. */
  lockDurationDays: number | null;
  /** Custom unlock datetime as a UTC ISO string, used when lockDurationDays is null. */
  customUnlockIso: string;
  deployResult: DeployResult | null;
  error: string | null;
}

export type FlowAction =
  | { type: "WALLET_CONNECT_START" }
  | { type: "WALLET_CONNECTED" }
  | { type: "SET_SOURCE_CHAIN"; chainId: number }
  | { type: "SET_TOKEN_ADDRESS"; address: string }
  | { type: "FETCH_METADATA_START" }
  | { type: "FETCH_METADATA_SUCCESS"; metadata: SourceTokenMetadata }
  | { type: "FETCH_METADATA_ERROR"; error: string }
  | { type: "SET_LIQUIDITY"; amount: string }
  | { type: "SET_SLIPPAGE"; bps: number }
  | { type: "SET_LOCK_DURATION"; days: number }
  | { type: "SET_CUSTOM_UNLOCK"; iso: string }
  | { type: "DEPLOY_START" }
  | { type: "SIGNATURE_REQUESTED" }
  | { type: "SIGNATURE_CONFIRMED" }
  | { type: "DEPLOY_SUCCESS"; result: DeployResult }
  | { type: "DEPLOY_REJECTED"; error: string }
  | { type: "RETRY" }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" };
