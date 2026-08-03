import { describe, it, expect, vi, beforeEach } from "vitest";

const SOURCE_CHAIN_ID = 11155111;
const DESTINATION_CHAIN_ID = 84532;
const TOKEN = "0x6FD1A72aeb336E64bC20734112D3CF81eDe58c24" as `0x${string}`;

const readContract = vi.fn();

vi.mock("wagmi", () => ({
  useReadContract: (args: unknown) => ({ __args: args }),
}));

vi.mock("@/lib/contracts/chainConfig", () => ({
  SOURCE_CHAIN_ID,
  DESTINATION_CHAIN_ID,
  SOURCE_CONTRACTS: {
    chainId: SOURCE_CHAIN_ID,
    originIdHelper: "0x6D29c48E7fC6D76c255C5d7a612EdAA36A62ee85",
  },
  DESTINATION_CONTRACTS: {
    chainId: DESTINATION_CHAIN_ID,
    // Empty = not yet deployed on destination, mirroring current .env.local.
    originIdHelper: "",
  },
  getPublicClient: () => ({ readContract }),
}));

const { useOriginTokenId } = await import("@/lib/hooks/useOriginTokenId");

describe("originTokenId derivation", () => {
  beforeEach(() => readContract.mockReset());

  it("passes the SOURCE chain id as the first fromEvm argument, not the destination", () => {
    const call = useOriginTokenId(SOURCE_CHAIN_ID, TOKEN) as unknown as {
      __args: { args: [bigint, string]; functionName: string };
    };
    expect(call.__args.functionName).toBe("fromEvm");
    expect(call.__args.args[0]).toBe(BigInt(SOURCE_CHAIN_ID));
    expect(call.__args.args[0]).not.toBe(BigInt(DESTINATION_CHAIN_ID));
    expect(call.__args.args[1]).toBe(TOKEN);
  });

  it("carries a non-Sepolia source chain id through unchanged", () => {
    const call = useOriginTokenId(8453, TOKEN) as unknown as {
      __args: { args: [bigint, string] };
    };
    expect(call.__args.args[0]).toBe(8453n);
  });

  it("stays disabled for an invalid address", () => {
    const call = useOriginTokenId(SOURCE_CHAIN_ID, "not-an-address") as unknown as {
      __args: { query: { enabled: boolean } };
    };
    expect(call.__args.query.enabled).toBe(false);
  });
});
