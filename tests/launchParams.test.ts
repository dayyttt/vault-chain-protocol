import { describe, it, expect } from "vitest";
import { parseEther, parseUnits } from "viem";
import {
  buildLaunchParams,
  isDeadlineValid,
  isValidUnlockTime,
  toUnixSeconds,
  unlockDateFromDays,
  DEADLINE_SECONDS,
  WRAPPER_DECIMALS,
} from "@/lib/utils/launchParams";

const ORIGIN_ID = `0x${"ab".repeat(32)}` as `0x${string}`;
const ROUTER = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" as `0x${string}`;
const NOW = 1_800_000_000;

function base(overrides: Partial<Parameters<typeof buildLaunchParams>[0]> = {}) {
  return buildLaunchParams({
    originTokenId: ORIGIN_ID,
    name: "Wrapped Vault",
    symbol: "wVAULT",
    supply: "1000000",
    nativeLiquidity: "0.05",
    slippageBps: 100,
    unlockTime: unlockDateFromDays(30, new Date(NOW * 1000)),
    dexRouter: ROUTER,
    nowSeconds: NOW,
    ...overrides,
  });
}

describe("parsing amount/supply", () => {
  it("converts supply with 18 decimals, not the source token's decimals", () => {
    expect(base().supply).toBe(parseUnits("1000000", WRAPPER_DECIMALS));
  });

  it("keeps precision on supplies too large for a JS number", () => {
    const huge = "100000000000000000000000000000000000";
    expect(base({ supply: huge }).supply).toBe(parseUnits(huge, WRAPPER_DECIMALS));
  });

  it("parses fractional native liquidity as wei", () => {
    // minNativeLiquidity is the post-slippage floor of 0.05 ETH.
    expect(base().minNativeLiquidity).toBe((parseEther("0.05") * 9900n) / 10_000n);
  });

  it("rejects zero supply and zero liquidity", () => {
    expect(() => base({ supply: "0" })).toThrow();
    expect(() => base({ nativeLiquidity: "0" })).toThrow();
  });
});

describe("slippage calculation (bigint)", () => {
  it("applies bps to both sides without floating point", () => {
    const p = base({ slippageBps: 250 });
    expect(p.minTokenLiquidity).toBe((parseUnits("1000000", 18) * 9750n) / 10_000n);
    expect(p.minNativeLiquidity).toBe((parseEther("0.05") * 9750n) / 10_000n);
  });

  it("0 bps leaves the amounts untouched", () => {
    const p = base({ slippageBps: 0 });
    expect(p.minTokenLiquidity).toBe(parseUnits("1000000", 18));
    expect(p.minNativeLiquidity).toBe(parseEther("0.05"));
  });

  it("rejects out-of-range slippage", () => {
    expect(() => base({ slippageBps: -1 })).toThrow();
    expect(() => base({ slippageBps: 10_001 })).toThrow();
  });
});

describe("unlock time and deadline validation", () => {
  it("accepts a future unlock and rejects past/now", () => {
    expect(isValidUnlockTime(new Date((NOW + 60) * 1000), NOW)).toBe(true);
    expect(isValidUnlockTime(new Date(NOW * 1000), NOW)).toBe(false);
    expect(isValidUnlockTime(new Date((NOW - 60) * 1000), NOW)).toBe(false);
  });

  it("refuses to build params with an unlock time in the past", () => {
    expect(() => base({ unlockTime: new Date((NOW - 1) * 1000) })).toThrow();
  });

  it("sets deadline 20 minutes ahead and detects expiry", () => {
    const p = base();
    expect(p.deadline).toBe(BigInt(NOW + DEADLINE_SECONDS));
    expect(isDeadlineValid(p.deadline, NOW)).toBe(true);
    expect(isDeadlineValid(p.deadline, NOW + DEADLINE_SECONDS + 1)).toBe(false);
  });

  it("converts lock duration options to the right unlock timestamps", () => {
    for (const days of [30, 90, 180, 365]) {
      const unlock = unlockDateFromDays(days, new Date(NOW * 1000));
      expect(toUnixSeconds(unlock)).toBe(NOW + days * 86_400);
    }
  });
});

describe("LaunchParams assembly", () => {
  it("carries every field the contract tuple expects", () => {
    const p = base();
    expect(p).toEqual({
      originTokenId: ORIGIN_ID,
      name: "Wrapped Vault",
      symbol: "wVAULT",
      supply: parseUnits("1000000", 18),
      unlockTime: BigInt(NOW + 30 * 86_400),
      minTokenLiquidity: (parseUnits("1000000", 18) * 9900n) / 10_000n,
      minNativeLiquidity: (parseEther("0.05") * 9900n) / 10_000n,
      deadline: BigInt(NOW + DEADLINE_SECONDS),
      dexRouter: ROUTER,
    });
  });

  it("keeps every on-chain amount a bigint", () => {
    const p = base();
    for (const key of [
      "supply",
      "unlockTime",
      "minTokenLiquidity",
      "minNativeLiquidity",
      "deadline",
    ] as const) {
      expect(typeof p[key]).toBe("bigint");
    }
  });
});
