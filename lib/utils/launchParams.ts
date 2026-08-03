import { parseEther, parseUnits } from "viem";
import { minWithSlippage } from "@/lib/utils/validation";

/** Wrapper tokens are always deployed with 18 decimals. */
export const WRAPPER_DECIMALS = 18;
export const DEADLINE_SECONDS = 20 * 60;
export const LOCK_DURATION_OPTIONS = [30, 90, 180, 365] as const;

export interface LaunchParams {
  originTokenId: `0x${string}`;
  name: string;
  symbol: string;
  supply: bigint;
  unlockTime: bigint;
  minTokenLiquidity: bigint;
  minNativeLiquidity: bigint;
  deadline: bigint;
  dexRouter: `0x${string}`;
}

export interface BuildLaunchParamsInput {
  originTokenId: `0x${string}`;
  name: string;
  symbol: string;
  /** Human decimal string, converted with parseUnits(value, 18). */
  supply: string;
  /** Native liquidity in ETH as a decimal string. */
  nativeLiquidity: string;
  slippageBps: number;
  unlockTime: Date;
  dexRouter: `0x${string}`;
  /** Unix seconds; injected so deadline math is deterministic under test. */
  nowSeconds: number;
}

/** Unix seconds, floored — contract takes uint64/uint256 seconds, never millis. */
export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function unlockDateFromDays(days: number, from: Date): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isValidUnlockTime(unlockTime: Date, nowSeconds: number): boolean {
  const unlock = toUnixSeconds(unlockTime);
  return Number.isFinite(unlock) && unlock > nowSeconds;
}

export function isDeadlineValid(deadline: bigint, nowSeconds: number): boolean {
  return deadline > BigInt(nowSeconds);
}

/**
 * Assembles the LaunchParams tuple. All on-chain amounts stay bigint end-to-end —
 * no Number/float anywhere in the conversion path (spec §10).
 */
export function buildLaunchParams(input: BuildLaunchParamsInput): LaunchParams {
  const {
    originTokenId,
    name,
    symbol,
    supply,
    nativeLiquidity,
    slippageBps,
    unlockTime,
    dexRouter,
    nowSeconds,
  } = input;

  if (!isValidUnlockTime(unlockTime, nowSeconds)) {
    throw new Error("LP unlock time must be later than the current time.");
  }

  const supplyWei = parseUnits(supply, WRAPPER_DECIMALS);
  const nativeWei = parseEther(nativeLiquidity);

  if (supplyWei <= 0n) throw new Error("Wrapper total supply must be greater than zero.");
  if (nativeWei <= 0n) throw new Error("Native liquidity must be greater than zero.");

  return {
    originTokenId,
    name,
    symbol,
    supply: supplyWei,
    unlockTime: BigInt(toUnixSeconds(unlockTime)),
    // The contract puts the entire wrapper supply into the pool, so the expected
    // token side equals `supply` — slippage floor is derived from that.
    minTokenLiquidity: minWithSlippage(supplyWei, slippageBps),
    minNativeLiquidity: minWithSlippage(nativeWei, slippageBps),
    deadline: BigInt(nowSeconds + DEADLINE_SECONDS),
    dexRouter,
  };
}
