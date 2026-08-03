import { describe, it, expect, vi, beforeEach } from "vitest";

const TOKEN = "0x6FD1A72aeb336E64bC20734112D3CF81eDe58c24" as `0x${string}`;

const state = {
  readContract: vi.fn(),
  getBytecode: vi.fn(),
  clientAvailable: true,
};

vi.mock("@/lib/contracts/sourceChains", () => ({
  getSourceChain: (chainId: number) => (chainId === 11155111 ? { name: "Ethereum Sepolia" } : undefined),
  getSourcePublicClient: () =>
    state.clientAvailable
      ? { readContract: state.readContract, getBytecode: state.getBytecode }
      : undefined,
}));

const { fetchSourceTokenMetadata, SourceRpcError } = await import("@/lib/api/sourceToken");
const { DESTINATION_RPC_ERROR } = await import("@/lib/hooks/useDestinationReadiness");

beforeEach(() => {
  state.clientAvailable = true;
  state.readContract.mockReset();
  state.getBytecode.mockReset().mockResolvedValue("0x1234");
});

function reads(values: Record<string, unknown>) {
  state.readContract.mockImplementation(({ functionName }: { functionName: string }) => {
    const value = values[functionName];
    if (value instanceof Error) return Promise.reject(value);
    return Promise.resolve(value);
  });
}

describe("source token metadata", () => {
  it("explains when the address belongs to another chain instead of reporting an RPC outage", async () => {
    state.getBytecode.mockResolvedValue("0x");
    await expect(fetchSourceTokenMetadata(11155111, TOKEN)).rejects.toThrow(/no contract bytecode/i);
    expect(state.readContract).not.toHaveBeenCalled();
  });

  it("reads name/symbol/decimals/totalSupply from the source chain", async () => {
    reads({ name: "Vault Protocol", symbol: "vault", decimals: 18, totalSupply: 1_000_000n * 10n ** 18n });
    const md = await fetchSourceTokenMetadata(11155111, TOKEN);
    expect(md).toMatchObject({
      chainId: 11155111,
      address: TOKEN,
      name: "Vault Protocol",
      symbol: "VAULT",
      decimals: 18,
      totalSupply: "1000000",
    });
  });

  it("keeps huge supplies exact, never as scientific notation", async () => {
    const raw = 10n ** 56n;
    reads({ name: "Big", symbol: "BIG", decimals: 18, totalSupply: raw });
    const md = await fetchSourceTokenMetadata(11155111, TOKEN);
    expect(md.totalSupply).not.toMatch(/e\+/i);
    expect(md.totalSupplyRaw).toBe(raw.toString());
  });

  it("keeps unreadable optional metadata empty while retaining required values", async () => {
    reads({ name: new Error("reverted"), symbol: new Error("reverted"), decimals: 6, totalSupply: 500n * 10n ** 6n });
    const md = await fetchSourceTokenMetadata(11155111, TOKEN);
    expect(md.name).toBeNull();
    expect(md.symbol).toBeNull();
    expect(md.decimals).toBe(6);
    expect(md.totalSupply).toBe("500");
  });

  it("rejects when decimals/totalSupply can't be read at all", async () => {
    reads({ name: "Token", symbol: "TOK", decimals: new Error("reverted"), totalSupply: new Error("reverted") });
    await expect(fetchSourceTokenMetadata(11155111, TOKEN)).rejects.toThrow(/ERC-20/);
  });
});

describe("source vs destination RPC errors are distinguishable", () => {
  it("labels a source RPC failure as the origin network", async () => {
    reads({ name: new Error("fetch failed"), symbol: new Error("fetch failed"), decimals: new Error("fetch failed"), totalSupply: new Error("fetch failed") });
    await expect(fetchSourceTokenMetadata(11155111, TOKEN)).rejects.toBeInstanceOf(SourceRpcError);
    await expect(fetchSourceTokenMetadata(11155111, TOKEN)).rejects.toThrow(/source network/i);
  });

  it("never silently falls back when the source chain is unsupported", async () => {
    state.clientAvailable = false;
    await expect(fetchSourceTokenMetadata(999_999, TOKEN)).rejects.toThrow(/isn't supported/i);
    expect(state.readContract).not.toHaveBeenCalled();
  });

  it("uses different copy for the destination RPC failure", async () => {
    reads({ name: new Error("fetch failed"), symbol: new Error("fetch failed"), decimals: new Error("fetch failed"), totalSupply: new Error("fetch failed") });
    const sourceMessage = await fetchSourceTokenMetadata(11155111, TOKEN).catch(
      (e: Error) => e.message,
    );
    // Guards against the two RPC error paths collapsing into one generic message.
    expect(sourceMessage).not.toBe(DESTINATION_RPC_ERROR);
    expect(sourceMessage).toMatch(/source/i);
    expect(DESTINATION_RPC_ERROR).toMatch(/destination/i);
  });
});

describe("malformed config is not reported as an RPC failure", () => {
  it("treats a non-address value as missing bytecode, not a network outage", async () => {
    const { hasBytecode } = await import("@/lib/contracts/chainConfig");
    // A 32-hex API-key-looking value pasted into an address slot. Passing this to the
    // RPC makes it reject the params, which previously surfaced as "can't reach RPC".
    await expect(
      hasBytecode(11155420, "a044b120c4894176a062e78d49da5e13" as `0x${string}`),
    ).resolves.toBe(false);
    await expect(hasBytecode(11155420, "" as `0x${string}`)).resolves.toBe(false);
    await expect(hasBytecode(11155420, "0x" as `0x${string}`)).resolves.toBe(false);
  });
});
