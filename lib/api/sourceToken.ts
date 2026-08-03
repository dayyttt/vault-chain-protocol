import { formatUnits } from "viem";
import { erc20Abi } from "@/lib/contracts/erc20";
import { getSourceChain, getSourcePublicClient } from "@/lib/contracts/sourceChains";
import type { SourceTokenMetadata } from "@/lib/types/flow.types";

export class SourceRpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceRpcError";
  }
}

/**
 * Reads ERC-20 metadata from the SOURCE chain (spec §8 — always the source public
 * client, never the wallet's chain). Calls are deliberately individual rather than
 * multicall: a public Sepolia RPC may support normal eth_call but not Multicall3.
 * `name`/`symbol` may fail independently; decimals/totalSupply may not.
 */
export async function fetchSourceTokenMetadata(
  chainId: number,
  address: `0x${string}`,
): Promise<SourceTokenMetadata> {
  const client = getSourcePublicClient(chainId);
  if (!client) {
    throw new SourceRpcError("That source network isn't supported.");
  }

  // Distinguish a wrong-chain address from an actual RPC outage. Calling ERC-20
  // functions on an EOA/nonexistent address returns empty data, which otherwise
  // looks deceptively like a network failure.
  let code: `0x${string}` | undefined;
  try {
    code = await client.getBytecode({ address });
  } catch {
    throw new SourceRpcError(
      "Couldn't reach the source network RPC. Check your connection and try again.",
    );
  }
  if (!code || code === "0x") {
    const label = getSourceChain(chainId)?.name ?? `chain ${chainId}`;
    throw new SourceRpcError(
      `This address has no contract bytecode on ${label}. Select the network where the token was deployed.`,
    );
  }

  const contract = { address, abi: erc20Abi } as const;
  const [nameRes, symbolRes, decimalsRes, supplyRes] = await Promise.allSettled([
    client.readContract({ ...contract, functionName: "name" }),
    client.readContract({ ...contract, functionName: "symbol" }),
    client.readContract({ ...contract, functionName: "decimals" }),
    client.readContract({ ...contract, functionName: "totalSupply" }),
  ]);

  if (decimalsRes.status !== "fulfilled" || supplyRes.status !== "fulfilled") {
    if ([nameRes, symbolRes, decimalsRes, supplyRes].every((result) => result.status === "rejected")) {
      throw new SourceRpcError(
        "Couldn't reach the source network RPC. Check your connection and try again.",
      );
    }
    throw new SourceRpcError(
      "This address doesn't read as an ERC-20 contract on the source network. Double-check it.",
    );
  }

  const decimals = decimalsRes.value as number;
  const rawSupply = supplyRes.value as bigint;

  return {
    chainId,
    address,
    name: nameRes.status === "fulfilled" ? (nameRes.value as string) : null,
    symbol: symbolRes.status === "fulfilled" ? (symbolRes.value as string).toUpperCase() : null,
    decimals,
    totalSupplyRaw: rawSupply.toString(),
    totalSupply: formatUnits(rawSupply, decimals),
  };
}
