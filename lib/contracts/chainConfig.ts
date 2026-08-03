import { sepolia, baseSepolia, optimismSepolia } from "wagmi/chains";
import { createPublicClient, http, isAddress, type Chain, type PublicClient } from "viem";
import UniversalFactoryAbi from "./abi/UniversalFactory.json";

/**
 * Fixed source/destination for the cross-chain clone flow (spec §5-11).
 * - Source: Sepolia (11155111) — READ-ONLY. Origin token metadata + originTokenId.
 * - Destination: Base Sepolia (84532) — deploy / liquidity / LP-timelock.
 *
 * Base Sepolia is the destination because it is the only testnet besides Sepolia with a
 * working Uniswap V2-compatible router, which `launchAndLock` needs for addLiquidityETH.
 * Do NOT use any mainnet. Do NOT collapse these into one `chainId`.
 */
export const SOURCE_CHAIN_ID = sepolia.id; // 11155111
const destinationKey =
  process.env.NEXT_PUBLIC_TEST_DESTINATION === "optimismSepolia"
    ? "optimismSepolia"
    : "baseSepolia";

export const DESTINATION_CHAIN_ID =
  destinationKey === "optimismSepolia" ? optimismSepolia.id : baseSepolia.id;

export const UNIVERSAL_FACTORY_ABI = UniversalFactoryAbi;

/** Contracts + endpoints for a single chain. Empty address = not yet deployed. */
export interface ChainContracts {
  chainId: number;
  label: string;
  universalFactory: `0x${string}`;
  originIdHelper: `0x${string}`;
  tokenRegistry: `0x${string}`;
  dexRouter: `0x${string}`;
  swapUrl: string;
  /** LaunchFeeGateway is Sepolia-only and currently unwired. */
  launchFeeGateway?: `0x${string}`;
  rpcUrl?: string;
}

const env = (v: string | undefined) => (v ?? "") as `0x${string}`;

/**
 * CREATE2 makes the cloned token address identical across chains ONLY where
 * UniversalFactory is deployed. Destination (Base Sepolia) addresses may be
 * empty until the team deploys — the bytecode guard below enforces that at launch.
 */
export const SOURCE_CONTRACTS: ChainContracts = {
  chainId: SOURCE_CHAIN_ID,
  label: "Ethereum Sepolia",
  universalFactory: env(process.env.NEXT_PUBLIC_SEPOLIA_UNIVERSAL_FACTORY),
  originIdHelper: env(process.env.NEXT_PUBLIC_SEPOLIA_ORIGIN_ID_HELPER),
  tokenRegistry: env(process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_REGISTRY),
  dexRouter: env(process.env.NEXT_PUBLIC_SEPOLIA_DEX_ROUTER),
  swapUrl: process.env.NEXT_PUBLIC_SEPOLIA_DEX_SWAP_URL ?? "",
  launchFeeGateway: env(process.env.NEXT_PUBLIC_SEPOLIA_LAUNCH_FEE_GATEWAY),
  rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
};

/** Fee gateways live on the source chain: every new wrapper begins by paying here. */
export function getLaunchFeeGateway(chainId: number): `0x${string}` {
  if (chainId === sepolia.id) return (SOURCE_CONTRACTS.launchFeeGateway ?? "") as `0x${string}`;
  if (chainId === baseSepolia.id) return env(process.env.NEXT_PUBLIC_BASE_SEPOLIA_LAUNCH_FEE_GATEWAY);
  if (chainId === optimismSepolia.id) {
    return env(process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_LAUNCH_FEE_GATEWAY);
  }
  return "" as `0x${string}`;
}

export const DESTINATION_CONTRACTS: ChainContracts = {
  chainId: DESTINATION_CHAIN_ID,
  label: destinationKey === "optimismSepolia" ? "Optimism Sepolia" : "Base Sepolia",
  universalFactory: env(
    destinationKey === "optimismSepolia"
      ? process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_UNIVERSAL_FACTORY
      : process.env.NEXT_PUBLIC_BASE_SEPOLIA_UNIVERSAL_FACTORY,
  ),
  originIdHelper: env(
    destinationKey === "optimismSepolia"
      ? process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_ORIGIN_ID_HELPER
      : process.env.NEXT_PUBLIC_BASE_SEPOLIA_ORIGIN_ID_HELPER,
  ),
  tokenRegistry: env(
    destinationKey === "optimismSepolia"
      ? process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_TOKEN_REGISTRY
      : process.env.NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_REGISTRY,
  ),
  dexRouter: env(
    destinationKey === "optimismSepolia"
      ? process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_DEX_ROUTER
      : process.env.NEXT_PUBLIC_BASE_SEPOLIA_DEX_ROUTER,
  ),
  swapUrl:
    destinationKey === "optimismSepolia"
      ? process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_DEX_SWAP_URL ?? ""
      : process.env.NEXT_PUBLIC_BASE_SEPOLIA_DEX_SWAP_URL ?? "",
  rpcUrl:
    destinationKey === "optimismSepolia"
      ? process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL
      : process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
};

const CHAIN_CONTRACTS: Record<number, ChainContracts> = {
  [SOURCE_CHAIN_ID]: SOURCE_CONTRACTS,
  [DESTINATION_CHAIN_ID]: DESTINATION_CONTRACTS,
};

export function getChainContracts(chainId: number): ChainContracts | undefined {
  return CHAIN_CONTRACTS[chainId];
}

export function isChainSupported(chainId: number): boolean {
  return chainId in CHAIN_CONTRACTS;
}

const CHAIN_BY_ID: Record<number, Chain> = {
  [SOURCE_CHAIN_ID]: sepolia,
  [DESTINATION_CHAIN_ID]:
    destinationKey === "optimismSepolia" ? optimismSepolia : baseSepolia,
};

/** Read-only client for a supported chain, using env RPC when provided. */
export function getPublicClient(chainId: number): PublicClient | undefined {
  const chain = CHAIN_BY_ID[chainId];
  const cfg = CHAIN_CONTRACTS[chainId];
  if (!chain) return undefined;
  return createPublicClient({
    chain,
    transport: http(cfg?.rpcUrl),
  }) as PublicClient;
}

/**
 * True only if `address` has deployed bytecode on `chainId`.
 * Frontend MUST refuse launch if the destination factory/router has no bytecode.
 */
export async function hasBytecode(
  chainId: number,
  address: `0x${string}`,
): Promise<boolean> {
  // A malformed address makes the RPC reject the params, which reads like a network
  // outage. Treat it as "no bytecode" so it surfaces as the config fault it is.
  if (!address || !isAddress(address)) return false;
  const client = getPublicClient(chainId);
  if (!client) return false;
  const code = await client.getBytecode({ address });
  return !!code && code !== "0x";
}
