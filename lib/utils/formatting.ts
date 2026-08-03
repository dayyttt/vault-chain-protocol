/** Middle-truncates an address/hash: 0x1234...abcd — standard Web3 display convention. */
export function truncateAddress(value: string, chars = 4): string {
  if (value.length <= chars * 2 + 2) return value;
  return `${value.slice(0, chars + 2)}...${value.slice(-chars)}`;
}

/**
 * Adds thousands separators to a decimal string without ever routing it through a
 * JS `number` — some on-chain token supplies are too large to represent as a float
 * without precision loss or flipping into scientific notation.
 */
/**
 * Truncates a decimal string to `maxDecimals` places without routing it through a
 * JS number — used for balances, which are on-chain values (spec §10).
 */
export function truncateDecimals(value: string, maxDecimals: number): string {
  const [intPart, fracPart] = value.split(".");
  if (!fracPart || maxDecimals <= 0) return intPart;
  const trimmed = fracPart.slice(0, maxDecimals);
  return trimmed ? `${intPart}.${trimmed}` : intPart;
}

export function formatDecimalString(value: string): string {
  const [intPart, fracPart] = value.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fracPart ? `${withCommas}.${fracPart}` : withCommas;
}
