/**
 * Pure offchain CREATE2 address prediction.
 *
 * Implements the canonical formula:
 *   address = last20bytes(keccak256(0xff ++ deployer ++ salt ++ keccak256(initcode)))
 *
 * This is 100% deterministic: no RPC call required, no wallet needed.
 * The predicted address is identical on every EVM chain where UniversalFactory
 * has the same address and the compiler produces the same ClonedToken bytecode.
 *
 * Prerequisites for cross-chain parity:
 *   1. UniversalFactory deployed via Nick-Factory proxy with VAULT_UNIVERSAL_FACTORY_V1 salt.
 *   2. Solidity compiler: metadata.bytecodeHash = "none", viaIR = false, optimizer runs = 200.
 *   3. ClonedToken constructor args: (name, symbol, supply, originTokenId) — no address args.
 */

import {
  encodeAbiParameters,
  keccak256,
  concat,
  getAddress,
  type Hex,
} from "viem";

// ---------------------------------------------------------------------------
// Salt derivation
// ---------------------------------------------------------------------------

/**
 * Computes the CREATE2 salt for a given source token.
 * Mirrors UniversalFactory.saltFor():
 *   keccak256(abi.encodePacked(originalToken))
 */
export function computeSalt(originalToken: `0x${string}`): Hex {
  // abi.encodePacked(address) = 20 bytes, no padding
  const packed = originalToken.toLowerCase() as Hex;
  return keccak256(packed);
}

// ---------------------------------------------------------------------------
// Initcode hash (with constructor args)
// ---------------------------------------------------------------------------

/**
 * Computes keccak256(ClonedToken.creationCode ++ abi.encode(name, symbol, supply, originTokenId)).
 *
 * @param creationCodeHex  Hex string of ClonedToken.creationCode (from artifact).
 * @param name             Token name (LaunchParams.name).
 * @param symbol           Token symbol (LaunchParams.symbol).
 * @param supply           Total supply in wei (LaunchParams.supply).
 * @param originTokenId    Cross-chain origin identifier (LaunchParams.originTokenId).
 */
export function computeInitCodeHash(
  creationCodeHex: Hex,
  name: string,
  symbol: string,
  supply: bigint,
  originTokenId: `0x${string}`,
): Hex {
  const encodedArgs = encodeAbiParameters(
    [
      { name: "name_",         type: "string"  },
      { name: "symbol_",       type: "string"  },
      { name: "supply",        type: "uint256" },
      { name: "originTokenId_",type: "bytes32" },
    ],
    [name, symbol, supply, originTokenId as `0x${string}`],
  );

  const initCode = concat([creationCodeHex, encodedArgs]);
  return keccak256(initCode);
}

// ---------------------------------------------------------------------------
// CREATE2 address derivation
// ---------------------------------------------------------------------------

/**
 * Pure CREATE2 address prediction.
 *
 * Formula: keccak256(0xff ++ deployer ++ salt ++ initCodeHash)
 *
 * @param factoryAddress  UniversalFactory address (same on all chains).
 * @param salt            Output of computeSalt().
 * @param initCodeHash    Output of computeInitCodeHash().
 * @returns               Checksummed EIP-55 address.
 */
export function predictCreate2Address(
  factoryAddress: `0x${string}`,
  salt: Hex,
  initCodeHash: Hex,
): `0x${string}` {
  const payload = concat([
    "0xff",
    factoryAddress,
    salt,
    initCodeHash,
  ]);
  const hash = keccak256(payload);
  // Take the last 20 bytes (bytes 12..31) of the 32-byte hash.
  return getAddress(`0x${hash.slice(26)}`);
}

// ---------------------------------------------------------------------------
// Convenience: predict from LaunchParams
// ---------------------------------------------------------------------------

export interface PredictAddressInput {
  /** UniversalFactory address on the target chain. */
  factoryAddress: `0x${string}`;
  /** Hex-encoded ClonedToken.creationCode from the Hardhat artifact. */
  clonedTokenCreationCode: Hex;
  /** Source token address on its origin chain. */
  originalToken: `0x${string}`;
  /** LaunchParams fields that are part of the initcode. */
  name: string;
  symbol: string;
  supply: bigint;
  originTokenId: `0x${string}`;
}

/**
 * One-call helper used by the dashboard to display the predicted CA before
 * the user confirms the transaction.
 *
 * Returns the same address regardless of which chain the user is on — it is
 * a pure function of the factory address and the launch parameters.
 */
export function predictTokenAddress(input: PredictAddressInput): `0x${string}` {
  const salt = computeSalt(input.originalToken);
  const initCodeHash = computeInitCodeHash(
    input.clonedTokenCreationCode,
    input.name,
    input.symbol,
    input.supply,
    input.originTokenId,
  );
  return predictCreate2Address(input.factoryAddress, salt, initCodeHash);
}
