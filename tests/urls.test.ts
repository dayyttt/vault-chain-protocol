import { describe, it, expect, vi } from "vitest";

const DESTINATION_CHAIN_ID = 84532;

vi.mock("@/lib/contracts/chainConfig", () => ({
  SOURCE_CHAIN_ID: 11155111,
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS: { swapUrl: "" },
}));

const { destinationAddressUrl, destinationTxUrl, sourceAddressUrl, swapUrlFor } = await import(
  "@/lib/utils/explorer"
);

const ADDR = "0x0facfDf2F230967cBef236853a9FD44cDD475657";
const HASH = "0xb9220e4177b65f5d4312bfca1226f16d515c26923601b2fdaa11a8548496f091";

describe("explorer URLs", () => {
  it("points results at the destination explorer, never the source", () => {
    expect(destinationAddressUrl(ADDR)).toBe(
      `https://sepolia.basescan.org/address/${ADDR}`,
    );
    expect(destinationTxUrl(HASH)).toBe(`https://sepolia.basescan.org/tx/${HASH}`);
  });

  it("builds source links from the source chain's own explorer", () => {
    expect(sourceAddressUrl(11155111, ADDR)).toBe(`https://sepolia.etherscan.io/address/${ADDR}`);
    expect(sourceAddressUrl(8453, ADDR)).toBe(`https://basescan.org/address/${ADDR}`);
  });

  it("returns null for a chain that isn't a configured source", () => {
    expect(sourceAddressUrl(999999, ADDR)).toBeNull();
  });
});

describe("swap URL", () => {
  it("is null when the destination swap URL isn't configured, so Open Swap stays hidden", () => {
    expect(swapUrlFor(ADDR)).toBeNull();
  });

  it("appends the token and chain once the swap URL is configured", async () => {
    vi.resetModules();
    vi.doMock("@/lib/contracts/chainConfig", () => ({
      SOURCE_CHAIN_ID: 11155111,
      DESTINATION_CHAIN_ID,
      DESTINATION_CONTRACTS: { swapUrl: "https://app.uniswap.org/swap" },
    }));
    const { swapUrlFor: withUrl } = await import("@/lib/utils/explorer");
    expect(withUrl(ADDR)).toBe(
      `https://app.uniswap.org/swap?outputCurrency=${ADDR}&chain=${DESTINATION_CHAIN_ID}`,
    );
  });
});
