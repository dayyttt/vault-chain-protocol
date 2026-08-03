import { describe, it, expect, vi, beforeEach } from "vitest";
import { encodeEventTopics, encodeAbiParameters, parseEther } from "viem";
import { universalFactoryAbi } from "@/lib/contracts/universalFactory";

const SOURCE_CHAIN_ID = 11155111;
const DESTINATION_CHAIN_ID = 84532;
const FACTORY = "0x4C8B63FF7D8698dC0e5f20bd528202D116b93808" as `0x${string}`;
const ROUTER = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" as `0x${string}`;
const WALLET = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const CLONE = "0x0facfDf2F230967cBef236853a9FD44cDD475657" as `0x${string}`;
const TIMELOCK = "0x78De656aE1B20708E376Cf582f8ae7B63a5125De" as `0x${string}`;
const SOURCE_TOKEN = "0x6FD1A72aeb336E64bC20734112D3CF81eDe58c24" as `0x${string}`;
const ORIGIN_ID = `0x${"ab".repeat(32)}` as `0x${string}`;
const HASH = "0xb9220e4177b65f5d4312bfca1226f16d515c26923601b2fdaa11a8548496f091";

const state = {
  receipt: {} as Record<string, unknown>,
  writeContractAsync: vi.fn(),
};

vi.mock("@/lib/contracts/chainConfig", () => ({
  SOURCE_CHAIN_ID,
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS: { universalFactory: FACTORY, label: "Base Sepolia", swapUrl: "" },
  hasBytecode: async () => true,
  getPublicClient: () => ({
    getBalance: async () => parseEther("1"),
    simulateContract: async () => ({ request: {} }),
    waitForTransactionReceipt: async () => state.receipt,
  }),
}));

const { performLaunch } = await import("@/lib/hooks/useLaunchAndLock");

/** A genuine ABI-encoded TokenClonedAndLocked log, not a hand-written stub. */
function successLog(lpLiquidity: bigint) {
  return {
    topics: encodeEventTopics({
      abi: universalFactoryAbi,
      eventName: "TokenClonedAndLocked",
      args: { originTokenId: ORIGIN_ID, clonedToken: CLONE },
    }),
    data: encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "address" }],
      [WALLET, TIMELOCK, lpLiquidity, ROUTER],
    ),
  };
}

const NOW = () => Math.floor(Date.now() / 1000);

function params() {
  return {
    originTokenId: ORIGIN_ID,
    name: "Wrapped Vault",
    symbol: "wVAULT",
    supply: 1_000_000n,
    unlockTime: BigInt(NOW() + 30 * 86_400),
    minTokenLiquidity: 990_000n,
    minNativeLiquidity: parseEther("0.05"),
    deadline: BigInt(NOW() + 1200),
    dexRouter: ROUTER,
  };
}

function run(onSig?: () => void, onHash?: (h: `0x${string}`) => void) {
  return performLaunch(
    {
      walletChainId: DESTINATION_CHAIN_ID,
      address: WALLET,
      writeContractAsync: state.writeContractAsync,
      nowSeconds: NOW(),
    },
    {
      params: params(),
      sourceChainId: SOURCE_CHAIN_ID,
      sourceTokenAddress: SOURCE_TOKEN,
      onSignatureRequested: onSig,
      onHash,
    },
  );
}

beforeEach(() => {
  state.writeContractAsync.mockReset().mockResolvedValue(HASH);
  state.receipt = { status: "success", logs: [successLog(123_456n)] };
});

describe("successful launch", () => {
  it("decodes the event into the full result set the UI displays", async () => {
    const result = await run();
    expect(result).toMatchObject({
      clonedTokenAddress: CLONE,
      lpTimelockAddress: TIMELOCK,
      lpLiquidity: "123456",
      dexRouter: ROUTER,
      originTokenId: ORIGIN_ID,
      sourceChainId: SOURCE_CHAIN_ID,
      sourceTokenAddress: SOURCE_TOKEN,
      txHash: HASH,
    });
    expect(result.unlockTime).toBeGreaterThan(NOW());
  });

  it("points the result explorer link at the destination chain", async () => {
    const { explorerUrl } = await run();
    expect(explorerUrl).toBe(`https://sepolia.basescan.org/tx/${HASH}`);
    expect(explorerUrl).not.toContain("sepolia.etherscan.io");
  });

  it("fires the signature and hash callbacks in order", async () => {
    const seen: string[] = [];
    await run(
      () => seen.push("signature"),
      () => seen.push("hash"),
    );
    expect(seen).toEqual(["signature", "hash"]);
  });

  it("ignores unrelated logs and still finds the event", async () => {
    state.receipt = {
      status: "success",
      logs: [
        { topics: [`0x${"11".repeat(32)}`], data: "0x" },
        successLog(999n),
      ],
    };
    await expect(run()).resolves.toMatchObject({ lpLiquidity: "999" });
  });
});
