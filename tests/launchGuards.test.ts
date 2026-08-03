import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseEther } from "viem";

const SOURCE_CHAIN_ID = 11155111;
const DESTINATION_CHAIN_ID = 84532;
const FACTORY = "0x4C8B63FF7D8698dC0e5f20bd528202D116b93808" as `0x${string}`;
const ROUTER = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" as `0x${string}`;
const WALLET = "0x1111111111111111111111111111111111111111" as `0x${string}`;

const state = {
  walletChainId: DESTINATION_CHAIN_ID,
  bytecode: new Map<string, boolean>(),
  balance: parseEther("1"),
  simulateContract: vi.fn(),
  writeContractAsync: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
};

vi.mock("@/lib/contracts/chainConfig", () => ({
  SOURCE_CHAIN_ID,
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS: { universalFactory: FACTORY, label: "Base Sepolia" },
  hasBytecode: async (_chainId: number, address: string) => state.bytecode.get(address) ?? false,
  getPublicClient: () => ({
    getBalance: async () => state.balance,
    simulateContract: state.simulateContract,
    waitForTransactionReceipt: state.waitForTransactionReceipt,
  }),
}));

const { performLaunch, describeLaunchError } = await import("@/lib/hooks/useLaunchAndLock");

const NOW = () => Math.floor(Date.now() / 1000);

function paramsFor() {
  return {
    originTokenId: `0x${"ab".repeat(32)}` as `0x${string}`,
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

function launch() {
  return (
    params: ReturnType<typeof paramsFor>,
    sourceChainId: number,
    sourceTokenAddress: string,
    onSignatureRequested?: () => void,
  ) =>
    performLaunch(
      {
        walletChainId: state.walletChainId,
        address: WALLET,
        writeContractAsync: state.writeContractAsync,
        nowSeconds: NOW(),
      },
      { params, sourceChainId, sourceTokenAddress, onSignatureRequested },
    );
}

beforeEach(() => {
  state.walletChainId = DESTINATION_CHAIN_ID;
  state.bytecode = new Map([
    [FACTORY, true],
    [ROUTER, true],
  ]);
  state.balance = parseEther("1");
  state.simulateContract.mockReset().mockResolvedValue({ request: {} });
  state.writeContractAsync.mockReset().mockResolvedValue("0xhash");
  state.waitForTransactionReceipt.mockReset().mockResolvedValue({ status: "success", logs: [] });
});

describe("destination-chain enforcement", () => {
  it("refuses to launch while the wallet is still on the source chain", async () => {
    state.walletChainId = SOURCE_CHAIN_ID;
    await expect(launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(
      /Base Sepolia/,
    );
    expect(state.simulateContract).not.toHaveBeenCalled();
  });

  it("refuses on an unrelated chain too", async () => {
    state.walletChainId = 1;
    await expect(launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET)).rejects.toThrow();
    expect(state.writeContractAsync).not.toHaveBeenCalled();
  });
});

describe("bytecode pre-flight", () => {
  it("blocks launch when the destination factory has no bytecode", async () => {
    state.bytecode.set(FACTORY, false);
    await expect(launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(/bytecode/i);
    expect(state.simulateContract).not.toHaveBeenCalled();
  });

  it("blocks launch when the router has no bytecode", async () => {
    state.bytecode.set(ROUTER, false);
    await expect(launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(/router/i);
  });
});

describe("balance and deadline pre-flight", () => {
  it("blocks when the balance can't cover liquidity plus gas", async () => {
    state.balance = parseEther("0.05");
    await expect(launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(/balance/i);
  });

  it("blocks an already-expired deadline", async () => {
    const expired = { ...paramsFor(), deadline: BigInt(NOW() - 1) };
    await expect(launch()(expired, SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(/deadline/i);
  });

  it("blocks an unlock time in the past", async () => {
    const past = { ...paramsFor(), unlockTime: BigInt(NOW() - 1) };
    await expect(launch()(past, SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(/unlock/i);
  });
});

describe("simulation and receipt handling", () => {
  it("simulates before requesting a signature", async () => {
    const order: string[] = [];
    state.simulateContract.mockImplementation(async () => {
      order.push("simulate");
      return { request: {} };
    });
    const onSig = () => order.push("signature");
    await launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET, onSig).catch(() => {});
    expect(order[0]).toBe("simulate");
    expect(order[1]).toBe("signature");
  });

  it("surfaces a simulation revert without asking for a signature", async () => {
    state.simulateContract.mockRejectedValue(new Error("execution reverted: TOKEN_EXISTS"));
    await expect(launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(/reverted/);
    expect(state.writeContractAsync).not.toHaveBeenCalled();
  });

  it("treats a reverted receipt as failure even though a hash exists", async () => {
    state.waitForTransactionReceipt.mockResolvedValue({ status: "reverted", logs: [] });
    await expect(launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(/revert/i);
  });

  it("fails loudly when the success event is missing from the logs", async () => {
    await expect(launch()(paramsFor(), SOURCE_CHAIN_ID, WALLET)).rejects.toThrow(
      /TokenClonedAndLocked/,
    );
  });
});

describe("error message mapping", () => {
  it("distinguishes user rejection from other failures", () => {
    expect(describeLaunchError(new Error("User rejected the request"))).toMatch(/rejected/i);
  });

  it("explains insufficient funds", () => {
    expect(describeLaunchError(new Error("insufficient funds for gas"))).toMatch(/balance/i);
  });

  it("explains an RPC failure differently from a revert", () => {
    const rpc = describeLaunchError(new Error("fetch failed"));
    const revert = describeLaunchError(new Error("execution reverted: X"));
    expect(rpc).toMatch(/RPC/);
    expect(rpc).not.toBe(revert);
  });

  it("explains a too-tight slippage revert", () => {
    expect(describeLaunchError(new Error("INSUFFICIENT_A_AMOUNT"))).toMatch(/slippage/i);
  });
});
