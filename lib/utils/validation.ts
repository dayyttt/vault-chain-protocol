import { isAddress } from "viem";

export function isValidAddress(address: string): boolean {
  return isAddress(address.trim());
}

/**
 * Plain decimal string check — no exponent notation, since parseUnits rejects it and
 * large on-chain supplies stringify to scientific notation if they touch a JS number.
 */
export function isValidDecimalString(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (!/^\d*\.?\d*$/.test(v)) return false;
  return /\d/.test(v);
}

// Slippage as basis points (100 bps = 1%). Reject NaN/negative/>100%.
export function isValidSlippageBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= 10_000;
}

// Min-out floor given expected amount and slippage bps.
export function minWithSlippage(expected: bigint, bps: number): bigint {
  if (!isValidSlippageBps(bps)) throw new Error("Invalid slippage bps.");
  return (expected * BigInt(10_000 - bps)) / 10_000n;
}
